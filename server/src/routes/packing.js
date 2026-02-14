import { Router } from 'express';
import { getDb } from '../db.js';

export const packingRouter = Router();
const db = () => getDb();

// GET /packing/lists — all packing lists with completion (General + custom lists; vehicle is optional attribute)
packingRouter.get('/lists', (req, res) => {
  try {
    const lists = [];
    const d = db();
    const vehicles = d.prepare('SELECT id, name FROM vehicles ORDER BY name').all();

    // General list: no packing_list_id and no campsite_id
    const generalItems = d.prepare('SELECT id, done FROM packing WHERE (packing_list_id IS NULL OR packing_list_id = 0) AND (campsite_id IS NULL OR campsite_id = 0)').all();
    const generalTotal = generalItems.length;
    const generalDone = generalItems.filter((r) => r.done === 1).length;
    lists.push({
      id: 'general',
      name: 'General',
      vehicle_id: null,
      vehicle_name: null,
      total: generalTotal,
      done: generalDone,
      complete: generalTotal === 0 || generalDone === generalTotal,
    });

    // Custom lists (each can have optional vehicle_id = where items are going)
    const customLists = d.prepare('SELECT id, name, vehicle_id FROM packing_lists ORDER BY name').all();
    for (const cl of customLists) {
      const items = d.prepare('SELECT done FROM packing WHERE packing_list_id = ?').all(cl.id);
      const total = items.length;
      const done = items.filter((r) => r.done === 1).length;
      const vehicle = cl.vehicle_id != null ? vehicles.find((ve) => ve.id === cl.vehicle_id) : null;
      lists.push({
        id: cl.id,
        name: cl.name,
        vehicle_id: cl.vehicle_id ?? null,
        vehicle_name: vehicle ? vehicle.name : null,
        total,
        done,
        complete: total === 0 || done === total,
      });
    }

    res.json(lists);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /packing/lists — create packing list (optional vehicle_id = where items are going)
packingRouter.post('/lists', (req, res) => {
  try {
    const name = (req.body.name || '').trim() || 'New list';
    const vehicle_id = req.body.vehicle_id != null && req.body.vehicle_id !== '' ? parseInt(req.body.vehicle_id, 10) : null;
    const stmt = db().prepare('INSERT INTO packing_lists (name, vehicle_id) VALUES (?, ?)');
    const result = stmt.run(name, Number.isNaN(vehicle_id) ? null : vehicle_id);
    const row = db().prepare('SELECT * FROM packing_lists WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(row);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH /packing/lists/:id — update list name and/or vehicle_id
packingRouter.patch('/lists/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
    const existing = db().prepare('SELECT * FROM packing_lists WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ error: 'Not found' });
    const { name, vehicle_id } = req.body;
    const updates = [];
    const values = [];
    if (name !== undefined) {
      updates.push('name = ?');
      values.push((name || '').trim() || existing.name);
    }
    if (vehicle_id !== undefined) {
      updates.push('vehicle_id = ?');
      const vid = vehicle_id != null && vehicle_id !== '' ? parseInt(vehicle_id, 10) : null;
      values.push(Number.isNaN(vid) ? null : vid);
    }
    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
    values.push(id);
    db().prepare(`UPDATE packing_lists SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    const row = db().prepare('SELECT * FROM packing_lists WHERE id = ?').get(id);
    res.json(row);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /packing/lists/:id — delete list and its items
packingRouter.delete('/lists/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
    db().prepare('DELETE FROM packing WHERE packing_list_id = ?').run(id);
    db().prepare('DELETE FROM packing_lists WHERE id = ?').run(id);
    res.status(204).send();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

packingRouter.get('/', (req, res) => {
  try {
    const list = req.query.list;
    const all = req.query.all === '1' || req.query.all === 'true';
    const campsiteId = req.query.campsite_id;
    const includeGeneral = req.query.include_general === '1' || req.query.include_general === 'true';

    // All items with list_name (for cross-list shelter/bed/bedding). Only items in General or a packing_list; exclude orphans.
    if (all) {
      const d = db();
      const customLists = d.prepare('SELECT id, name, vehicle_id FROM packing_lists ORDER BY name').all();
      const vehicles = d.prepare('SELECT id, name FROM vehicles ORDER BY name').all();
      const listIds = new Set(customLists.map((c) => c.id));
      const rows = d.prepare('SELECT * FROM packing ORDER BY item_type, label').all();
      const isOrphan = (row) => {
        if (row.packing_list_id != null && row.packing_list_id !== '' && row.packing_list_id !== 0) {
          if (!listIds.has(row.packing_list_id)) return true;
        }
        if (row.campsite_id != null && row.campsite_id !== '') return true; // legacy campsite-bound items = orphan
        return false;
      };
      const validRows = rows.filter((r) => !isOrphan(r));
      const listName = (row) => {
        if (row.packing_list_id != null && row.packing_list_id !== '' && row.packing_list_id !== 0) {
          const cl = customLists.find((c) => c.id === row.packing_list_id);
          if (!cl) return `List ${row.packing_list_id}`;
          const v = cl.vehicle_id != null ? vehicles.find((ve) => ve.id === cl.vehicle_id) : null;
          return v ? `${cl.name} (${v.name})` : cl.name;
        }
        return 'General';
      };
      const items = validRows.map((r) => ({ ...r, list_name: listName(r) }));
      return res.json(items);
    }

    // List-based API: ?list=general | list=5 (packing list id only; no vehicle-derived lists)
    if (list !== undefined && list !== '') {
      let rows;
      if (list === 'general') {
        rows = db().prepare('SELECT * FROM packing WHERE (packing_list_id IS NULL OR packing_list_id = 0) AND (campsite_id IS NULL OR campsite_id = 0) ORDER BY item_type, created_at').all();
      } else {
        const customId = parseInt(list, 10);
        if (Number.isNaN(customId)) return res.status(400).json({ error: 'Invalid list' });
        rows = db().prepare('SELECT * FROM packing WHERE packing_list_id = ? ORDER BY item_type, created_at').all(customId);
      }
      return res.json(rows);
    }

    // Legacy campsite_id API
    let rows;
    if (campsiteId === undefined || campsiteId === '' || campsiteId === 'null') {
      rows = db().prepare('SELECT * FROM packing WHERE campsite_id IS NULL ORDER BY item_type, created_at').all();
    } else {
      const id = parseInt(campsiteId, 10);
      if (Number.isNaN(id)) {
        return res.status(400).json({ error: 'Invalid campsite_id' });
      }
      if (includeGeneral) {
        rows = db().prepare('SELECT * FROM packing WHERE campsite_id IS NULL OR campsite_id = ? ORDER BY item_type, created_at').all(id);
      } else {
        rows = db().prepare('SELECT * FROM packing WHERE campsite_id = ? ORDER BY item_type, created_at').all(id);
      }
    }
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const VALID_ITEM_TYPES = ['bed', 'bedding', 'shelter', 'site_furniture', 'food', 'cooking', 'other'];

packingRouter.post('/', (req, res) => {
  try {
    const { label, item_type, occupants, list } = req.body;
    let packingListId = null;
    if (list !== undefined && list !== '' && list != null && list !== 'general') {
      const customId = parseInt(list, 10);
      if (!Number.isNaN(customId)) packingListId = customId;
    }

    const type = item_type && VALID_ITEM_TYPES.includes(item_type) ? item_type : null;
    const occupantsNum = occupants != null && occupants !== '' ? parseInt(occupants, 10) : null;
    const stmt = db().prepare('INSERT INTO packing (label, done, campsite_id, packing_list_id, item_type, occupants) VALUES (?, 0, NULL, ?, ?, ?)');
    const result = stmt.run(
      label || 'New item',
      packingListId,
      type,
      Number.isNaN(occupantsNum) ? null : occupantsNum
    );
    const row = db().prepare('SELECT * FROM packing WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(row);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

packingRouter.patch('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { label, done, item_type, occupants } = req.body;
    const existing = db().prepare('SELECT * FROM packing WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ error: 'Not found' });
    const updates = [];
    const values = [];
    if (label !== undefined) { updates.push('label = ?'); values.push(label); }
    if (done !== undefined) { updates.push('done = ?'); values.push(done ? 1 : 0); }
    const newType = item_type !== undefined && item_type && VALID_ITEM_TYPES.includes(item_type) ? item_type : undefined;
    if (item_type !== undefined) {
      updates.push('item_type = ?');
      values.push(newType ?? null);
    }
    const effectiveType = item_type !== undefined ? (newType ?? null) : (existing.item_type || null);
    if (occupants !== undefined) {
      if (effectiveType === 'shelter') {
        const n = occupants == null || occupants === '' ? null : parseInt(occupants, 10);
        updates.push('occupants = ?');
        values.push(Number.isNaN(n) ? null : n);
      } else {
        updates.push('occupants = ?');
        values.push(null);
      }
    } else if (item_type !== undefined && effectiveType !== 'shelter') {
      updates.push('occupants = ?');
      values.push(null);
    }
    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
    values.push(id);
    db().prepare(`UPDATE packing SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    const row = db().prepare('SELECT * FROM packing WHERE id = ?').get(id);
    res.json(row || {});
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /packing/orphans — remove items whose list or campsite was deleted (fixes orphaned dropdown entries)
packingRouter.delete('/orphans', (req, res) => {
  try {
    const d = db();
    const deletedCampsite = d.prepare(
      'DELETE FROM packing WHERE campsite_id IS NOT NULL AND campsite_id NOT IN (SELECT id FROM campsites)'
    ).run();
    const deletedList = d.prepare(
      'DELETE FROM packing WHERE packing_list_id IS NOT NULL AND packing_list_id != 0 AND packing_list_id NOT IN (SELECT id FROM packing_lists)'
    ).run();
    const total = deletedCampsite.changes + deletedList.changes;
    // Clear member references to any packing item that no longer exists
    d.prepare('UPDATE members SET shelter_packing_id = NULL WHERE shelter_packing_id IS NOT NULL AND shelter_packing_id NOT IN (SELECT id FROM packing)').run();
    d.prepare('UPDATE members SET bed_packing_id = NULL WHERE bed_packing_id IS NOT NULL AND bed_packing_id NOT IN (SELECT id FROM packing)').run();
    d.prepare('UPDATE members SET bedding_packing_id = NULL WHERE bedding_packing_id IS NOT NULL AND bedding_packing_id NOT IN (SELECT id FROM packing)').run();
    res.json({ deleted: total });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

packingRouter.delete('/:id', (req, res) => {
  try {
    db().prepare('DELETE FROM packing WHERE id = ?').run(req.params.id);
    res.status(204).send();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

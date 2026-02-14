import { Router } from 'express';
import { getDb } from '../db.js';

export const packingRouter = Router();
const db = () => getDb();

// GET /packing/lists — all packing lists with completion (for red/green overview)
packingRouter.get('/lists', (req, res) => {
  try {
    const lists = [];
    const d = db();

    // General list: campsite_id IS NULL AND packing_list_id IS NULL
    const generalItems = d.prepare('SELECT id, done FROM packing WHERE campsite_id IS NULL AND (packing_list_id IS NULL OR packing_list_id = 0)').all();
    const generalTotal = generalItems.length;
    const generalDone = generalItems.filter((r) => r.done === 1).length;
    lists.push({
      id: 'general',
      name: 'General',
      total: generalTotal,
      done: generalDone,
      complete: generalTotal === 0 || generalDone === generalTotal,
    });

    // One list per vehicle (items from campsites that have this vehicle_id)
    const vehicles = d.prepare('SELECT id, name FROM vehicles ORDER BY name').all();
    for (const v of vehicles) {
      const campsiteIds = d.prepare('SELECT id FROM campsites WHERE vehicle_id = ?').all(v.id).map((r) => r.id);
      let total = 0;
      let done = 0;
      if (campsiteIds.length > 0) {
        const placeholders = campsiteIds.map(() => '?').join(',');
        const items = d.prepare(`SELECT done FROM packing WHERE campsite_id IN (${placeholders})`).all(...campsiteIds);
        total = items.length;
        done = items.filter((r) => r.done === 1).length;
      }
      lists.push({
        id: `v-${v.id}`,
        name: v.name,
        vehicleId: v.id,
        total,
        done,
        complete: total === 0 || done === total,
      });
    }

    // Custom lists
    const customLists = d.prepare('SELECT id, name FROM packing_lists ORDER BY name').all();
    for (const cl of customLists) {
      const items = d.prepare('SELECT done FROM packing WHERE packing_list_id = ?').all(cl.id);
      const total = items.length;
      const done = items.filter((r) => r.done === 1).length;
      lists.push({
        id: cl.id,
        name: cl.name,
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

// POST /packing/lists — create custom packing list
packingRouter.post('/lists', (req, res) => {
  try {
    const name = (req.body.name || '').trim() || 'New list';
    const stmt = db().prepare('INSERT INTO packing_lists (name) VALUES (?)');
    const result = stmt.run(name);
    const row = db().prepare('SELECT * FROM packing_lists WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(row);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /packing/lists/:id — delete custom list (and optionally its items)
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
    const campsiteId = req.query.campsite_id;
    const includeGeneral = req.query.include_general === '1' || req.query.include_general === 'true';

    // New list-based API: ?list=general | list=v-3 | list=5 (custom id)
    if (list !== undefined && list !== '') {
      let rows;
      if (list === 'general') {
        rows = db().prepare('SELECT * FROM packing WHERE campsite_id IS NULL AND (packing_list_id IS NULL OR packing_list_id = 0) ORDER BY item_type, created_at').all();
      } else if (String(list).startsWith('v-')) {
        const vehicleId = parseInt(String(list).slice(2), 10);
        if (Number.isNaN(vehicleId)) return res.status(400).json({ error: 'Invalid list' });
        const campsiteIds = db().prepare('SELECT id FROM campsites WHERE vehicle_id = ?').all(vehicleId).map((r) => r.id);
        if (campsiteIds.length === 0) {
          rows = [];
        } else {
          const placeholders = campsiteIds.map(() => '?').join(',');
          rows = db().prepare(`SELECT * FROM packing WHERE campsite_id IN (${placeholders}) ORDER BY item_type, created_at`).all(...campsiteIds);
        }
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
    const { label, campsite_id, item_type, occupants, list } = req.body;
    let campsiteId = campsite_id == null || campsite_id === '' ? null : parseInt(campsite_id, 10);
    let packingListId = null;

    // Resolve list=general | list=v-3 | list=5 into campsite_id / packing_list_id
    if (list !== undefined && list !== '' && list != null) {
      if (list === 'general') {
        campsiteId = null;
        packingListId = null;
      } else if (String(list).startsWith('v-')) {
        const vehicleId = parseInt(String(list).slice(2), 10);
        if (!Number.isNaN(vehicleId)) {
          const first = db().prepare('SELECT id FROM campsites WHERE vehicle_id = ? LIMIT 1').get(vehicleId);
          campsiteId = first ? first.id : null;
        }
        packingListId = null;
      } else {
        const customId = parseInt(list, 10);
        if (!Number.isNaN(customId)) {
          packingListId = customId;
          campsiteId = null;
        }
      }
    }

    const type = item_type && VALID_ITEM_TYPES.includes(item_type) ? item_type : null;
    const occupantsNum = occupants != null && occupants !== '' ? parseInt(occupants, 10) : null;
    const stmt = db().prepare('INSERT INTO packing (label, done, campsite_id, packing_list_id, item_type, occupants) VALUES (?, 0, ?, ?, ?, ?)');
    const result = stmt.run(
      label || 'New item',
      Number.isNaN(campsiteId) ? null : campsiteId,
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

packingRouter.delete('/:id', (req, res) => {
  try {
    db().prepare('DELETE FROM packing WHERE id = ?').run(req.params.id);
    res.status(204).send();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

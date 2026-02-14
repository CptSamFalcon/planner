import { Router } from 'express';
import { getDb } from '../db.js';

export const packingRouter = Router();
const db = () => getDb();

packingRouter.get('/', (req, res) => {
  try {
    const campsiteId = req.query.campsite_id;
    const includeGeneral = req.query.include_general === '1' || req.query.include_general === 'true';
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
    const { label, campsite_id, item_type, occupants } = req.body;
    const campsiteId = campsite_id == null || campsite_id === '' ? null : parseInt(campsite_id, 10);
    const type = item_type && VALID_ITEM_TYPES.includes(item_type) ? item_type : null;
    const occupantsNum = occupants != null && occupants !== '' ? parseInt(occupants, 10) : null;
    const stmt = db().prepare('INSERT INTO packing (label, campsite_id, item_type, occupants) VALUES (?, ?, ?, ?)');
    const result = stmt.run(
      label || 'New item',
      Number.isNaN(campsiteId) ? null : campsiteId,
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
    const updates = [];
    const values = [];
    if (label !== undefined) { updates.push('label = ?'); values.push(label); }
    if (done !== undefined) { updates.push('done = ?'); values.push(done ? 1 : 0); }
    if (item_type !== undefined) {
      updates.push('item_type = ?');
      values.push(item_type && VALID_ITEM_TYPES.includes(item_type) ? item_type : null);
    }
    if (occupants !== undefined) {
      const n = occupants == null || occupants === '' ? null : parseInt(occupants, 10);
      updates.push('occupants = ?');
      values.push(Number.isNaN(n) ? null : n);
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

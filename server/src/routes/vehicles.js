import { Router } from 'express';
import { getDb } from '../db.js';

export const vehiclesRouter = Router();
const db = () => getDb();

vehiclesRouter.get('/', (req, res) => {
  try {
    const rows = db().prepare('SELECT * FROM vehicles ORDER BY name').all();
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

vehiclesRouter.post('/', (req, res) => {
  try {
    const { name, capacity } = req.body;
    const cap = capacity != null && capacity !== '' ? parseInt(capacity, 10) : 1;
    const stmt = db().prepare('INSERT INTO vehicles (name, capacity) VALUES (?, ?)');
    const result = stmt.run((name || '').trim() || 'Vehicle', Number.isNaN(cap) || cap < 1 ? 1 : cap);
    const row = db().prepare('SELECT * FROM vehicles WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(row);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

vehiclesRouter.patch('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, capacity } = req.body;
    const updates = [];
    const values = [];
    if (name !== undefined) { updates.push('name = ?'); values.push(name); }
    if (capacity !== undefined) {
      const cap = capacity === '' || capacity == null ? 1 : parseInt(capacity, 10);
      updates.push('capacity = ?');
      values.push(Number.isNaN(cap) || cap < 1 ? 1 : cap);
    }
    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
    values.push(id);
    db().prepare(`UPDATE vehicles SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    const row = db().prepare('SELECT * FROM vehicles WHERE id = ?').get(id);
    res.json(row || {});
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

vehiclesRouter.delete('/:id', (req, res) => {
  try {
    const id = req.params.id;
    db().prepare('UPDATE members SET vehicle_id = NULL WHERE vehicle_id = ?').run(id);
    db().prepare('DELETE FROM vehicles WHERE id = ?').run(id);
    res.status(204).send();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

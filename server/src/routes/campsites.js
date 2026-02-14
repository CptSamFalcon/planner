import { Router } from 'express';
import { getDb } from '../db.js';

export const campsitesRouter = Router();
const db = () => getDb();

campsitesRouter.get('/', (req, res) => {
  try {
    const rows = db().prepare('SELECT * FROM campsites ORDER BY name').all();
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

campsitesRouter.post('/', (req, res) => {
  try {
    const { name, vehicle_id } = req.body;
    const stmt = db().prepare('INSERT INTO campsites (name, vehicle_id) VALUES (?, ?)');
    const result = stmt.run((name || '').trim() || 'Campsite', vehicle_id != null ? Number(vehicle_id) : null);
    const row = db().prepare('SELECT * FROM campsites WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(row);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

campsitesRouter.patch('/:id', (req, res) => {
  try {
    const id = req.params.id;
    const { name, vehicle_id } = req.body;
    const updates = [];
    const values = [];
    if (name !== undefined) { updates.push('name = ?'); values.push((name || '').trim() || 'Campsite'); }
    if (vehicle_id !== undefined) { updates.push('vehicle_id = ?'); values.push(vehicle_id != null ? Number(vehicle_id) : null); }
    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
    values.push(id);
    db().prepare(`UPDATE campsites SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    const row = db().prepare('SELECT * FROM campsites WHERE id = ?').get(id);
    res.json(row || {});
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

campsitesRouter.delete('/:id', (req, res) => {
  try {
    const id = req.params.id;
    db().prepare('UPDATE members SET campsite_id = NULL WHERE campsite_id = ?').run(id);
    db().prepare('DELETE FROM campsites WHERE id = ?').run(id);
    res.status(204).send();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

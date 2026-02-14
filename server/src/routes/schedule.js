import { Router } from 'express';
import { getDb } from '../db.js';

export const scheduleRouter = Router();
const db = () => getDb();

scheduleRouter.get('/', (req, res) => {
  try {
    const rows = db().prepare('SELECT * FROM schedule ORDER BY day, time').all();
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

scheduleRouter.post('/', (req, res) => {
  try {
    const { day, time, title, description } = req.body;
    const stmt = db().prepare('INSERT INTO schedule (day, time, title, description) VALUES (?, ?, ?, ?)');
    const result = stmt.run(day || 'Friday', time || '', title || 'Event', description || null);
    const row = db().prepare('SELECT * FROM schedule WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(row);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

scheduleRouter.patch('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { day, time, title, description } = req.body;
    const updates = [];
    const values = [];
    if (day !== undefined) { updates.push('day = ?'); values.push(day); }
    if (time !== undefined) { updates.push('time = ?'); values.push(time); }
    if (title !== undefined) { updates.push('title = ?'); values.push(title); }
    if (description !== undefined) { updates.push('description = ?'); values.push(description); }
    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
    values.push(id);
    db().prepare(`UPDATE schedule SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    const row = db().prepare('SELECT * FROM schedule WHERE id = ?').get(id);
    res.json(row || {});
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

scheduleRouter.delete('/:id', (req, res) => {
  try {
    db().prepare('DELETE FROM schedule WHERE id = ?').run(req.params.id);
    res.status(204).send();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

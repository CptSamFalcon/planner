const express = require('express');
const db = require('../db');
const router = express.Router();

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM schedule ORDER BY day, time').all();
  res.json(rows);
});

router.post('/', (req, res) => {
  const { day, time, title, description } = req.body;
  const run = db.prepare('INSERT INTO schedule (day, time, title, description) VALUES (?, ?, ?, ?)');
  const info = run.run(day || '', time || '', title || '', description || '');
  const row = db.prepare('SELECT * FROM schedule WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(row);
});

router.patch('/:id', (req, res) => {
  const id = Number(req.params.id);
  const { day, time, title, description } = req.body;
  const updates = [];
  const values = [];
  if (day !== undefined) { updates.push('day = ?'); values.push(day); }
  if (time !== undefined) { updates.push('time = ?'); values.push(time); }
  if (title !== undefined) { updates.push('title = ?'); values.push(title); }
  if (description !== undefined) { updates.push('description = ?'); values.push(description); }
  if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
  values.push(id);
  db.prepare(`UPDATE schedule SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  const row = db.prepare('SELECT * FROM schedule WHERE id = ?').get(id);
  res.json(row);
});

router.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  db.prepare('DELETE FROM schedule WHERE id = ?').run(id);
  res.status(204).send();
});

module.exports = router;

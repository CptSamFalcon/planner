const express = require('express');
const db = require('../db');
const router = express.Router();

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM vehicles ORDER BY id').all();
  res.json(rows);
});

router.post('/', (req, res) => {
  const { name, capacity = 4 } = req.body;
  const run = db.prepare('INSERT INTO vehicles (name, capacity) VALUES (?, ?)');
  const info = run.run(name || 'Vehicle', capacity);
  const row = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(row);
});

router.patch('/:id', (req, res) => {
  const id = Number(req.params.id);
  const { capacity } = req.body;
  if (capacity === undefined) return res.status(400).json({ error: 'capacity required' });
  db.prepare('UPDATE vehicles SET capacity = ? WHERE id = ?').run(capacity, id);
  const row = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(id);
  res.json(row);
});

router.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  db.prepare('DELETE FROM vehicles WHERE id = ?').run(id);
  res.status(204).send();
});

module.exports = router;

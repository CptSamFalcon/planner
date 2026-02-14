const express = require('express');
const db = require('../db');
const router = express.Router();

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM campsites ORDER BY id').all();
  res.json(rows);
});

router.post('/', (req, res) => {
  const { name } = req.body;
  const run = db.prepare('INSERT INTO campsites (name) VALUES (?)');
  const info = run.run(name || 'New campsite');
  const row = db.prepare('SELECT * FROM campsites WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(row);
});

router.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  db.prepare('DELETE FROM campsites WHERE id = ?').run(id);
  res.status(204).send();
});

module.exports = router;

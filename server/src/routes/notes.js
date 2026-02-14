const express = require('express');
const db = require('../db');
const router = express.Router();

router.get('/', (req, res) => {
  const row = db.prepare('SELECT * FROM notes WHERE id = 1').get();
  res.json(row || { id: 1, content: '', updated_at: null });
});

router.put('/', (req, res) => {
  const { content } = req.body;
  db.prepare('INSERT OR REPLACE INTO notes (id, content, updated_at) VALUES (1, ?, datetime("now"))').run(content ?? '');
  const row = db.prepare('SELECT * FROM notes WHERE id = 1').get();
  res.json(row || { id: 1, content: '', updated_at: null });
});

module.exports = router;

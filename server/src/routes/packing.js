const express = require('express');
const db = require('../db');
const router = express.Router();

router.get('/', (req, res) => {
  const { campsite_id, include_general } = req.query;
  let sql = 'SELECT * FROM packing WHERE 1=1';
  const params = [];
  if (campsite_id !== undefined && campsite_id !== '') {
    if (include_general === '1') {
      sql += ' AND (campsite_id = ? OR campsite_id IS NULL)';
    } else {
      sql += ' AND campsite_id = ?';
    }
    params.push(campsite_id);
  }
  sql += ' ORDER BY item_type, id';
  const rows = params.length ? db.prepare(sql).all(...params) : db.prepare(sql).all();
  res.json(rows);
});

router.post('/', (req, res) => {
  const { label, done = 0, campsite_id, item_type, occupants } = req.body;
  const run = db.prepare('INSERT INTO packing (label, done, campsite_id, item_type, occupants) VALUES (?, ?, ?, ?, ?)');
  const info = run.run(label || 'Item', done ? 1 : 0, campsite_id ?? null, item_type || null, occupants ?? null);
  const row = db.prepare('SELECT * FROM packing WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(row);
});

router.patch('/:id', (req, res) => {
  const id = Number(req.params.id);
  const { label, done, occupants } = req.body;
  const updates = [];
  const values = [];
  if (label !== undefined) { updates.push('label = ?'); values.push(label); }
  if (done !== undefined) { updates.push('done = ?'); values.push(done ? 1 : 0); }
  if (occupants !== undefined) { updates.push('occupants = ?'); values.push(occupants); }
  if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
  values.push(id);
  db.prepare(`UPDATE packing SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  const row = db.prepare('SELECT * FROM packing WHERE id = ?').get(id);
  res.json(row);
});

router.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  db.prepare('DELETE FROM packing WHERE id = ?').run(id);
  res.status(204).send();
});

module.exports = router;

const express = require('express');
const db = require('../db');
const router = express.Router();

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM members ORDER BY name').all();
  res.json(rows);
});

router.post('/', (req, res) => {
  const { name, status = 'going', note } = req.body;
  const run = db.prepare('INSERT INTO members (name, status, note) VALUES (?, ?, ?)');
  const info = run.run(name || 'New member', status, note || null);
  const row = db.prepare('SELECT * FROM members WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(row);
});

router.patch('/:id', (req, res) => {
  const id = Number(req.params.id);
  const allowed = ['name', 'status', 'note', 'contact_number', 'campsite_id', 'shelter_packing_id', 'bed_packing_id', 'bedding_packing_id', 'wristband', 'vehicle_id', 'pre_party'];
  const updates = [];
  const values = [];
  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      updates.push(`${key} = ?`);
      values.push(req.body[key]);
    }
  }
  if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
  values.push(id);
  db.prepare(`UPDATE members SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  const row = db.prepare('SELECT * FROM members WHERE id = ?').get(id);
  res.json(row);
});

router.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  db.prepare('DELETE FROM members WHERE id = ?').run(id);
  res.status(204).send();
});

module.exports = router;

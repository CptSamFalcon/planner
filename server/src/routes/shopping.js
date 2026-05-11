import { Router } from 'express';
import { getDb } from '../db.js';

export const shoppingRouter = Router();
const db = () => getDb();

const BUCKETS = new Set(['counter', 'cart', 'checked']);

function bucketOrderSql() {
  return `CASE bucket WHEN 'counter' THEN 0 WHEN 'cart' THEN 1 WHEN 'checked' THEN 2 ELSE 3 END`;
}

shoppingRouter.get('/', (req, res) => {
  try {
    const rows = db()
      .prepare(
        `SELECT * FROM shopping_items ORDER BY ${bucketOrderSql()}, sort_order ASC, id ASC`
      )
      .all();
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

shoppingRouter.post('/', (req, res) => {
  try {
    const label = String(req.body?.label ?? '').trim();
    if (!label) return res.status(400).json({ error: 'label required' });
    let bucket = req.body?.bucket != null ? String(req.body.bucket) : 'counter';
    if (!BUCKETS.has(bucket)) bucket = 'counter';
    const max = db().prepare('SELECT COALESCE(MAX(sort_order), -1) AS m FROM shopping_items WHERE bucket = ?').get(bucket);
    const sortOrder = (max?.m ?? -1) + 1;
    const stmt = db().prepare(
      'INSERT INTO shopping_items (label, bucket, sort_order) VALUES (?, ?, ?)'
    );
    const result = stmt.run(label, bucket, sortOrder);
    const row = db().prepare('SELECT * FROM shopping_items WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(row);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

shoppingRouter.patch('/:id', (req, res) => {
  try {
    const id = req.params.id;
    const { label, bucket, sort_order } = req.body || {};
    const updates = [];
    const values = [];
    if (label !== undefined) {
      const t = String(label).trim();
      if (!t) return res.status(400).json({ error: 'label cannot be empty' });
      updates.push('label = ?');
      values.push(t);
    }
    if (bucket !== undefined) {
      const b = String(bucket);
      if (!BUCKETS.has(b)) return res.status(400).json({ error: 'invalid bucket' });
      updates.push('bucket = ?');
      values.push(b);
      const max = db().prepare('SELECT COALESCE(MAX(sort_order), -1) AS m FROM shopping_items WHERE bucket = ?').get(b);
      updates.push('sort_order = ?');
      values.push((max?.m ?? -1) + 1);
    }
    if (sort_order !== undefined) {
      updates.push('sort_order = ?');
      values.push(Number(sort_order) || 0);
    }
    if (updates.length === 0) return res.status(400).json({ error: 'no updates' });
    values.push(id);
    db().prepare(`UPDATE shopping_items SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    const row = db().prepare('SELECT * FROM shopping_items WHERE id = ?').get(id);
    res.json(row || {});
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

shoppingRouter.delete('/:id', (req, res) => {
  try {
    db().prepare('DELETE FROM shopping_items WHERE id = ?').run(req.params.id);
    res.status(204).send();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

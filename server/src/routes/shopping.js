import { Router } from 'express';
import { getDb } from '../db.js';

export const shoppingRouter = Router();
const db = () => getDb();

const BUCKETS = new Set(['counter', 'cart']);

function bucketOrderSql() {
  return `CASE bucket WHEN 'counter' THEN 0 WHEN 'cart' THEN 1 ELSE 2 END`;
}

function loadTrips() {
  const trips = db().prepare('SELECT * FROM shopping_trips ORDER BY id DESC').all();
  const lineStmt = db().prepare(
    'SELECT label FROM shopping_trip_lines WHERE trip_id = ? ORDER BY sort_order ASC, id ASC'
  );
  return trips.map((t) => ({
    ...t,
    lines: lineStmt.all(t.id).map((r) => r.label),
  }));
}

shoppingRouter.get('/', (req, res) => {
  try {
    const items = db()
      .prepare(`SELECT * FROM shopping_items ORDER BY ${bucketOrderSql()}, sort_order ASC, id ASC`)
      .all();
    const trips = loadTrips();
    res.json({ items, trips });
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

/** Body: { total: number, checked_out_by: string } — snapshots cart, records price + shopper, clears cart. */
shoppingRouter.post('/checkout', (req, res) => {
  try {
    const checkedOutBy = String(req.body?.checked_out_by ?? '').trim();
    if (!checkedOutBy) {
      return res.status(400).json({ error: 'checked_out_by is required' });
    }
    if (checkedOutBy.length > 200) {
      return res.status(400).json({ error: 'checked_out_by is too long' });
    }
    const raw = req.body?.total;
    const total = typeof raw === 'string' ? parseFloat(raw) : Number(raw);
    if (!Number.isFinite(total) || total < 0) {
      return res.status(400).json({ error: 'total must be a non-negative number' });
    }
    const cartRows = db()
      .prepare("SELECT id, label, sort_order FROM shopping_items WHERE bucket = 'cart' ORDER BY sort_order ASC, id ASC")
      .all();
    if (cartRows.length === 0) {
      return res.status(400).json({ error: 'cart is empty' });
    }

    const run = db();
    const tx = run.transaction(() => {
      const tripResult = run
        .prepare('INSERT INTO shopping_trips (total, checked_out_by) VALUES (?, ?)')
        .run(total, checkedOutBy);
      const tripId = tripResult.lastInsertRowid;
      const insLine = run.prepare(
        'INSERT INTO shopping_trip_lines (trip_id, label, sort_order) VALUES (?, ?, ?)'
      );
      for (let i = 0; i < cartRows.length; i++) {
        insLine.run(tripId, cartRows[i].label, i);
      }
      run.prepare("DELETE FROM shopping_items WHERE bucket = 'cart'").run();
    });
    tx();

    const trips = loadTrips();
    const items = run
      .prepare(`SELECT * FROM shopping_items ORDER BY ${bucketOrderSql()}, sort_order ASC, id ASC`)
      .all();
    res.status(201).json({ trips, items });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

shoppingRouter.delete('/trips/:id', (req, res) => {
  try {
    const id = req.params.id;
    const r = db().prepare('DELETE FROM shopping_trips WHERE id = ?').run(id);
    if (r.changes === 0) return res.status(404).json({ error: 'not found' });
    res.status(204).send();
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

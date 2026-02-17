import { Router } from 'express';
import { getDb } from '../db.js';

export const bingoRouter = Router();
const db = () => getDb();

// Deterministic shuffle of array indices using member id as seed (mulberry32)
function seededShuffle(length, seed) {
  const arr = Array.from({ length }, (_, i) => i);
  let s = Math.imul(seed | 0, 1) || 1;
  const next = () => {
    s = Math.imul(s ^ (s >>> 15), s | 1);
    s ^= s + Math.imul(s ^ (s >>> 7), s | 61);
    return (s ^ (s >>> 14)) >>> 0;
  };
  for (let i = length - 1; i > 0; i--) {
    const j = next() % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

bingoRouter.get('/items', (req, res) => {
  try {
    const rows = db().prepare('SELECT id, label, sort_order FROM bingo_items ORDER BY sort_order, id').all();
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

bingoRouter.patch('/items/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { label } = req.body;
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
    if (label !== undefined && typeof label !== 'string') return res.status(400).json({ error: 'Label must be a string' });
    const updates = [];
    const values = [];
    if (label !== undefined) {
      updates.push('label = ?');
      values.push(label.trim() || '');
    }
    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
    values.push(id);
    db().prepare(`UPDATE bingo_items SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    const row = db().prepare('SELECT id, label, sort_order FROM bingo_items WHERE id = ?').get(id);
    res.json(row || {});
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const CENTER_INDEX = 12; // middle of 5x5

// Same winning lines as client (rows, cols, diagonals)
const BINGO_LINES = [
  [0, 1, 2, 3, 4], [5, 6, 7, 8, 9], [10, 11, 12, 13, 14], [15, 16, 17, 18, 19], [20, 21, 22, 23, 24],
  [0, 5, 10, 15, 20], [1, 6, 11, 16, 21], [2, 7, 12, 17, 22], [3, 8, 13, 18, 23], [4, 9, 14, 19, 24],
  [0, 6, 12, 18, 24], [4, 8, 12, 16, 20],
];

function hasBingo(checked) {
  return BINGO_LINES.some((line) => line.every((i) => !!checked[String(i)]));
}

bingoRouter.get('/board/:memberId', (req, res) => {
  try {
    const memberId = parseInt(req.params.memberId, 10);
    if (Number.isNaN(memberId)) return res.status(400).json({ error: 'Invalid member id' });
    const items = db().prepare('SELECT id, label FROM bingo_items ORDER BY sort_order, id').all();
    if (items.length < 25) return res.status(500).json({ error: 'Need at least 25 bingo items' });
    // Center tile is the 21st item (sort_order 20 in seed). Others are shuffled into remaining positions.
    const CENTER_ITEM_INDEX = 20;
    const freeSpace = items[CENTER_ITEM_INDEX];
    const others = items.filter((_, i) => i !== CENTER_ITEM_INDEX);
    if (!freeSpace || others.length !== 24) return res.status(500).json({ error: 'Bingo items must have exactly 25 entries' });
    const positionsExceptCenter = [...Array(25).keys()].filter((i) => i !== CENTER_INDEX);
    const itemOrder = seededShuffle(24, memberId);
    const tiles = [];
    for (let i = 0; i < 25; i++) tiles.push({ index: i, label: '' });
    tiles[CENTER_INDEX] = { index: CENTER_INDEX, label: freeSpace.label };
    for (let i = 0; i < 24; i++) {
      tiles[positionsExceptCenter[i]].label = others[itemOrder[i]].label;
    }
    const member = db().prepare('SELECT bingo_checked FROM members WHERE id = ?').get(memberId);
    let checked = {};
    if (member && member.bingo_checked) {
      try {
        checked = JSON.parse(member.bingo_checked);
      } catch (_) {}
    }
    res.json({ tiles, checked });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

bingoRouter.patch('/board/:memberId', (req, res) => {
  try {
    const memberId = parseInt(req.params.memberId, 10);
    const { tileIndex } = req.body;
    if (Number.isNaN(memberId)) return res.status(400).json({ error: 'Invalid member id' });
    const idx = parseInt(tileIndex, 10);
    if (Number.isNaN(idx) || idx < 0 || idx > 24) return res.status(400).json({ error: 'Invalid tile index' });
    const member = db().prepare('SELECT bingo_checked FROM members WHERE id = ?').get(memberId);
    let checked = {};
    if (member && member.bingo_checked) {
      try {
        checked = JSON.parse(member.bingo_checked);
      } catch (_) {}
    }
    const key = String(idx);
    checked[key] = !checked[key];
    const run = db();
    run.prepare('UPDATE members SET bingo_checked = ? WHERE id = ?').run(JSON.stringify(checked), memberId);
    if (hasBingo(checked)) {
      const member = run.prepare('SELECT bingo_completed_at FROM members WHERE id = ?').get(memberId);
      if (member && !member.bingo_completed_at) {
        run.prepare('UPDATE members SET bingo_completed_at = datetime(\'now\') WHERE id = ?').run(memberId);
      }
    }
    res.json({ checked });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

bingoRouter.post('/complete', (req, res) => {
  try {
    const { memberId } = req.body;
    const id = parseInt(memberId, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid member id' });
    const member = db().prepare('SELECT bingo_completed_at FROM members WHERE id = ?').get(id);
    if (!member) return res.status(404).json({ error: 'Member not found' });
    if (member.bingo_completed_at) return res.json({ already_completed: true, completed_at: member.bingo_completed_at });
    db().prepare('UPDATE members SET bingo_completed_at = datetime(\'now\') WHERE id = ?').run(id);
    const updated = db().prepare('SELECT bingo_completed_at FROM members WHERE id = ?').get(id);
    res.json({ completed_at: updated.bingo_completed_at });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

bingoRouter.get('/leaderboard', (req, res) => {
  try {
    const rows = db()
      .prepare(
        'SELECT id AS memberId, name, bingo_completed_at AS completedAt FROM members WHERE bingo_completed_at IS NOT NULL AND status = ? ORDER BY bingo_completed_at ASC'
      )
      .all('going');
    const leaderboard = rows.map((row, i) => ({ ...row, rank: i + 1 }));
    res.json(leaderboard);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

import { Router } from 'express';
import { getDb } from '../db.js';

export const mealsRouter = Router();
const db = () => getDb();

function parseIngredientsJson(val) {
  if (val == null || val === '') return [];
  try {
    const p = JSON.parse(val);
    return Array.isArray(p) ? p.map((s) => String(s).trim()).filter(Boolean) : [];
  } catch (_) {
    return String(val)
      .split(/\n/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
}

function stringifyIngredients(val) {
  if (val == null) return '[]';
  if (Array.isArray(val)) {
    return JSON.stringify(val.map((s) => String(s).trim()).filter(Boolean));
  }
  if (typeof val === 'string') {
    try {
      const p = JSON.parse(val);
      if (Array.isArray(p)) return JSON.stringify(p.map((s) => String(s).trim()).filter(Boolean));
    } catch (_) {}
    return JSON.stringify(
      val.split(/\n/).map((s) => s.trim()).filter(Boolean)
    );
  }
  return '[]';
}

function rowToMeal(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    slot_label: row.slot_label,
    preparer_member_id: row.preparer_member_id,
    preparer_name: row.preparer_name,
    recipe: row.recipe,
    ingredients: parseIngredientsJson(row.ingredients_json),
    notes: row.notes,
    created_at: row.created_at,
  };
}

mealsRouter.get('/', (req, res) => {
  try {
    const rows = db()
      .prepare(
        `SELECT m.id, m.title, m.slot_label, m.preparer_member_id, m.recipe, m.ingredients_json, m.notes, m.created_at,
                mem.name AS preparer_name
         FROM meals m
         JOIN members mem ON m.preparer_member_id = mem.id
         ORDER BY COALESCE(m.slot_label, ''), m.id`
      )
      .all();
    res.json(rows.map((r) => rowToMeal(r)));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

mealsRouter.post('/', (req, res) => {
  try {
    const { title, slot_label, preparer_member_id, recipe, ingredients, notes } = req.body;
    const tid = preparer_member_id != null ? Number(preparer_member_id) : NaN;
    if (!title || String(title).trim() === '') {
      return res.status(400).json({ error: 'title is required' });
    }
    if (Number.isNaN(tid)) {
      return res.status(400).json({ error: 'preparer_member_id is required' });
    }
    const prep = db().prepare('SELECT id FROM members WHERE id = ?').get(tid);
    if (!prep) return res.status(400).json({ error: 'Invalid preparer' });
    const ing = stringifyIngredients(ingredients);
    const result = db()
      .prepare(
        `INSERT INTO meals (title, slot_label, preparer_member_id, recipe, ingredients_json, notes)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(
        String(title).trim(),
        slot_label != null && String(slot_label).trim() !== '' ? String(slot_label).trim() : null,
        tid,
        recipe != null ? String(recipe) : null,
        ing,
        notes != null ? String(notes) : null
      );
    const row = db()
      .prepare(
        `SELECT m.id, m.title, m.slot_label, m.preparer_member_id, m.recipe, m.ingredients_json, m.notes, m.created_at,
                mem.name AS preparer_name
         FROM meals m
         JOIN members mem ON m.preparer_member_id = mem.id
         WHERE m.id = ?`
      )
      .get(result.lastInsertRowid);
    res.status(201).json(rowToMeal(row));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

mealsRouter.patch('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { title, slot_label, preparer_member_id, recipe, ingredients, notes } = req.body;
    const updates = [];
    const values = [];
    if (title !== undefined) { updates.push('title = ?'); values.push(String(title).trim()); }
    if (slot_label !== undefined) {
      updates.push('slot_label = ?');
      values.push(slot_label != null && String(slot_label).trim() !== '' ? String(slot_label).trim() : null);
    }
    if (preparer_member_id !== undefined) {
      const tid = Number(preparer_member_id);
      if (Number.isNaN(tid)) return res.status(400).json({ error: 'Invalid preparer' });
      const prep = db().prepare('SELECT id FROM members WHERE id = ?').get(tid);
      if (!prep) return res.status(400).json({ error: 'Invalid preparer' });
      updates.push('preparer_member_id = ?');
      values.push(tid);
    }
    if (recipe !== undefined) { updates.push('recipe = ?'); values.push(recipe != null ? String(recipe) : null); }
    if (ingredients !== undefined) { updates.push('ingredients_json = ?'); values.push(stringifyIngredients(ingredients)); }
    if (notes !== undefined) { updates.push('notes = ?'); values.push(notes != null ? String(notes) : null); }
    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
    values.push(id);
    db().prepare(`UPDATE meals SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    const row = db()
      .prepare(
        `SELECT m.id, m.title, m.slot_label, m.preparer_member_id, m.recipe, m.ingredients_json, m.notes, m.created_at,
                mem.name AS preparer_name
         FROM meals m
         JOIN members mem ON m.preparer_member_id = mem.id
         WHERE m.id = ?`
      )
      .get(id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(rowToMeal(row));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

mealsRouter.delete('/:id', (req, res) => {
  try {
    const r = db().prepare('DELETE FROM meals WHERE id = ?').run(req.params.id);
    if (r.changes === 0) return res.status(404).json({ error: 'Not found' });
    res.status(204).send();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

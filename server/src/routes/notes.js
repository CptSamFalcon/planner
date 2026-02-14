import { Router } from 'express';
import { getDb } from '../db.js';

export const notesRouter = Router();
const db = () => getDb();

notesRouter.get('/', (req, res) => {
  try {
    const rows = db().prepare('SELECT * FROM notes ORDER BY created_at DESC').all();
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

notesRouter.post('/', (req, res) => {
  try {
    const { content } = req.body;
    const stmt = db().prepare('INSERT INTO notes (content) VALUES (?)');
    const result = stmt.run(content || '');
    const row = db().prepare('SELECT * FROM notes WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(row);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

notesRouter.patch('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    if (content === undefined) return res.status(400).json({ error: 'content required' });
    db().prepare('UPDATE notes SET content = ? WHERE id = ?').run(content, id);
    const row = db().prepare('SELECT * FROM notes WHERE id = ?').get(id);
    res.json(row || {});
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

notesRouter.delete('/:id', (req, res) => {
  try {
    db().prepare('DELETE FROM notes WHERE id = ?').run(req.params.id);
    res.status(204).send();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

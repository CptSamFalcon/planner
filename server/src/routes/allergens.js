import { Router } from 'express';
import { getDb } from '../db.js';

export const allergensRouter = Router();

function parseAliases(val) {
  if (val == null || val === '') return [];
  try {
    const parsed = JSON.parse(val);
    if (!Array.isArray(parsed)) return [];
    return [...new Set(parsed.map((x) => String(x).trim().toLowerCase()).filter(Boolean))];
  } catch (_) {
    return [];
  }
}

allergensRouter.get('/', (_req, res) => {
  try {
    const rows = getDb()
      .prepare('SELECT id, canonical_name, aliases_json FROM allergen_catalog ORDER BY canonical_name ASC')
      .all();
    res.json(
      rows.map((r) => ({
        id: r.id,
        canonical_name: r.canonical_name,
        aliases: parseAliases(r.aliases_json),
      }))
    );
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

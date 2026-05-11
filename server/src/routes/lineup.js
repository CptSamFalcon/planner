import { Router } from 'express';
import { getDb } from '../db.js';

export const lineupRouter = Router();

function parseTags(json) {
  try {
    const p = JSON.parse(json);
    return Array.isArray(p) ? p.map((s) => String(s)) : [];
  } catch (_) {
    return [];
  }
}

lineupRouter.get('/artists', (req, res) => {
  try {
    const db = getDb();
    const rows = db
      .prepare(
        'SELECT id, name, sort_order, tags_json, bio, deezer_id, image_url FROM lineup_artists ORDER BY sort_order ASC, name ASC'
      )
      .all();
    const poster = db.prepare('SELECT poster_url, ocr_raw, ocr_note, generated_at FROM lineup_poster_ocr WHERE id = 1').get();
    res.json({
      artists: rows.map((row) => ({
        id: row.id,
        name: row.name,
        sort_order: row.sort_order,
        tags: parseTags(row.tags_json),
        bio: row.bio,
        deezerId: row.deezer_id,
        image: row.image_url,
      })),
      poster: poster
        ? {
            posterUrl: poster.poster_url,
            ocrRaw: poster.ocr_raw,
            ocrNote: poster.ocr_note,
            generatedAt: poster.generated_at,
          }
        : null,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to load lineup' });
  }
});

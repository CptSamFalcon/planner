import { Router } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { getDb } from '../db.js';

function normalizeTag(s) {
  const t = String(s || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
  if (!t) return null;
  return t.slice(0, 32);
}

function parseTagsField(raw) {
  if (raw == null || raw === '') return [];
  if (Array.isArray(raw)) {
    return [...new Set(raw.map(normalizeTag).filter(Boolean))];
  }
  const str = String(raw).trim();
  if (str.startsWith('[')) {
    try {
      const arr = JSON.parse(str);
      return Array.isArray(arr) ? [...new Set(arr.map(normalizeTag).filter(Boolean))] : [];
    } catch (_) {
      return [];
    }
  }
  return [
    ...new Set(
      str
        .split(/[,;]/)
        .map((x) => normalizeTag(x))
        .filter(Boolean)
    ),
  ];
}

function getTagsByPhotoId(photoId) {
  return getDb()
    .prepare('SELECT tag FROM photo_tags WHERE photo_id = ? ORDER BY tag')
    .all(photoId)
    .map((r) => r.tag);
}

function getTagsMapForPhotoIds(ids) {
  if (!ids.length) return new Map();
  const ph = ids.map(() => '?').join(',');
  const rows = getDb()
    .prepare(`SELECT photo_id, tag FROM photo_tags WHERE photo_id IN (${ph}) ORDER BY tag`)
    .all(...ids);
  const map = new Map();
  for (const r of rows) {
    if (!map.has(r.photo_id)) map.set(r.photo_id, []);
    map.get(r.photo_id).push(r.tag);
  }
  return map;
}

function replacePhotoTags(photoId, rawTags) {
  const tags = parseTagsField(rawTags);
  const db = getDb();
  const del = db.prepare('DELETE FROM photo_tags WHERE photo_id = ?');
  const ins = db.prepare('INSERT OR IGNORE INTO photo_tags (photo_id, tag) VALUES (?, ?)');
  const run = db.transaction((id, list) => {
    del.run(id);
    for (const t of list) {
      ins.run(id, t);
    }
  });
  run(photoId, tags);
}

function selectPhotoById(id) {
  const row = getDb()
    .prepare(
      `SELECT p.*, m.name AS uploader_name
       FROM photos p
       LEFT JOIN members m ON m.id = p.uploader_member_id
       WHERE p.id = ?`
    )
    .get(id);
  if (!row) return null;
  row.tags = getTagsByPhotoId(id);
  return row;
}

function safeExt(name) {
  const ext = path.extname(String(name || '')).toLowerCase();
  if (['.jpg', '.jpeg', '.png', '.webp', '.gif', '.heic', '.heif'].includes(ext)) return ext;
  return '.jpg';
}

function makeStoredFilename(originalName) {
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  return `photo-${ts}-${rand}${safeExt(originalName)}`;
}

function derivedNames(originalFile) {
  const base = path.basename(originalFile, path.extname(originalFile));
  return {
    display: `${base}-display.webp`,
    thumb: `${base}-thumb.webp`,
  };
}

async function ensureDerivedFiles(photosDir, filename) {
  const names = derivedNames(filename);
  const source = path.join(photosDir, filename);
  const displayPath = path.join(photosDir, names.display);
  const thumbPath = path.join(photosDir, names.thumb);

  if (!fs.existsSync(displayPath)) {
    await sharp(source)
      .rotate()
      .resize({ width: 2200, height: 2200, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 88 })
      .toFile(displayPath);
  }
  if (!fs.existsSync(thumbPath)) {
    await sharp(source)
      .rotate()
      .resize({ width: 540, height: 540, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toFile(thumbPath);
  }
  return names;
}

export function createPhotosRouter({ photosDir }) {
  fs.mkdirSync(photosDir, { recursive: true });
  const router = Router();

  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, photosDir),
    filename: (_req, file, cb) => cb(null, makeStoredFilename(file.originalname)),
  });

  const upload = multer({
    storage,
    limits: { fileSize: 25 * 1024 * 1024, files: 25 },
    fileFilter: (_req, file, cb) => {
      if (String(file.mimetype || '').startsWith('image/')) cb(null, true);
      else cb(new Error('Only image uploads are allowed'));
    },
  });

  router.get('/', async (_req, res) => {
    try {
      const rows = getDb()
        .prepare(
          `SELECT p.*, m.name AS uploader_name
           FROM photos p
           LEFT JOIN members m ON m.id = p.uploader_member_id
           ORDER BY datetime(p.created_at) DESC, p.id DESC`
        )
        .all();
      const setDerived = getDb().prepare(
        'UPDATE photos SET display_filename = ?, thumb_filename = ? WHERE id = ?'
      );
      for (const row of rows) {
        if (!row.display_filename || !row.thumb_filename) {
          try {
            const names = await ensureDerivedFiles(photosDir, row.filename);
            row.display_filename = names.display;
            row.thumb_filename = names.thumb;
            setDerived.run(names.display, names.thumb, row.id);
          } catch (_) {
            // keep fallback to original if derivative generation fails
            row.display_filename = row.filename;
            row.thumb_filename = row.filename;
          }
        }
      }
      const tagMap = getTagsMapForPhotoIds(rows.map((r) => r.id));
      for (const row of rows) {
        row.tags = tagMap.get(row.id) || [];
      }
      res.json(rows);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.post('/', upload.array('photos', 25), async (req, res) => {
    try {
      const files = Array.isArray(req.files) ? req.files : [];
      if (!files.length) {
        res.status(400).json({ error: 'No image files uploaded' });
        return;
      }
      const uploaderIdRaw = req.body?.uploader_member_id;
      const uploaderId =
        uploaderIdRaw == null || uploaderIdRaw === '' ? null : Number.parseInt(uploaderIdRaw, 10);
      const caption = String(req.body?.caption || '').trim() || null;
      const uploadTags = parseTagsField(req.body?.tags);
      const insert = getDb().prepare(
        `INSERT INTO photos
         (filename, display_filename, thumb_filename, original_name, mime_type, size_bytes, caption, uploader_member_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      );
      const out = [];
      for (const f of files) {
        let names;
        try {
          names = await ensureDerivedFiles(photosDir, f.filename);
        } catch (_) {
          names = { display: f.filename, thumb: f.filename };
        }
        const result = insert.run(
          f.filename,
          names.display,
          names.thumb,
          f.originalname || null,
          f.mimetype || null,
          f.size || null,
          caption,
          Number.isNaN(uploaderId) ? null : uploaderId
        );
        const newId = result.lastInsertRowid;
        if (uploadTags.length) {
          replacePhotoTags(newId, uploadTags);
        }
        out.push(selectPhotoById(newId));
      }
      res.status(201).json(out);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.patch('/:id', (req, res) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      if ('caption' in req.body) {
        getDb().prepare('UPDATE photos SET caption = ? WHERE id = ?').run(req.body.caption || null, id);
      }
      if ('tags' in req.body) {
        replacePhotoTags(id, req.body.tags);
      }
      const row = selectPhotoById(id);
      if (!row) {
        res.status(404).json({ error: 'Photo not found' });
        return;
      }
      res.json(row);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.delete('/:id', (req, res) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      const row = getDb()
        .prepare('SELECT filename, display_filename, thumb_filename FROM photos WHERE id = ?')
        .get(id);
      if (!row) {
        res.status(404).json({ error: 'Photo not found' });
        return;
      }
      getDb().prepare('DELETE FROM photo_tags WHERE photo_id = ?').run(id);
      getDb().prepare('DELETE FROM photos WHERE id = ?').run(id);
      const filePath = path.join(photosDir, row.filename);
      try {
        fs.unlinkSync(filePath);
      } catch (_) {
        // file may already be removed
      }
      for (const extra of [row.display_filename, row.thumb_filename]) {
        if (!extra || extra === row.filename) continue;
        try {
          fs.unlinkSync(path.join(photosDir, extra));
        } catch (_) {
          // already removed
        }
      }
      res.status(204).send();
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  return router;
}

import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import sharp from 'sharp';
import { getDb } from '../db.js';
import { normalizeAllergies, normalizeFavoriteArtistsJson } from './members.js';

const COOKIE_NAME = 'planner_member_id';
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;
const AVATAR_PUBLIC_PATH = '/api/me/profile/avatar';

function secureMeCookie() {
  return (
    process.env.PLANNER_COOKIE_SECURE === 'true' ||
    (process.env.NODE_ENV === 'production' && process.env.PLANNER_COOKIE_SECURE !== 'false')
  );
}

function parseFavoriteArtists(raw) {
  if (raw == null || raw === '') return [];
  try {
    const p = JSON.parse(raw);
    return Array.isArray(p) ? p.map((s) => String(s).trim()).filter(Boolean) : [];
  } catch (_) {
    return [];
  }
}

function publicMember(row) {
  if (!row) return null;
  const { favorite_artists_json, ...rest } = row;
  return {
    ...rest,
    favorite_artists: parseFavoriteArtists(favorite_artists_json),
  };
}

function memberIdFromReq(req) {
  const raw = req.cookies?.[COOKIE_NAME];
  const id = raw ? parseInt(raw, 10) : NaN;
  return Number.isFinite(id) && id > 0 ? id : null;
}

export function createMeRouter({ memberAvatarsDir }) {
  const router = Router();
  fs.mkdirSync(memberAvatarsDir, { recursive: true });

  const avatarFile = (id) => path.join(memberAvatarsDir, `${id}.webp`);

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 3 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const ok = /^image\/(jpeg|png|gif|webp)$/i.test(file.mimetype);
      if (ok) cb(null, true);
      else cb(new Error('Image must be JPEG, PNG, GIF, or WebP'));
    },
  });

  /** GET /api/me — identity + profile summary */
  router.get('/', (req, res) => {
    const memberId = memberIdFromReq(req);
    if (!memberId) {
      return res.json({ member_id: null, member: null, needsProfile: false });
    }
    const row = getDb().prepare('SELECT * FROM members WHERE id = ?').get(memberId);
    if (!row) {
      res.clearCookie(COOKIE_NAME, { path: '/' });
      return res.json({ member_id: null, member: null, needsProfile: false });
    }
    const needsProfile = !row.onboarding_completed_at;
    res.json({ member_id: memberId, member: publicMember(row), needsProfile });
  });

  /** POST /api/me — set member cookie */
  router.post('/', (req, res) => {
    const memberId = req.body?.member_id;
    if (memberId == null) {
      res.clearCookie(COOKIE_NAME, { path: '/' });
      return res.json({ member_id: null, member: null, needsProfile: false });
    }
    const id = parseInt(memberId, 10);
    if (Number.isNaN(id) || id < 1) {
      return res.status(400).json({ error: 'Invalid member_id' });
    }
    const row = getDb().prepare('SELECT * FROM members WHERE id = ?').get(id);
    if (!row) {
      return res.status(404).json({ error: 'Member not found' });
    }
    res.cookie(COOKIE_NAME, String(id), {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: COOKIE_MAX_AGE,
      secure: secureMeCookie(),
    });
    const needsProfile = !row.onboarding_completed_at;
    res.json({ member_id: id, member: publicMember(row), needsProfile });
  });

  /** PATCH /api/me/profile — complete onboarding / update own profile */
  router.patch('/profile', (req, res) => {
    const id = memberIdFromReq(req);
    if (!id) {
      return res.status(400).json({ error: 'Choose who you are on this device first.' });
    }
    const row = getDb().prepare('SELECT * FROM members WHERE id = ?').get(id);
    if (!row) {
      return res.status(404).json({ error: 'Member not found' });
    }

    const { name, nickname, bio, favoriteArtists, allergies } = req.body || {};
    const errs = [];

    const nameTrim = name != null ? String(name).trim() : '';
    if (nameTrim.length < 1 || nameTrim.length > 120) errs.push('Name is required (max 120 characters).');

    const nickTrim = nickname != null ? String(nickname).trim().slice(0, 80) : '';
    if (nickTrim.length < 1 || nickTrim.length > 80) errs.push('Nickname is required (max 80 characters).');

    const bioTrim = bio != null ? String(bio).trim() : '';
    if (bioTrim.length < 3 || bioTrim.length > 600) errs.push('Short bio must be between 3 and 600 characters.');

    let artists = favoriteArtists;
    if (!Array.isArray(artists)) {
      errs.push('Favourite artists must be a list with at least one name.');
      artists = [];
    }
    const artistStrings = artists.map((s) => String(s).trim()).filter(Boolean).slice(0, 50);
    if (artistStrings.length < 1) errs.push('Add at least one favourite artist.');

    if (errs.length) {
      return res.status(400).json({ error: errs.join(' ') });
    }

    const allergiesJson = allergies !== undefined ? normalizeAllergies(allergies) : row.allergies;
    const favJson = normalizeFavoriteArtistsJson(artistStrings);

    getDb()
      .prepare(
        `UPDATE members SET
          name = ?,
          nickname = ?,
          bio = ?,
          favorite_artists_json = ?,
          allergies = ?,
          onboarding_completed_at = datetime('now')
        WHERE id = ?`
      )
      .run(
        nameTrim,
        nickTrim || null,
        bioTrim,
        favJson,
        allergiesJson,
        id
      );

    const updated = getDb().prepare('SELECT * FROM members WHERE id = ?').get(id);
    res.json({ member: publicMember(updated), needsProfile: false });
  });

  /** GET /api/me/profile/avatar */
  router.get('/profile/avatar', (req, res) => {
    const id = memberIdFromReq(req);
    if (!id) {
      return res.status(401).send('Unauthorized');
    }
    const file = avatarFile(id);
    if (!fs.existsSync(file)) {
      return res.status(404).send('Not found');
    }
    res.setHeader('Content-Type', 'image/webp');
    res.setHeader('Cache-Control', 'private, max-age=3600');
    fs.createReadStream(file).pipe(res);
  });

  /** POST /api/me/profile/avatar — multipart field "avatar" */
  router.post(
    '/profile/avatar',
    (req, res, next) => {
      upload.single('avatar')(req, res, (err) => {
        if (err) {
          res.status(400).json({ error: err.message || 'Invalid upload' });
          return;
        }
        next();
      });
    },
    async (req, res) => {
    const id = memberIdFromReq(req);
    if (!id) {
      return res.status(400).json({ error: 'Choose who you are on this device first.' });
    }
    if (!req.file?.buffer) {
      return res.status(400).json({ error: 'Missing image file (field name: avatar).' });
    }
    const row = getDb().prepare('SELECT id FROM members WHERE id = ?').get(id);
    if (!row) {
      return res.status(404).json({ error: 'Member not found' });
    }
    try {
      await sharp(req.file.buffer)
        .rotate()
        .resize(512, 512, { fit: 'cover', position: 'centre' })
        .webp({ quality: 82 })
        .toFile(avatarFile(id));
      getDb().prepare('UPDATE members SET avatar_url = ? WHERE id = ?').run(AVATAR_PUBLIC_PATH, id);
      res.json({ ok: true, avatarUrl: AVATAR_PUBLIC_PATH });
    } catch (e) {
      res.status(400).json({ error: e.message || 'Could not process image' });
    }
    }
  );

  /** DELETE /api/me/profile/avatar */
  router.delete('/profile/avatar', (req, res) => {
    const id = memberIdFromReq(req);
    if (!id) {
      return res.status(400).json({ error: 'Choose who you are on this device first.' });
    }
    try {
      fs.unlinkSync(avatarFile(id));
    } catch (_) {
      /* missing file */
    }
    getDb().prepare('UPDATE members SET avatar_url = NULL WHERE id = ?').run(id);
    res.json({ ok: true });
  });

  return router;
}

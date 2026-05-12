import { Router } from 'express';
import crypto from 'crypto';
import { getDb } from '../db.js';
import { hashPassword, verifyPassword } from '../festos-password.js';
import {
  FESTOS_COOKIE,
  readSessionUserId,
  setFestosSessionCookie,
  clearFestosSessionCookie,
} from '../festos-session.js';

export const festosRouter = Router();

const db = () => getDb();

function normalizeEmail(e) {
  return String(e || '')
    .trim()
    .toLowerCase();
}

function isValidEmail(e) {
  const s = normalizeEmail(e);
  if (s.length < 3 || s.length > 254 || !s.includes('@')) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function publicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    createdAt: row.created_at,
  };
}

function hashInviteToken(token) {
  return crypto.createHash('sha256').update(String(token), 'utf8').digest('hex');
}

function requireFestosSession(req, res, next) {
  const id = readSessionUserId(req.cookies?.[FESTOS_COOKIE]);
  if (!id) {
    res.status(401).json({ error: 'Not signed in' });
    return;
  }
  req.festosUserId = id;
  next();
}

/** POST /api/festos/auth/register */
festosRouter.post('/auth/register', (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const password = req.body?.password;
    const displayName = String(req.body?.displayName || '').trim().slice(0, 120);
    if (!isValidEmail(email)) {
      res.status(400).json({ error: 'Valid email is required.' });
      return;
    }
    if (typeof password !== 'string' || password.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters.' });
      return;
    }
    if (displayName.length < 1) {
      res.status(400).json({ error: 'Display name is required.' });
      return;
    }
    const password_hash = hashPassword(password);
    const ins = db()
      .prepare('INSERT INTO festos_users (email, password_hash, display_name) VALUES (?, ?, ?)')
      .run(email, password_hash, displayName);
    const userId = ins.lastInsertRowid;
    const row = db().prepare('SELECT * FROM festos_users WHERE id = ?').get(userId);
    setFestosSessionCookie(res, userId);
    res.status(201).json({ user: publicUser(row) });
  } catch (e) {
    if (String(e.message || '').includes('UNIQUE')) {
      res.status(409).json({ error: 'An account with this email already exists.' });
      return;
    }
    res.status(500).json({ error: e.message || 'Registration failed' });
  }
});

/** POST /api/festos/auth/login */
festosRouter.post('/auth/login', (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const password = req.body?.password;
    if (!isValidEmail(email) || typeof password !== 'string' || password.length < 1) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }
    const row = db().prepare('SELECT * FROM festos_users WHERE email = ?').get(email);
    if (!row || !verifyPassword(password, row.password_hash)) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }
    setFestosSessionCookie(res, row.id);
    res.json({ user: publicUser(row) });
  } catch (e) {
    res.status(500).json({ error: e.message || 'Login failed' });
  }
});

/** POST /api/festos/auth/logout */
festosRouter.post('/auth/logout', (_req, res) => {
  clearFestosSessionCookie(res);
  res.json({ ok: true });
});

/** GET /api/festos/auth/me */
festosRouter.get('/auth/me', (req, res) => {
  const id = readSessionUserId(req.cookies?.[FESTOS_COOKIE]);
  if (!id) {
    res.status(401).json({ error: 'Not signed in' });
    return;
  }
  const row = db().prepare('SELECT * FROM festos_users WHERE id = ?').get(id);
  if (!row) {
    clearFestosSessionCookie(res);
    res.status(401).json({ error: 'Not signed in' });
    return;
  }
  res.json({ user: publicUser(row) });
});

festosRouter.use(requireFestosSession);

/** GET /api/festos/festivals — festivals I belong to */
festosRouter.get('/festivals', (req, res) => {
  try {
    const rows = db()
      .prepare(
        `SELECT f.id, f.name, f.created_at, f.created_by_user_id, m.role
         FROM festivals f
         INNER JOIN festival_memberships m ON m.festival_id = f.id AND m.user_id = ?
         ORDER BY f.id DESC`
      )
      .all(req.festosUserId);
    res.json({
      festivals: rows.map((r) => ({
        id: r.id,
        name: r.name,
        createdAt: r.created_at,
        createdByUserId: r.created_by_user_id,
        role: r.role,
      })),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/** POST /api/festos/festivals — create festival (you become admin) */
festosRouter.post('/festivals', (req, res) => {
  try {
    const name = String(req.body?.name || '').trim().slice(0, 200);
    if (name.length < 1) {
      res.status(400).json({ error: 'Festival name is required.' });
      return;
    }
    const uid = req.festosUserId;
    const tx = db().transaction(() => {
      const r = db().prepare('INSERT INTO festivals (name, created_by_user_id) VALUES (?, ?)').run(name, uid);
      const festivalId = r.lastInsertRowid;
      db().prepare('INSERT INTO festival_memberships (festival_id, user_id, role) VALUES (?, ?, ?)').run(
        festivalId,
        uid,
        'admin'
      );
      return festivalId;
    });
    const festivalId = tx();
    const f = db().prepare('SELECT * FROM festivals WHERE id = ?').get(festivalId);
    res.status(201).json({
      festival: {
        id: f.id,
        name: f.name,
        createdAt: f.created_at,
        createdByUserId: f.created_by_user_id,
        role: 'admin',
      },
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

function getMembership(festivalId, userId) {
  return db()
    .prepare('SELECT role FROM festival_memberships WHERE festival_id = ? AND user_id = ?')
    .get(festivalId, userId);
}

/** GET /api/festos/festivals/:id */
festosRouter.get('/festivals/:id', (req, res) => {
  try {
    const festivalId = parseInt(req.params.id, 10);
    if (Number.isNaN(festivalId)) {
      res.status(400).json({ error: 'Invalid festival' });
      return;
    }
    const mem = getMembership(festivalId, req.festosUserId);
    if (!mem) {
      res.status(404).json({ error: 'Festival not found' });
      return;
    }
    const f = db().prepare('SELECT * FROM festivals WHERE id = ?').get(festivalId);
    if (!f) {
      res.status(404).json({ error: 'Festival not found' });
      return;
    }
    res.json({
      festival: {
        id: f.id,
        name: f.name,
        createdAt: f.created_at,
        createdByUserId: f.created_by_user_id,
      },
      role: mem.role,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/** GET /api/festos/festivals/:id/members */
festosRouter.get('/festivals/:id/members', (req, res) => {
  try {
    const festivalId = parseInt(req.params.id, 10);
    if (Number.isNaN(festivalId)) {
      res.status(400).json({ error: 'Invalid festival' });
      return;
    }
    const mem = getMembership(festivalId, req.festosUserId);
    if (!mem) {
      res.status(404).json({ error: 'Festival not found' });
      return;
    }
    const rows = db()
      .prepare(
        `SELECT u.id, u.email, u.display_name, m.role, m.created_at
         FROM festival_memberships m
         INNER JOIN festos_users u ON u.id = m.user_id
         WHERE m.festival_id = ?
         ORDER BY m.role DESC, lower(u.display_name)`
      )
      .all(festivalId);
    res.json({
      members: rows.map((r) => ({
        userId: r.id,
        email: r.email,
        displayName: r.display_name,
        role: r.role,
        joinedAt: r.created_at,
      })),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/** GET /api/festos/festivals/:id/invites — pending invites (admin only) */
festosRouter.get('/festivals/:id/invites', (req, res) => {
  try {
    const festivalId = parseInt(req.params.id, 10);
    if (Number.isNaN(festivalId)) {
      res.status(400).json({ error: 'Invalid festival' });
      return;
    }
    const mem = getMembership(festivalId, req.festosUserId);
    if (!mem || mem.role !== 'admin') {
      res.status(403).json({ error: 'Only festival admins can view invites.' });
      return;
    }
    const rows = db()
      .prepare(
        `SELECT id, email, expires_at, accepted_at, created_at
         FROM festival_invites
         WHERE festival_id = ?
         ORDER BY created_at DESC`
      )
      .all(festivalId);
    res.json({
      invites: rows.map((r) => ({
        id: r.id,
        email: r.email,
        expiresAt: r.expires_at,
        acceptedAt: r.accepted_at,
        createdAt: r.created_at,
      })),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/** POST /api/festos/festivals/:id/invites — invite by email (admin only) */
festosRouter.post('/festivals/:id/invites', (req, res) => {
  try {
    const festivalId = parseInt(req.params.id, 10);
    if (Number.isNaN(festivalId)) {
      res.status(400).json({ error: 'Invalid festival' });
      return;
    }
    const mem = getMembership(festivalId, req.festosUserId);
    if (!mem || mem.role !== 'admin') {
      res.status(403).json({ error: 'Only festival admins can send invites.' });
      return;
    }
    const email = normalizeEmail(req.body?.email);
    if (!isValidEmail(email)) {
      res.status(400).json({ error: 'Valid invite email is required.' });
      return;
    }
    const existingUser = db().prepare('SELECT id FROM festos_users WHERE email = ?').get(email);
    if (existingUser) {
      const already = getMembership(festivalId, existingUser.id);
      if (already) {
        res.status(409).json({ error: 'That person is already a member of this festival.' });
        return;
      }
    }

    db.prepare(
      'DELETE FROM festival_invites WHERE festival_id = ? AND lower(email) = lower(?) AND accepted_at IS NULL'
    ).run(festivalId, email);

    const token = crypto.randomBytes(24).toString('hex');
    const token_hash = hashInviteToken(token);
    const run = db()
      .prepare(
        `INSERT INTO festival_invites (festival_id, email, token_hash, invited_by_user_id, expires_at)
         VALUES (?, ?, ?, ?, datetime('now', '+14 days'))`
      )
      .run(festivalId, email, token_hash, req.festosUserId);

    res.status(201).json({
      invite: {
        id: run.lastInsertRowid,
        email,
        expiresInDays: 14,
      },
      /** Single-use link token; share with the invitee (email delivery can be added later). */
      acceptToken: token,
      acceptPath: `/festos/invite?token=${encodeURIComponent(token)}`,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/** POST /api/festos/invites/accept — body: { token } */
festosRouter.post('/invites/accept', (req, res) => {
  try {
    const token = String(req.body?.token || '').trim();
    if (token.length < 16) {
      res.status(400).json({ error: 'Invalid invite token.' });
      return;
    }
    const token_hash = hashInviteToken(token);
    const inv = db().prepare('SELECT * FROM festival_invites WHERE token_hash = ?').get(token_hash);
    if (!inv) {
      res.status(400).json({ error: 'Unknown or expired invite.' });
      return;
    }
    if (inv.accepted_at) {
      res.status(409).json({ error: 'This invite was already used.' });
      return;
    }
    const exp = db.prepare(`SELECT datetime(?) < datetime('now') AS expired`).get(inv.expires_at);
    if (exp?.expired) {
      res.status(400).json({ error: 'This invite has expired.' });
      return;
    }
    const user = db().prepare('SELECT * FROM festos_users WHERE id = ?').get(req.festosUserId);
    if (!user || normalizeEmail(user.email) !== normalizeEmail(inv.email)) {
      res.status(403).json({
        error: 'Sign in with the email address that received the invite, then try again.',
        expectedEmail: inv.email,
      });
      return;
    }

    const tx = db().transaction(() => {
      db.prepare(
        `UPDATE festival_invites SET accepted_at = datetime('now'), accepted_user_id = ? WHERE id = ?`
      ).run(user.id, inv.id);
      db.prepare(
        `INSERT OR IGNORE INTO festival_memberships (festival_id, user_id, role) VALUES (?, ?, 'member')`
      ).run(inv.festival_id, user.id);
    });
    tx();

    const f = db().prepare('SELECT * FROM festivals WHERE id = ?').get(inv.festival_id);
    res.json({
      ok: true,
      festival: { id: f.id, name: f.name, createdAt: f.created_at, createdByUserId: f.created_by_user_id },
      role: 'member',
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

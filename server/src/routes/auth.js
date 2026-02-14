import { Router } from 'express';
import crypto from 'crypto';

const router = Router();
const COOKIE_NAME = 'planner_session';
const COOKIE_PAYLOAD = 'authenticated';

// Password and signing secret from env only (never in client). Default for dev convenience.
const PASSWORD = process.env.PLANNER_PASSWORD ?? 'joecamel';
const SECRET = process.env.PLANNER_SESSION_SECRET || process.env.PLANNER_PASSWORD || 'planner-session-secret';

function sign(value) {
  return crypto.createHmac('sha256', SECRET).update(value).digest('hex');
}

function verifySigned(signedValue) {
  if (!signedValue || typeof signedValue !== 'string') return false;
  const idx = signedValue.indexOf('.');
  if (idx === -1) return false;
  const value = signedValue.slice(0, idx);
  const sig = signedValue.slice(idx + 1);
  if (value !== COOKIE_PAYLOAD) return false;
  return crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(sign(value), 'hex'));
}

function timingSafeCompare(a, b) {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/** POST /api/auth — submit password; sets session cookie on success */
router.post('/', (req, res) => {
  const submitted = req.body?.password;
  if (typeof submitted !== 'string') {
    res.status(401).json({ error: 'Invalid request' });
    return;
  }
  if (!timingSafeCompare(submitted, PASSWORD)) {
    res.status(401).json({ error: 'Invalid password' });
    return;
  }
  const value = `${COOKIE_PAYLOAD}.${sign(COOKIE_PAYLOAD)}`;
  res.cookie(COOKIE_NAME, value, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    secure: process.env.NODE_ENV === 'production',
  });
  res.status(200).json({ ok: true });
});

/** GET /api/auth — check if session is valid */
router.get('/', (req, res) => {
  const cookie = req.cookies?.[COOKIE_NAME];
  if (!verifySigned(cookie)) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  res.status(200).json({ ok: true });
});

/** Require valid session cookie for all /api except /api/auth */
function requireAuth(req, res, next) {
  if (req.path === '/auth') return next();
  const cookie = req.cookies?.[COOKIE_NAME];
  if (!verifySigned(cookie)) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  next();
}

export { router as authRouter, requireAuth, verifySigned, COOKIE_NAME };

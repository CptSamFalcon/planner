import { Router } from 'express';

export const meRouter = Router();
const COOKIE_NAME = 'planner_member_id';
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

/** GET /api/me — return current member_id from cookie (who "I am" on this device) */
meRouter.get('/', (req, res) => {
  const raw = req.cookies?.[COOKIE_NAME];
  const memberId = raw ? parseInt(raw, 10) : null;
  res.json({ member_id: Number.isNaN(memberId) ? null : memberId });
});

/** POST /api/me — set who I am (member_id); sets cookie */
meRouter.post('/', (req, res) => {
  const memberId = req.body?.member_id;
  if (memberId == null) {
    res.clearCookie(COOKIE_NAME, { path: '/' });
    return res.json({ member_id: null });
  }
  const id = parseInt(memberId, 10);
  if (Number.isNaN(id) || id < 1) {
    return res.status(400).json({ error: 'Invalid member_id' });
  }
  res.cookie(COOKIE_NAME, String(id), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
    secure: process.env.NODE_ENV === 'production',
  });
  res.json({ member_id: id });
});

import crypto from 'crypto';

export const FESTOS_COOKIE = 'festos_session';

function sessionSecret() {
  return (
    (process.env.FESTOS_SESSION_SECRET && String(process.env.FESTOS_SESSION_SECRET).trim()) ||
    (process.env.PLANNER_SESSION_SECRET && String(process.env.PLANNER_SESSION_SECRET).trim()) ||
    'festos-dev-session-secret-change-me'
  );
}

function secureCookie() {
  return (
    process.env.PLANNER_COOKIE_SECURE === 'true' ||
    (process.env.NODE_ENV === 'production' && process.env.PLANNER_COOKIE_SECURE !== 'false')
  );
}

function sign(payload) {
  return crypto.createHmac('sha256', sessionSecret()).update(payload).digest('hex');
}

export function createSessionCookieValue(userId) {
  const issued = Date.now();
  const payload = `${userId}.${issued}`;
  return `${payload}.${sign(payload)}`;
}

/** @returns {number | null} user id */
export function readSessionUserId(rawCookie) {
  if (!rawCookie || typeof rawCookie !== 'string') return null;
  const parts = rawCookie.split('.');
  if (parts.length !== 3) return null;
  const [idStr, issuedStr, sig] = parts;
  const payload = `${idStr}.${issuedStr}`;
  const want = sign(payload);
  if (sig.length !== want.length || !crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(want, 'hex'))) {
    return null;
  }
  const issued = Number(issuedStr);
  if (!Number.isFinite(issued) || Date.now() - issued > 30 * 24 * 60 * 60 * 1000) return null;
  const id = parseInt(idStr, 10);
  return Number.isFinite(id) && id > 0 ? id : null;
}

export function setFestosSessionCookie(res, userId) {
  res.cookie(FESTOS_COOKIE, createSessionCookieValue(userId), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 30 * 24 * 60 * 60 * 1000,
    secure: secureCookie(),
  });
}

export function clearFestosSessionCookie(res) {
  res.clearCookie(FESTOS_COOKIE, { path: '/' });
}

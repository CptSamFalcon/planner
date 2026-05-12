import crypto from 'crypto';

const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const KEY_LEN = 64;

export function hashPassword(plain) {
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(String(plain), salt, KEY_LEN, SCRYPT_PARAMS);
  return `scrypt$${salt.toString('hex')}$${key.toString('hex')}`;
}

export function verifyPassword(plain, stored) {
  if (!stored || typeof stored !== 'string' || !stored.startsWith('scrypt$')) return false;
  const parts = stored.split('$');
  if (parts.length !== 3) return false;
  const [, saltHex, keyHex] = parts;
  const salt = Buffer.from(saltHex, 'hex');
  const want = Buffer.from(keyHex, 'hex');
  if (salt.length !== 16 || want.length !== KEY_LEN) return false;
  const got = crypto.scryptSync(String(plain), salt, KEY_LEN, SCRYPT_PARAMS);
  if (got.length !== want.length) return false;
  return crypto.timingSafeEqual(got, want);
}

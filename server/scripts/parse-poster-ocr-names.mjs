/**
 * Turn noisy full-poster Tesseract output into a deduped list of likely artist name strings.
 * Used by generate-lineup-poster-seed.mjs (not imported from server runtime).
 */

const JUNK_SUBSTR = [
  'STAGE TAKEOVER',
  'SILENT DISCO',
  'PRESENTED BY',
  'BROWNIES',
  'WHITE RABBIT',
  'THE GORGE',
  'WASHINGTON',
  'BASSCANYON',
  'BASS CANYON',
  'LISTENING ACTIVITIES',
  'EAR CAMP',
  'NEED 4 SWEAT',
  'NBNL STAGE',
];

export function normalizeKey(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .trim();
}

/** Drop leading OCR junk like "if p= " before "ATLIENS 0". */
function stripLeadingOcrGarbage(s) {
  const m = s.match(/[A-Z][A-Za-z0-9,'&]*(?:\s+[A-Z0-9][A-Za-z0-9,'&]*)*/);
  if (m && m.index != null && m.index > 0) {
    let t = s.slice(m.index).trim();
    t = t.replace(/\s+\d+\s*$/,'').trim();
    return t;
  }
  return s;
}

function cleanChunk(chunk) {
  let s = String(chunk).replace(/\s+/g, ' ').trim();
  s = stripLeadingOcrGarbage(s);
  s = s.replace(/^[^A-Za-z0-9(]+/, '');
  s = s.replace(/[^A-Za-z0-9)\]%.\s'-]+$/i, '');
  s = s.replace(/[=._~]+\s*$/,'').trim();
  s = s.replace(/\b(ft|feat|featuring)\b.*$/i, '').trim();
  return s.replace(/\s+/g, ' ').trim();
}

function isLikelyName(c) {
  if (!c || c.length < 3 || c.length > 72) return false;
  if (!/[A-Za-z]/.test(c)) return false;
  const letters = (c.match(/[A-Za-z]/g) || []).length;
  if (letters < 3) return false;
  if (letters / c.length < 0.35) return false;
  const up = c.toUpperCase();
  if (JUNK_SUBSTR.some((j) => up.includes(j))) return false;
  if (/^[=+\-_.\s\d°™"'«»]+$/.test(c)) return false;
  return true;
}

/** Split one OCR line into name-like fragments. */
function explodeLine(line) {
  let normalized = String(line).replace(/I!/g, ' I ');
  let parts = [normalized];
  for (const d of ['===', '==', '|', '—', '–', '−']) {
    parts = parts.flatMap((p) =>
      String(p)
        .split(d)
        .map((x) => x.trim())
        .filter(Boolean)
    );
  }
  parts = parts.flatMap((p) => p.split(/\s+I\s+/i));
  parts = parts.flatMap((p) => p.split(/\s+1\s+/));
  return parts.map(cleanChunk).filter(isLikelyName);
}

export function parsePosterOcrToNames(ocrRaw) {
  const text = String(ocrRaw || '').replace(/\r\n/g, '\n');
  const lines = text.split('\n');
  const tokens = [];
  for (const line of lines) {
    for (const t of explodeLine(line)) tokens.push(t);
  }
  const seen = new Set();
  const out = [];
  for (const t of tokens) {
    const k = normalizeKey(t);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  return out;
}

/** Avoid false positives like “ERS” → Mersiv: only exact / prefix / suffix alignment on normalized keys. */
export function matchCuratedEnrichment(ocrName, curated) {
  const na = normalizeKey(ocrName);
  if (!na || na.length < 3) return null;
  for (const c of curated) {
    const nb = normalizeKey(c.name);
    if (!nb) continue;
    if (na === nb) return c;
    if (na.length < 4 || nb.length < 4) continue;
    if (na.startsWith(nb) && na.length - nb.length <= 5) return c;
    if (nb.startsWith(na) && nb.length - na.length <= 5) return c;
  }
  return null;
}

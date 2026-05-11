/**
 * Scrapes Bandsintown.com for artist page and upcoming events.
 * No API key required. Use respectfully (rate limit requests).
 * Note: Bandsintown may return 403 (Cloudflare) from some environments; the lineup route falls back to Songkick when no events are returned.
 */

import * as cheerio from 'cheerio';

const BANDSINTOWN_BASE = 'https://www.bandsintown.com';
const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const FETCH_TIMEOUT_MS = 15000;

function fetchOpts() {
  return {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  };
}

/** Convert artist name to URL slug: "Zeds Dead" -> "zeds-dead", "Excision" -> "excision". */
function artistToSlug(name) {
  return (name || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || '';
}

const MONTH_ABBR = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };

/** Parse "Mar 27", "APR 24", "May 29 - May 31" into ISO date string (use first date of range). Returns YYYY-MM-DD or null. */
function parseDateText(text) {
  const t = (text || '').trim();
  const match = t.match(/([a-z]{3})\s+(\d{1,2})/i);
  if (!match) return null;
  const monthStr = match[1].toLowerCase().slice(0, 3);
  const month = MONTH_ABBR[monthStr];
  if (month == null) return null;
  const day = parseInt(match[2], 10);
  if (day < 1 || day > 31) return null;
  const now = new Date();
  let year = now.getFullYear();
  const d = new Date(year, month, day);
  if (d < now) year += 1;
  const d2 = new Date(year, month, day);
  return d2.toISOString().slice(0, 10);
}

/** Split link text "Ultra Music Festival 2026Miami, FL" or "ILLFest 2026Austin, TX" into title and location. */
function splitTitleLocation(text) {
  const s = (text || '').trim();
  const match = s.match(/,?\s+([A-Za-z\s]+,\s*[A-Z]{2})\s*$/);
  if (match) {
    const loc = match[1].trim();
    const idx = s.length - loc.length;
    const title = s.slice(0, idx).replace(/\s*,\s*$/, '').trim();
    return { title: title || s, location: loc };
  }
  return { title: s, location: '' };
}

/**
 * Parse artist page HTML. Returns { name, events } where events are { date, datetime, title, venue, location, url }.
 */
function parseArtistPage(html, artistSlug) {
  const $ = cheerio.load(html);
  const events = [];
  const seen = new Set();

  const titleEl = $('h1').first();
  const artistName = (titleEl.text() || '').trim() || null;

  $('a[href*="/e/"]').each((_, el) => {
    const $a = $(el);
    const href = ($a.attr('href') || '').trim();
    const match = href.match(/\/e\/(\d+)-([^/?]+)/);
    if (!match) return;
    const slug = match[2];
    if (artistSlug && !slug.startsWith(artistSlug)) return;
    const fullUrl = href.startsWith('http') ? href.split('?')[0] : `${BANDSINTOWN_BASE}${href.split('?')[0]}`;
    if (seen.has(fullUrl)) return;
    seen.add(fullUrl);

    const linkText = ($a.text() || '').replace(/\s+/g, ' ').trim();
    const { title, location } = splitTitleLocation(linkText);

    let dateStr = '';
    let datetime = '';
    const $block = $a.closest('div, li, article, section');
    const blockText = $block.length ? $block.text().replace(/\s+/g, ' ').trim() : '';
    const parsed = parseDateText(blockText);
    if (parsed) {
      dateStr = parsed;
      datetime = `${parsed}T00:00:00`;
    }

    events.push({
      date: dateStr,
      datetime,
      title: title || 'Event',
      venue: title || '',
      location,
      url: fullUrl,
    });
  });

  return { name: artistName, events };
}

/**
 * Fetch artist page and parse. Returns { name, events } or { name: null, events: [] } on failure.
 */
export async function fetchArtistEvents(artistName) {
  const slug = artistToSlug(artistName);
  if (!slug) return { name: artistName, events: [] };
  const url = `${BANDSINTOWN_BASE}/${slug}`;
  try {
    const res = await fetch(url, fetchOpts());
    if (!res.ok) return { name: artistName, events: [] };
    const html = await res.text();
    const parsed = parseArtistPage(html, slug);
    return {
      name: parsed.name || artistName,
      events: parsed.events.slice(0, 50),
    };
  } catch (_) {
    return { name: artistName, events: [] };
  }
}

/**
 * Lookup artist and upcoming events. Same shape as Songkick lookupArtistEvents.
 * Returns { name, slug: null, events }.
 */
export async function lookupArtistEvents(artistName) {
  const name = (artistName || '').trim();
  if (!name) return { name: artistName, slug: null, events: [] };
  const { name: resolvedName, events } = await fetchArtistEvents(name);
  return {
    name: resolvedName || name,
    slug: null,
    events: events || [],
  };
}

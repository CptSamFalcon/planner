/**
 * Scrapes Songkick.com for artist search and calendar events.
 * No API key required. Use respectfully (rate limit requests).
 */

import * as cheerio from 'cheerio';

const SONGKICK_BASE = 'https://www.songkick.com';
const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const FETCH_TIMEOUT_MS = 12000;

function fetchOpts() {
  return {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Connection': 'close',
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  };
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Returns true if this concert/festival href is for the given artist.
 * Songkick concert URLs: /concerts/12345-artist-name-at-venue → only keep when artist-name matches.
 * Festival URLs don't encode the artist; we keep them when no filter, or when filter is set allow them (may include noise).
 */
function eventHrefMatchesArtist(href, artistSlugFilter) {
  if (!artistSlugFilter || !href) return true;
  const path = href.split('?')[0];
  // Concert: /concerts/12345-artist-slug-at-venue (artist-slug can contain hyphens, e.g. svdden-death)
  const concertMatch = path.match(/\/concerts\/\d+-(.+?)(?:-at-|$)/);
  if (concertMatch) {
    const urlArtist = concertMatch[1].toLowerCase().replace(/\s+/g, '-');
    const filter = artistSlugFilter.toLowerCase().replace(/\s+/g, '-');
    return urlArtist === filter || urlArtist.startsWith(filter + '-') || filter.startsWith(urlArtist + '-');
  }
  // Festival links: no artist in URL; keep them so we don't miss festivals the artist plays
  return true;
}

function parseSongkickEventsFromHtml(html, { limit = 50, artistSlugFilter = null } = {}) {
  const $ = cheerio.load(html);
  const events = [];
  const seen = new Set();

  // Most reliable anchor points are: time[datetime] + a concert/festival link
  $('time[datetime]').each((_, t) => {
    const $time = $(t);
    const datetime = ($time.attr('datetime') || '').trim();
    const $container = $time.closest('li, tr, div');
    const $link = $container.find('a[href^="/concerts/"], a[href^="/festivals/"]').first();

    const href = ($link.attr('href') || '').trim();
    if (!href) return;
    if (!eventHrefMatchesArtist(href, artistSlugFilter)) return;

    const titleAttr = ($container.attr('title') || '').trim();
    const linkText = ($link.text() || '').replace(/\s+/g, ' ').trim();

    let dateStr = '';
    if (datetime) {
      const d = new Date(datetime);
      if (!Number.isNaN(d.getTime())) dateStr = d.toISOString().slice(0, 10);
    }

    const fullUrl = href.startsWith('http') ? href : `${SONGKICK_BASE}${href.split('?')[0]}`;
    const title = titleAttr || linkText || 'Event';

    // Venue/location often appear in nearby venue/metro links; fall back to the link text if we can't find it.
    const venueLinkText = ($container.find('a[href^="/venues/"]').first().text() || '').replace(/\s+/g, ' ').trim();
    const metroLinkText = ($container.find('a[href^="/metro-areas/"]').first().text() || '').replace(/\s+/g, ' ').trim();
    const venue = venueLinkText || linkText;
    const location = metroLinkText || venueLinkText || linkText;

    const key = `${fullUrl}|${datetime || dateStr}|${title}`;
    if (seen.has(key)) return;
    seen.add(key);

    events.push({
      date: dateStr,
      datetime,
      title,
      venue,
      location,
      url: fullUrl,
    });
  });

  // Second pass: find any concert/festival links we missed (e.g. different HTML structure, no time[datetime] in same container). Merge so we don't miss events like Vegas on Aug 14.
  const monthAbbr = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
  function parseDateFromText(text) {
    if (!text || typeof text !== 'string') return { dateStr: '', datetime: '' };
    const t = text.replace(/\s+/g, ' ').trim();
    const iso = t.match(/\d{4}-\d{2}-\d{2}/);
    if (iso) {
      const d = new Date(iso[0] + 'T12:00:00');
      if (!Number.isNaN(d.getTime())) return { dateStr: iso[0], datetime: iso[0] + 'T00:00:00' };
    }
    const short = t.match(/([a-z]{3})\s+(\d{1,2})/i);
    if (short) {
      const month = monthAbbr[short[1].toLowerCase().slice(0, 3)];
      if (month != null) {
        const day = parseInt(short[2], 10);
        if (day >= 1 && day <= 31) {
          const now = new Date();
          let year = now.getFullYear();
          const d = new Date(year, month, day);
          if (d < now) year += 1;
          const d2 = new Date(year, month, day);
          return { dateStr: d2.toISOString().slice(0, 10), datetime: d2.toISOString().slice(0, 19) };
        }
      }
    }
    return { dateStr: '', datetime: '' };
  }

  const seenUrls = new Set(events.map((e) => e.url));
  $('a[href^="/concerts/"], a[href^="/festivals/"]').each((_, a) => {
    const $a = $(a);
    const href = ($a.attr('href') || '').trim();
    if (!href) return;
    if (!eventHrefMatchesArtist(href, artistSlugFilter)) return;
    const fullUrl = href.startsWith('http') ? href : `${SONGKICK_BASE}${href.split('?')[0]}`;
    if (seenUrls.has(fullUrl)) return;
    seenUrls.add(fullUrl);

    const title = ($a.text() || '').replace(/\s+/g, ' ').trim() || 'Event';
    const key = `${fullUrl}|${title}`;
    if (seen.has(key)) return;
    seen.add(key);

    let dateStr = '';
    let datetime = '';
    const $container = $a.closest('li, tr, div');
    if ($container.length) {
      const $time = $container.find('time[datetime]').first();
      const dtAttr = ($time.attr('datetime') || '').trim();
      if (dtAttr) {
        const d = new Date(dtAttr);
        if (!Number.isNaN(d.getTime())) {
          dateStr = d.toISOString().slice(0, 10);
          datetime = dtAttr;
        }
      }
      if (!dateStr) {
        const parsed = parseDateFromText($container.text());
        dateStr = parsed.dateStr;
        datetime = parsed.datetime;
      }
    }

    const venueLinkText = ($container && $container.find('a[href^="/venues/"]').first().text() || '').replace(/\s+/g, ' ').trim();
    const metroLinkText = ($container && $container.find('a[href^="/metro-areas/"]').first().text() || '').replace(/\s+/g, ' ').trim();
    events.push({
      date: dateStr,
      datetime,
      title,
      venue: venueLinkText || '',
      location: metroLinkText || venueLinkText || '',
      url: fullUrl,
    });
  });

  // Sort by date so merged list is chronological; events without date go to the end
  events.sort((a, b) => {
    const da = a.datetime || a.date || '';
    const db = b.datetime || b.date || '';
    if (!da && !db) return 0;
    if (!da) return 1;
    if (!db) return -1;
    return new Date(da) - new Date(db);
  });
  return events.slice(0, limit);
}

/**
 * Search artists by query. Returns [{ name, artistId, slug }].
 * @param {string} query
 * @returns {Promise<Array<{ name: string, artistId: string, slug: string }>>}
 */
export async function searchArtists(query) {
  const q = encodeURIComponent((query || '').trim());
  if (!q) return [];
  const url = `${SONGKICK_BASE}/search?query=${q}&type=artists`;
  try {
    const res = await fetch(url, fetchOpts());
    if (!res.ok) return [];
    const html = await res.text();
    const $ = cheerio.load(html);
    const seen = new Set();
    const out = [];
    // Exclude nav/sidebar so we only get search results
    $('a[href^="/artists/"]').each((_, el) => {
      const $el = $(el);
      if ($el.closest('.navigation, .nav-bar, .sub-nav, .right-side-navbar, .local-navigation').length) return;
      const href = $el.attr('href') || '';
      const m = href.match(/^\/artists\/(\d+)-([^/?]+)/);
      if (!m) return;
      const [, id, slug] = m;
      const key = `${id}-${slug}`;
      if (seen.has(key)) return;
      const name = $el.text().trim() || slug.replace(/-/g, ' ');
      if (!name || name.length > 200) return;
      seen.add(key);
      out.push({ name, artistId: id, slug: `${id}-${slug}` });
    });
    return out.slice(0, 15);
  } catch (_) {
    return [];
  }
}

/** Minimum score to accept a match; avoids returning unrelated artists when search is ambiguous. */
const MIN_ARTIST_MATCH_SCORE = 100;

function pickBestArtistMatch(query, artists) {
  const q = (query || '').trim().toLowerCase();
  if (!q || !Array.isArray(artists) || artists.length === 0) return null;

  const norm = (s) =>
    (s || '')
      .toLowerCase()
      .replace(/&/g, 'and')
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

  const nq = norm(q);
  let best = null;
  let bestScore = -1;
  for (const a of artists) {
    const n = norm(a?.name);
    if (!n) continue;

    // Higher is better
    let score = 0;
    if (n === nq) score += 1000;
    else if (n.startsWith(nq)) score += 400;
    else if (nq.startsWith(n)) score += 350;
    else if (n.includes(nq)) score += 200;

    // Prefer shorter names when tied (closer to query)
    score -= Math.min(100, Math.abs(n.length - nq.length));

    if (score > bestScore) {
      bestScore = score;
      best = a;
    }
  }
  if (best == null || bestScore < MIN_ARTIST_MATCH_SCORE) return null;
  return best;
}

/** Extract name part from artist slug for URL matching: "103426-excision" -> "excision". */
function artistNameFromSlug(slug) {
  const s = (slug || '').trim();
  const m = s.match(/^\d+-(.+)$/);
  return m ? m[1] : null;
}

/**
 * Get upcoming events for an artist by Songkick artist slug (e.g. "103426-excision").
 * Only includes events whose concert URL is for this artist (filters out other artists on the same page).
 * @param {string} artistSlug - e.g. "103426-excision"
 * @returns {Promise<Array<{ date: string, datetime: string, title: string, venue: string, location: string, url: string }>>}
 */
export async function getArtistEvents(artistSlug) {
  const slug = (artistSlug || '').trim().replace(/^\/+|\?.*$/, '');
  if (!slug || !/^\d+-[\w-]+$/.test(slug)) return [];
  const url = `${SONGKICK_BASE}/artists/${slug}/calendar`;
  try {
    const res = await fetch(url, fetchOpts());
    if (!res.ok) return [];
    const html = await res.text();
    const namePart = artistNameFromSlug(slug);
    return parseSongkickEventsFromHtml(html, { limit: 50, artistSlugFilter: namePart });
  } catch (_) {
    return [];
  }
}

/**
 * Get past events (gigography) for an artist by slug. Same shape as getArtistEvents.
 * @param {string} artistSlug - e.g. "103426-excision"
 * @param {number} page - 1-based page number
 * @returns {Promise<Array<{ date: string, datetime: string, title: string, venue: string, location: string, url: string }>>}
 */
export async function getArtistPastEvents(artistSlug, page = 1) {
  const slug = (artistSlug || '').trim().replace(/^\/+|\?.*$/, '');
  if (!slug || !/^\d+-[\w-]+$/.test(slug)) return [];
  const p = Number(page);
  const url = p > 1
    ? `${SONGKICK_BASE}/artists/${slug}/gigography?page=${p}`
    : `${SONGKICK_BASE}/artists/${slug}/gigography`;
  try {
    const res = await fetch(url, fetchOpts());
    if (!res.ok) return [];
    const html = await res.text();
    return parseSongkickEventsFromHtml(html, { limit: 250 });
  } catch (_) {
    return [];
  }
}

/**
 * Resolve artist name to first Songkick match, then return events and slug.
 * @param {string} artistName
 * @returns {Promise<{ name: string, slug: string | null, events: Array }>}
 */
export async function lookupArtistEvents(artistName) {
  const name = (artistName || '').trim();
  if (!name) return { name: artistName, slug: null, events: [] };
  const artists = await searchArtists(name);
  const first = pickBestArtistMatch(name, artists);
  if (!first) return { name: artistName, slug: null, events: [] };
  await delay(400);
  const events = await getArtistEvents(first.slug);
  return { name: first.name, slug: first.slug, events };
}

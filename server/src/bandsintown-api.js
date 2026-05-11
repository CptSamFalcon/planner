/**
 * Bandsintown REST API client for artist info and events.
 * Requires app_id (set BANDSINTOWN_APP_ID env var or pass to functions).
 * Docs: https://help.artists.bandsintown.com/en/articles/9186477-api-documentation
 */

const BANDSINTOWN_BASE = 'https://rest.bandsintown.com';
const FETCH_TIMEOUT_MS = 12000;

function getAppId() {
  return process.env.BANDSINTOWN_APP_ID || '';
}

/**
 * Encode artist name for path. Bandsintown: / → %252F, ? → %253F, * → %252A, " → %27C.
 * We use encodeURIComponent and then double-encode / and ? if needed.
 */
function encodeArtistName(name) {
  const s = (name || '').trim();
  if (!s) return '';
  return encodeURIComponent(s)
    .replace(/%2F/g, '%252F')
    .replace(/%3F/g, '%253F')
    .replace(/%2A/g, '%252A')
    .replace(/"/g, '%27C');
}

function fetchOpts() {
  return {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'BassCanyonPlanner/1.0',
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  };
}

/**
 * Get artist info by name. Returns { name, image_url, url, ... } or null if not found.
 */
export async function getArtist(artistName, appId = null) {
  const id = appId || getAppId();
  if (!id) return null;
  const encoded = encodeArtistName(artistName);
  if (!encoded) return null;
  const url = `${BANDSINTOWN_BASE}/artists/${encoded}?app_id=${encodeURIComponent(id)}`;
  try {
    const res = await fetch(url, fetchOpts());
    if (!res.ok) return null;
    const data = await res.json();
    return {
      name: data.name || artistName,
      image_url: data.image_url || data.thumb_url || null,
      url: data.url || null,
      id: data.id,
      tracker_count: data.tracker_count,
      upcoming_event_count: data.upcoming_event_count,
    };
  } catch (_) {
    return null;
  }
}

/**
 * Normalize Bandsintown event to our shape: { date, datetime, title, venue, location, url }.
 */
function normalizeEvent(ev, artistName) {
  const datetime = (ev.datetime || '').trim();
  let dateStr = '';
  if (datetime) {
    const d = new Date(datetime);
    if (!Number.isNaN(d.getTime())) dateStr = d.toISOString().slice(0, 10);
  }
  const venue = ev.venue || {};
  const venueName = (venue.name || '').trim();
  const city = (venue.city || '').trim();
  const region = (venue.region || '').trim();
  const country = (venue.country || '').trim();
  const location = [city, region, country].filter(Boolean).join(', ') || venueName;
  const title = (ev.title || (artistName && venueName ? `${artistName} at ${venueName}` : venueName) || 'Event').trim();
  return {
    date: dateStr,
    datetime,
    title: title || 'Event',
    venue: venueName,
    location: location || venueName,
    url: (ev.url || '').trim() || null,
  };
}

/**
 * Get events for an artist. dateFilter: 'upcoming' | 'past' | 'all' or date range 'YYYY-MM-DD,YYYY-MM-DD'.
 * Returns array of { date, datetime, title, venue, location, url }.
 */
export async function getArtistEvents(artistName, { date = 'upcoming', appId = null } = {}) {
  const id = appId || getAppId();
  if (!id) return [];
  const encoded = encodeArtistName(artistName);
  if (!encoded) return [];
  const params = new URLSearchParams({ app_id: id });
  if (date) params.set('date', date);
  const url = `${BANDSINTOWN_BASE}/artists/${encoded}/events?${params.toString()}`;
  try {
    const res = await fetch(url, fetchOpts());
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    return data.map((ev) => normalizeEvent(ev, artistName)).slice(0, 50);
  } catch (_) {
    return [];
  }
}

/**
 * Lookup artist and their upcoming events in one call. Same shape as Songkick lookupArtistEvents.
 * Returns { name, slug: null, events } (no slug for BIT; events are upcoming only by default).
 */
export async function lookupArtistEvents(artistName, { date = 'upcoming', appId = null } = {}) {
  const name = (artistName || '').trim();
  if (!name) return { name: artistName, slug: null, events: [] };
  const id = appId || getAppId();
  if (!id) return { name: artistName, slug: null, events: [] };

  const artist = await getArtist(name, id);
  if (!artist) return { name: artistName, slug: null, events: [] };

  const events = await getArtistEvents(artist.name, { date, appId: id });
  return {
    name: artist.name,
    slug: null,
    events,
  };
}

/**
 * Get past events for an artist (for "played at Bass Canyon" fallback when DB has no rows).
 */
export async function getArtistPastEvents(artistName, appId = null) {
  return getArtistEvents(artistName, { date: 'past', appId });
}

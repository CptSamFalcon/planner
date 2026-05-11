import { useEffect, useMemo, useState } from 'react';
import { getBassCanyon2026Lineup, LINEUP_OFFICIAL_URL, LINEUP_POSTER_IMAGE } from '../data/bassCanyon2026Lineup';

function formatTagLabel(slug) {
  if (slug === 'b2b') return 'B2B';
  return String(slug || '')
    .split('-')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function listenLinks(artist) {
  const out = [];
  if (artist.deezerId) {
    out.push({ label: 'Deezer', href: `https://www.deezer.com/en/artist/${artist.deezerId}` });
  }
  out.push({
    label: 'Spotify',
    href: `https://open.spotify.com/search/${encodeURIComponent(artist.name)}`,
  });
  out.push({
    label: 'YouTube',
    href: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${artist.name} live DJ`)}`,
  });
  return out;
}

export function ArtistBios({ api }) {
  const fallbackArtists = useMemo(() => getBassCanyon2026Lineup(), []);
  const [artists, setArtists] = useState(fallbackArtists);
  const [posterMeta, setPosterMeta] = useState(null);
  /** 'bundled' = showing local data; 'api' = replaced from SQLite; 'api-failed' = fetch or non-OK response */
  const [source, setSource] = useState('bundled');
  const [activeFilterTags, setActiveFilterTags] = useState([]);
  const [quickPickTag, setQuickPickTag] = useState('');

  useEffect(() => {
    if (!api) return;
    let cancelled = false;
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), 12000);
    fetch(`${api}/lineup/artists`, { credentials: 'include', signal: ac.signal })
      .then(async (r) => {
        if (!r.ok) return null;
        return r.json();
      })
      .then((data) => {
        if (cancelled) return;
        if (data && Array.isArray(data.artists) && data.artists.length > 0) {
          setArtists(data.artists);
          setPosterMeta(data.poster || null);
          setSource('api');
        } else {
          setArtists(fallbackArtists);
          setPosterMeta(null);
          setSource('api-failed');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setArtists(fallbackArtists);
          setPosterMeta(null);
          setSource('api-failed');
        }
      })
      .finally(() => clearTimeout(t));
    return () => {
      cancelled = true;
      clearTimeout(t);
      ac.abort();
    };
  }, [api, fallbackArtists]);

  const allTags = useMemo(() => {
    const s = new Set();
    for (const a of artists) {
      for (const t of a.tags || []) s.add(t);
    }
    return [...s].sort();
  }, [artists]);

  const filteredArtists = useMemo(() => {
    if (activeFilterTags.length === 0) return artists;
    const need = new Set(activeFilterTags);
    return artists.filter((a) => {
      const set = new Set(a.tags || []);
      for (const t of need) {
        if (set.has(t)) return true;
      }
      return false;
    });
  }, [artists, activeFilterTags]);

  const toggleFilter = (tag) => {
    setActiveFilterTags((prev) => (prev.includes(tag) ? prev.filter((x) => x !== tag) : [...prev, tag]));
  };

  const availableQuickTags = useMemo(
    () => allTags.filter((tag) => !activeFilterTags.includes(tag)),
    [allTags, activeFilterTags]
  );

  const addFilterTag = (tag) => {
    if (!tag) return;
    setActiveFilterTags((prev) => (prev.includes(tag) ? prev : [...prev, tag]));
    setQuickPickTag('');
  };

  return (
    <section className="section section-artist-bios">
      <div className="card block artist-bios-card">
        <h3 className="card-title">Artist bios + music sampler</h3>
        <p className="card-description">
          Scroll the lineup, filter by genre tags, and open music links. When the planner API is available, rows come
          from SQLite seeded from your manually confirmed lineup list. Otherwise this tab uses the bundled lineup file.
        </p>
        {source === 'api-failed' && (
          <p className="artist-bios-empty">
            Lineup API unavailable (start the server on port 3080 for Vite proxy, or use the production build). Showing
            bundled data.
          </p>
        )}
        {source === 'api' && posterMeta?.generatedAt && (
          <p className="artist-bios-subline">
            Database lineup synced {new Date(posterMeta.generatedAt).toLocaleString()}.
          </p>
        )}
        <div className="artist-bios-poster-row">
          <a
            href={LINEUP_OFFICIAL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="artist-bios-poster-link"
            data-retro-tip="Open official lineup page"
            data-status-tip="Bass Canyon official lineup"
          >
            <img
              src={LINEUP_POSTER_IMAGE}
              alt="Bass Canyon 2026 lineup poster"
              className="artist-bios-poster-thumb"
              width={200}
              height={250}
              loading="lazy"
              decoding="async"
            />
            <span>Official lineup poster →</span>
          </a>
          <p className="artist-bios-subline artist-bios-subline--inline">
            <a href={LINEUP_OFFICIAL_URL} target="_blank" rel="noopener noreferrer">
              basscanyon.com/lineup
            </a>
          </p>
        </div>

        {allTags.length > 0 && (
          <div className="photo-tag-filter artist-bio-genre-filter" role="group" aria-label="Filter by genre">
            <div className="photo-tag-filter-head">
              <span className="photo-tag-filter-label">Show artists that match any selected genre</span>
              {activeFilterTags.length > 0 && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setActiveFilterTags([])}>
                  Clear filters
                </button>
              )}
            </div>
            <div className="photo-tag-quick">
              <span className="photo-tag-quick-label">Quick filter (mobile-friendly)</span>
              <div className="photo-tag-quick-controls">
                <select
                  className="select"
                  value={quickPickTag}
                  onChange={(e) => setQuickPickTag(e.target.value)}
                  aria-label="Pick a genre to filter"
                >
                  <option value="">Pick a genre…</option>
                  {availableQuickTags.map((tag) => (
                    <option key={tag} value={tag}>
                      {formatTagLabel(tag)}
                    </option>
                  ))}
                </select>
                <button type="button" className="btn btn-secondary btn-sm" disabled={!quickPickTag} onClick={() => addFilterTag(quickPickTag)}>
                  Add
                </button>
              </div>
            </div>
            {activeFilterTags.length > 0 && (
              <div className="photo-tag-active-row" aria-label="Active genre filters">
                {activeFilterTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className="photo-tag-toggle is-on"
                    onClick={() => toggleFilter(tag)}
                    data-retro-tip={`Remove “${formatTagLabel(tag)}”`}
                    data-status-tip="Remove this genre filter"
                  >
                    {formatTagLabel(tag)} ×
                  </button>
                ))}
              </div>
            )}
            <div className="photo-tag-toggle-row">
              {allTags.map((tag) => {
                const on = activeFilterTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    className={`photo-tag-toggle${on ? ' is-on' : ''}`}
                    onClick={() => toggleFilter(tag)}
                    data-retro-tip={on ? `Remove ${formatTagLabel(tag)}` : `Filter by ${formatTagLabel(tag)}`}
                    data-status-tip={on ? 'Click to deselect' : 'Click to filter by this genre'}
                  >
                    {formatTagLabel(tag)}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="artist-bio-list">
            {filteredArtists.map((artist) => (
              <article key={artist.id != null ? String(artist.id) : artist.name} className="artist-bio-item">
                <div className="artist-bio-media">
                  {artist.image ? (
                    <img
                      src={artist.image}
                      alt={artist.name}
                      className="artist-bio-img"
                      width={480}
                      height={480}
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <div className="artist-bio-img artist-bio-img--placeholder" aria-hidden>
                      ?
                    </div>
                  )}
                </div>
                <div className="artist-bio-body">
                  <div className="artist-bio-head">
                    <h4 className="artist-bio-name">{artist.name}</h4>
                  </div>
                  <div className="artist-bio-tags" aria-label="Genres">
                    {(artist.tags || []).map((tag) => (
                      <span key={tag} className="artist-bio-tag-pill">
                        {formatTagLabel(tag)}
                      </span>
                    ))}
                  </div>
                  <p className="artist-bio-text">{artist.bio}</p>
                  <div className="artist-bio-links">
                    {listenLinks(artist).map((t) => (
                      <a
                        key={t.label + t.href}
                        href={t.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary btn-sm"
                        data-retro-tip={`Open ${artist.name} on ${t.label}`}
                        data-status-tip={`${artist.name}: ${t.label}`}
                      >
                        {t.label}
                      </a>
                    ))}
                  </div>
                </div>
              </article>
            ))}
        </div>

        {filteredArtists.length === 0 && (
          <p className="artist-bios-empty">No artists match these genres. Clear filters or pick different tags.</p>
        )}
      </div>
    </section>
  );
}

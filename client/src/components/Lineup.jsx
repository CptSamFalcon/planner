import { useState, useEffect, useRef } from 'react';

const BC_DATES = 'Aug 12–16, 2026';
const SEARCH_DEBOUNCE_MS = 300;

// 3 main festival days for availability
const BC_DAYS = [
  { date: '2026-08-14', label: 'Aug 14' },
  { date: '2026-08-15', label: 'Aug 15' },
  { date: '2026-08-16', label: 'Aug 16' },
];

function getEventDateStr(ev) {
  if (ev.date && /^\d{4}-\d{2}-\d{2}/.test(ev.date)) return ev.date.slice(0, 10);
  if (ev.datetime) return ev.datetime.slice(0, 10);
  return null;
}

function formatEventDate(ev) {
  const raw = ev.date || (ev.datetime && ev.datetime.slice(0, 10));
  if (!raw || !/^\d{4}-\d{2}-\d{2}/.test(raw)) return '—';
  const d = new Date(raw + 'T12:00:00');
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function getEventsOnDate(events, dateStr) {
  if (!events || !dateStr) return [];
  return events.filter((ev) => getEventDateStr(ev) === dateStr);
}
const MIN_QUERY_LENGTH = 2;

export function Lineup({ api }) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef(null);
  const wrapperRef = useRef(null);

  // Debounced artist search for autocomplete
  useEffect(() => {
    const q = query.trim();
    if (q.length < MIN_QUERY_LENGTH) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearching(true);
      fetch(`${api}/lineup/search?q=${encodeURIComponent(q)}`, { credentials: 'include' })
        .then((r) => (r.ok ? r.json() : []))
        .then((data) => {
          const list = Array.isArray(data) ? data : [];
          setSuggestions(list);
          setShowSuggestions(true);
        })
        .catch(() => { setSuggestions([]); setShowSuggestions(true); })
        .finally(() => { setSearching(false); });
      debounceRef.current = null;
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [api, query]);

  // Click outside to close suggestions
  useEffect(() => {
    const handleClick = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setShowSuggestions(false);
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const doLookup = (artistName) => {
    const q = (artistName ?? query).trim();
    if (!q) return;
    setError(null);
    setResult(null);
    setShowSuggestions(false);
    setSuggestions([]);
    setLoading(true);
    fetch(`${api}/lineup/lookup?q=${encodeURIComponent(q)}`, { credentials: 'include' })
      .then((r) => { if (!r.ok) throw new Error('Lookup failed'); return r.json(); })
      .then((data) => {
        setResult(data);
        setQuery(data.name);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Lookup failed');
        setLoading(false);
      });
  };

  const selectSuggestion = (artist) => {
    setQuery(artist.name);
    setShowSuggestions(false);
    setSuggestions([]);
    doLookup(artist.name);
  };

  return (
    <section className="section section-lineup">
      <div className="card block lineup-card">
        <h3 className="card-title">Conflictotron</h3>
        <p className="card-description">
          Look up artists to see if their tour dates overlap with Bass Canyon ({BC_DATES}). Tour dates from Bandsintown or Songkick; past Bass Canyon from our database and Songkick. You can also check <a href="https://edmtrain.com/tours" target="_blank" rel="noopener noreferrer">Edmtrain</a> for another source of EDM tour schedules.
        </p>

        <div className="lineup-search-row" ref={wrapperRef}>
          <div className="lineup-search-wrap">
            <input
              type="text"
              className="input lineup-search-input"
              placeholder="Start typing artist or DJ name…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (showSuggestions && suggestions.length > 0) {
                    selectSuggestion(suggestions[0]);
                  } else {
                    doLookup();
                  }
                }
              }}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              aria-label="Artist name"
              aria-autocomplete="list"
              aria-expanded={showSuggestions && suggestions.length > 0}
              aria-controls="lineup-suggestions-list"
            />
            {showSuggestions && (suggestions.length > 0 || !searching) && (
              <ul
                id="lineup-suggestions-list"
                className="lineup-suggestions-list"
                role="listbox"
              >
                {suggestions.length > 0 ? (
                  suggestions.map((artist, i) => (
                    <li
                      key={`${artist.name}-${i}`}
                      role="option"
                      className="lineup-suggestion-item"
                      onClick={() => selectSuggestion(artist)}
                    >
                      {artist.image_url && (
                        <img src={artist.image_url} alt="" className="lineup-suggestion-img" width={32} height={32} />
                      )}
                      <span className="lineup-suggestion-name">{artist.name}</span>
                    </li>
                  ))
                ) : (
                    <li className="lineup-suggestion-item lineup-suggestion-empty" role="option">
                    No suggestions found. Try a different spelling or click Look up.
                  </li>
                )}
              </ul>
            )}
            {searching && query.trim().length >= MIN_QUERY_LENGTH && (
              <span className="lineup-search-status" aria-live="polite">Searching…</span>
            )}
          </div>
          <button type="button" className="btn btn-primary lineup-search-btn" onClick={() => doLookup()} disabled={loading || !query.trim()}>
            {loading ? 'Looking up…' : 'Look up'}
          </button>
        </div>

        {error && <p className="lineup-error" role="alert">{error}</p>}

        {result && (
          <div className="lineup-result">
            <div className="lineup-result-header">
              <h4 className="lineup-result-name">{result.name}</h4>
              <div className="lineup-result-links">
                {result.bandsintownArtistUrl && (
                  <a href={result.bandsintownArtistUrl} target="_blank" rel="noopener noreferrer" className="lineup-event-link">
                    View on Bandsintown
                  </a>
                )}
                {result.edmtrainArtistUrl && (
                  <a href={result.edmtrainArtistUrl} target="_blank" rel="noopener noreferrer" className="lineup-event-link">
                    View on Edmtrain
                  </a>
                )}
              </div>
            </div>

            <div className="lineup-days-card">
              <h5 className="lineup-days-title">Can they be at Bass Canyon?</h5>
              <p className="lineup-days-subtitle">For each festival day: free = possible; booked = conflict.</p>
              <ul className="lineup-days-list" role="list">
                {BC_DAYS.map((day) => {
                  const eventsOnDay = getEventsOnDate(result.events || [], day.date);
                  const atBassCanyon = eventsOnDay.filter((ev) => ev.isBassCanyon);
                  const conflictingEvents = eventsOnDay.filter((ev) => ev.conflicts);
                  const confirmed = atBassCanyon.length > 0 && conflictingEvents.length === 0;
                  const possible = eventsOnDay.length === 0;
                  const conflict = conflictingEvents.length > 0;
                  const rowClass = confirmed
                    ? 'lineup-day-row--confirmed'
                    : conflict
                      ? 'lineup-day-row--conflict'
                      : 'lineup-day-row--possible';
                  return (
                    <li key={day.date} className={`lineup-day-row ${rowClass}`}>
                      <span className="lineup-day-label">{day.label}</span>
                      {confirmed ? (
                        <span className="lineup-day-confirmed" role="status">
                          <span className="lineup-day-icon lineup-day-icon--confirmed" aria-hidden>✓</span> At Bass Canyon
                        </span>
                      ) : possible ? (
                        <span className="lineup-day-possible" role="status">
                          <span className="lineup-day-icon" aria-hidden>✓</span> Possible
                        </span>
                      ) : (
                        <span className="lineup-day-conflict" role="status">
                          <span className="lineup-day-icon lineup-day-icon--conflict" aria-hidden>✗</span> Conflict
                          <span className="lineup-day-conflict-events">
                            {conflictingEvents.map((ev) => ev.title || 'Event').join(' · ')}
                          </span>
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="lineup-result-section">
              <strong>Played Bass Canyon:</strong>{' '}
              {result.playedBC && result.playedBC.length > 0 ? (
                <>
                  <span className="lineup-bc-count">
                    {result.playedBC.length} time{result.playedBC.length !== 1 ? 's' : ''}
                  </span>
                  {' '}({result.playedBC.slice().sort((a, b) => b - a).join(', ')})
                </>
              ) : (
                <span className="lineup-bc-none">No past shows found</span>
              )}
            </div>

            <div className="lineup-events-section">
              <strong>Tour dates / events</strong>
              {result.hasConflict && (
                <span className="lineup-conflict-badge" role="status">Has conflict with Bass Canyon dates</span>
              )}
              {(!result.events || result.events.length === 0) && result.eventsSource === 'songkick' && (
                <p className="lineup-hint">
                  Tour dates are from Bandsintown first, then Songkick. If none appear, the artist may have no upcoming shows listed.
                </p>
              )}
              {!result.events || result.events.length === 0 ? (
                <p className="lineup-no-events">No upcoming events found.</p>
              ) : (
                <ul className="lineup-events-list">
                  {result.events.map((ev) => (
                    <li key={ev.id || ev.datetime || ev.title} className={`lineup-event-item ${ev.conflicts ? 'lineup-event-item--conflict' : ''} ${ev.isBassCanyon ? 'lineup-event-item--bass-canyon' : ''}`}>
                      <span className="lineup-event-date">{formatEventDate(ev)}</span>
                      <span className="lineup-event-title">{ev.title}</span>
                      {ev.venue && <span className="lineup-event-venue">{ev.venue}</span>}
                      {ev.location && <span className="lineup-event-location">{ev.location}</span>}
                      {ev.isBassCanyon && <span className="lineup-event-bc-tag">Bass Canyon</span>}
                      {ev.conflicts && <span className="lineup-event-conflict-tag">Conflicts with BC</span>}
                      {ev.url && (
                        <a href={ev.url} target="_blank" rel="noopener noreferrer" className="lineup-event-link">
                          Tickets{result.eventsSource ? ` (${result.eventsSource === 'bandsintown' ? 'Bandsintown' : 'Songkick'})` : ''}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {!result && !loading && !error && (
          <p className="lineup-hint">Enter an artist name and click Look up to check their bookings and past Bass Canyon appearances.</p>
        )}
      </div>
    </section>
  );
}

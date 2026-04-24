import { useState, useEffect } from 'react';

const GEORGE_WA = { lat: 47.0827, lng: -119.9702 };
const OPEN_METEO = 'https://api.open-meteo.com/v1/forecast';
const FORECAST_DAYS = 7;

const FESTIVAL_NOTES = {
  '2026-08-13': 'Pre-Party',
  '2026-08-14': 'Fest',
  '2026-08-15': 'Fest',
  '2026-08-16': 'Fest',
};

function parseIsoDate(isoDate) {
  const parts = isoDate.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null;
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function formatDayParts(isoDate) {
  const dt = parseIsoDate(isoDate);
  if (!dt) return { dow: isoDate, md: '' };
  return {
    dow: dt.toLocaleDateString('en-US', { weekday: 'short' }),
    md: dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  };
}

function weatherCodeToLabel(code) {
  if (code == null) return '—';
  const c = Number(code);
  if (c === 0) return 'Clear';
  if (c >= 1 && c <= 3) return c <= 1 ? 'Mostly clear' : c === 2 ? 'Partly cloudy' : 'Overcast';
  if (c === 45 || c === 48) return 'Fog';
  if (c >= 51 && c <= 57) return 'Drizzle';
  if (c >= 61 && c <= 67) return 'Rain';
  if (c >= 71 && c <= 77) return 'Snow';
  if (c >= 80 && c <= 82) return 'Showers';
  if (c >= 85 && c <= 86) return 'Snow showers';
  if (c >= 95 && c <= 99) return 'T-storms';
  return 'Cloudy';
}

function weatherCodeToIcon(code) {
  if (code == null) return '—';
  const c = Number(code);
  if (c === 0) return '☀️';
  if (c === 1) return '🌤️';
  if (c === 2) return '⛅';
  if (c === 3) return '☁️';
  if (c === 45 || c === 48) return '🌫️';
  if (c >= 51 && c <= 57) return '🌦️';
  if (c >= 61 && c <= 67) return '🌧️';
  if (c >= 71 && c <= 77) return '🌨️';
  if (c >= 80 && c <= 82) return '🌧️';
  if (c >= 85 && c <= 86) return '🌨️';
  if (c >= 95 && c <= 99) return '⛈️';
  return '☁️';
}

function WeatherHeader() {
  return (
    <div className="weather-head">
      <div className="weather-head-text">
        <h3 className="weather-title">7-day outlook</h3>
        <p className="weather-sub">George, WA · near The Gorge · US Pacific</p>
      </div>
      <span className="weather-chip">Open-Meteo</span>
    </div>
  );
}

export function WeatherWidget() {
  const [daily, setDaily] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const url = new URL(OPEN_METEO);
    url.searchParams.set('latitude', GEORGE_WA.lat);
    url.searchParams.set('longitude', GEORGE_WA.lng);
    url.searchParams.set('timezone', 'America/Los_Angeles');
    url.searchParams.set('forecast_days', String(FORECAST_DAYS));
    url.searchParams.set('daily', 'temperature_2m_max,temperature_2m_min,weathercode,precipitation_sum');
    url.searchParams.set('temperature_unit', 'fahrenheit');
    url.searchParams.set('precipitation_unit', 'inch');

    fetch(url.toString())
      .then((r) => {
        if (!r.ok) throw new Error('Weather unavailable');
        return r.json();
      })
      .then((data) => {
        const d = data.daily;
        if (d && d.time && d.time.length) {
          setDaily({
            time: d.time,
            max: d.temperature_2m_max ?? [],
            min: d.temperature_2m_min ?? [],
            weathercode: d.weathercode ?? [],
            precipitation_sum: d.precipitation_sum ?? [],
          });
        } else {
          setError('No forecast data');
        }
      })
      .catch((err) => setError(err.message || 'Could not load weather'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <section className="section section-weather">
        <div className="weather-shell card block">
          <div className="weather-shell-glow" aria-hidden />
          <WeatherHeader />
          <div className="weather-skeleton" aria-hidden>
            {Array.from({ length: FORECAST_DAYS }, (_, i) => (
              <div key={i} className="weather-skeleton-pill" />
            ))}
          </div>
          <p className="weather-widget-loading">Pulling forecast…</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="section section-weather">
        <div className="weather-shell card block">
          <div className="weather-shell-glow" aria-hidden />
          <WeatherHeader />
          <p className="weather-widget-error">{error}</p>
        </div>
      </section>
    );
  }

  if (!daily?.time?.length) {
    return (
      <section className="section section-weather">
        <div className="weather-shell card block">
          <div className="weather-shell-glow" aria-hidden />
          <WeatherHeader />
          <p className="weather-widget-error">No forecast data</p>
        </div>
      </section>
    );
  }

  return (
    <section className="section section-weather">
      <div className="weather-shell card block">
        <div className="weather-shell-glow" aria-hidden />
        <WeatherHeader />
        <ul className="weather-strip" role="list">
          {daily.time.map((date, i) => {
            const { dow, md } = formatDayParts(date);
            const fest = FESTIVAL_NOTES[date];
            const code = daily.weathercode[i];
            const hi = daily.max[i];
            const lo = daily.min[i];
            const precip = daily.precipitation_sum?.[i];
            const isToday = i === 0;
            return (
              <li
                key={date}
                className={`weather-pill${fest ? ' weather-pill--fest' : ''}${isToday ? ' weather-pill--today' : ''}`}
              >
                {isToday && <span className="weather-pill-today-tag">Today</span>}
                <span className="weather-pill-icon" title={weatherCodeToLabel(code)}>
                  {weatherCodeToIcon(code)}
                </span>
                <span className="weather-pill-dow">{dow}</span>
                <span className="weather-pill-date">{md}</span>
                {fest && <span className="weather-pill-fest">{fest}</span>}
                <span className="weather-pill-cond">{weatherCodeToLabel(code)}</span>
                <div className="weather-pill-temps">
                  <span className="weather-pill-lo">{lo != null ? `${Math.round(lo)}°` : '—'}</span>
                  <span className="weather-pill-bar" aria-hidden />
                  <span className="weather-pill-hi">{hi != null ? `${Math.round(hi)}°` : '—'}</span>
                </div>
                {precip != null && precip > 0 && (
                  <span className="weather-pill-rain">{precip.toFixed(1)}″ rain</span>
                )}
              </li>
            );
          })}
        </ul>
        <p className="weather-foot">Daily model — not for emergency use.</p>
      </div>
    </section>
  );
}

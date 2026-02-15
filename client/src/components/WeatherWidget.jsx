import { useState, useEffect } from 'react';

const GEORGE_WA = { lat: 47.0827, lng: -119.9702 };
const FEST_START = '2026-08-13';
const FEST_END = '2026-08-16';
const OPEN_METEO = 'https://api.open-meteo.com/v1/forecast';
const FORECAST_DAYS_MAX = 16; // Open-Meteo free forecast limit

const DAY_LABELS = {
  [FEST_START]: 'Aug 13 (Pre-Party)',
  '2026-08-14': 'Aug 14',
  '2026-08-15': 'Aug 15',
  '2026-08-16': 'Aug 16',
};

function weatherCodeToLabel(code) {
  if (code == null) return '—';
  const c = Number(code);
  if (c === 0) return 'Clear';
  if (c >= 1 && c <= 3) return 'Partly cloudy';
  if (c === 45 || c === 48) return 'Foggy';
  if (c >= 51 && c <= 67) return 'Rain';
  if (c >= 71 && c <= 77) return 'Snow';
  if (c >= 80 && c <= 82) return 'Showers';
  if (c >= 85 && c <= 86) return 'Snow showers';
  if (c >= 95 && c <= 99) return 'Thunderstorms';
  return 'Cloudy';
}

export function WeatherWidget() {
  const [daily, setDaily] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const now = new Date();
    const festStart = new Date(FEST_START);
    const daysUntil = Math.ceil((festStart - now) / 86400000);
    if (daysUntil > FORECAST_DAYS_MAX) {
      setLoading(false);
      setError(null);
      setDaily('too_far');
      return;
    }

    const url = new URL(OPEN_METEO);
    url.searchParams.set('latitude', GEORGE_WA.lat);
    url.searchParams.set('longitude', GEORGE_WA.lng);
    url.searchParams.set('timezone', 'America/Los_Angeles');
    url.searchParams.set('start_date', FEST_START);
    url.searchParams.set('end_date', FEST_END);
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
        <div className="card block weather-widget">
          <h3 className="card-title">Festival weather — George, WA</h3>
          <p className="weather-widget-loading">Loading forecast…</p>
        </div>
      </section>
    );
  }

  if (daily === 'too_far') {
    return (
      <section className="section section-weather">
        <div className="card block weather-widget">
          <h3 className="card-title">Festival weather — George, WA</h3>
          <p className="card-description">Forecast for The Gorge (Aug 13–16).</p>
          <p className="weather-widget-placeholder">Check back within two weeks of the festival for the forecast.</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="section section-weather">
        <div className="card block weather-widget">
          <h3 className="card-title">Festival weather — George, WA</h3>
          <p className="weather-widget-error">{error}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="section section-weather">
      <div className="card block weather-widget">
        <h3 className="card-title">Festival weather — George, WA</h3>
        <p className="card-description">Forecast for The Gorge (Aug 13–16). Check again closer to the dates.</p>
        <ul className="weather-days" role="list">
          {daily.time.map((date, i) => (
            <li key={date} className="weather-day">
              <span className="weather-day-label">{DAY_LABELS[date] ?? date}</span>
              <span className="weather-day-desc">{weatherCodeToLabel(daily.weathercode[i])}</span>
              <span className="weather-day-temps">
                {daily.max[i] != null && daily.min[i] != null
                  ? `${Math.round(daily.min[i])}° – ${Math.round(daily.max[i])}°F`
                  : '—'}
              </span>
              {daily.precipitation_sum?.[i] != null && daily.precipitation_sum[i] > 0 && (
                <span className="weather-day-precip">↑ {daily.precipitation_sum[i].toFixed(1)} in</span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

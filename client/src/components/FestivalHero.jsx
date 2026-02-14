import { useState, useEffect } from 'react';

// Wednesday Aug 12, 2026 1:00 PM PST (PST = UTC-8)
const COUNTDOWN_TARGET = new Date(Date.UTC(2026, 7, 12, 21, 0, 0));

function formatCountdown(now) {
  const diff = COUNTDOWN_TARGET - now;
  if (diff <= 0) return null;
  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  parts.push(`${String(hours).padStart(2, '0')}h`);
  parts.push(`${String(minutes).padStart(2, '0')}m`);
  parts.push(`${String(seconds).padStart(2, '0')}s`);
  return parts.join(' ');
}

export function FestivalHero({ festival }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  if (!festival) return <div className="hero hero-loading">Loading…</div>;
  const { name } = festival;
  const countdown = formatCountdown(now);

  return (
    <div className="hero">
      <div className="hero-bg" aria-hidden />
      <div className="hero-content">
        <h2 className="hero-title">
          {countdown != null ? (
            <>
              <span className="hero-countdown">{countdown}</span>
              <span className="hero-countdown-until">until festival</span>
            </>
          ) : (
            name
          )}
        </h2>
      </div>
    </div>
  );
}

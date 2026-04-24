import { useState, useEffect, useMemo } from 'react';

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

  const countdown = formatCountdown(now);

  const marqueeText = useMemo(() => {
    if (countdown == null) return '';
    return `  ${countdown}  ·  UNTIL FESTIVAL  ·  BASS CANYON 2026  ·  `;
  }, [countdown]);

  if (!festival) return <div className="hero hero-loading">Loading…</div>;
  const { name } = festival;

  return (
    <div className="hero">
      <div className="hero-bg" aria-hidden />
      <div className="hero-content">
        {countdown != null ? (
          <div
            className="hero-marquee"
            role="timer"
            aria-live="polite"
            aria-atomic="true"
            aria-label={`Time until festival: ${countdown}`}
          >
            <span className="hero-marquee-sr-only">{countdown} until festival</span>
            <div className="hero-marquee-bezel" aria-hidden="true">
              <div className="hero-marquee-chrome">
                <span className="hero-marquee-chrome-dots" aria-hidden>● ● ●</span>
                <span className="hero-marquee-chrome-title">COUNTDOWN</span>
              </div>
              <div className="hero-marquee-window">
                <div className="hero-marquee-track">
                  <span className="hero-marquee-segment">{marqueeText}</span>
                  <span className="hero-marquee-segment">{marqueeText}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <h2 className="hero-title hero-title--static">{name}</h2>
        )}
      </div>
    </div>
  );
}

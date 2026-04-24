const LINEUP_PAGE = 'https://www.basscanyon.com/lineup';
const LINEUP_POSTER =
  'https://www.basscanyon.com/wp-content/uploads/2026/04/Bass_Canyon_2026_Lineup4x5_v2.jpg';

export function LineupSpotlight() {
  return (
    <section className="section lineup-spotlight" aria-labelledby="lineup-spotlight-heading">
      <div className="lineup-spotlight-glow" aria-hidden />
      <div className="lineup-spotlight-inner">
        <div className="lineup-spotlight-copy">
          <p className="lineup-spotlight-eyebrow">The Gorge · Aug 14–16</p>
          <h2 id="lineup-spotlight-heading" className="lineup-spotlight-title">
            2026 lineup
          </h2>
          <a
            href={LINEUP_PAGE}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-ghost lineup-spotlight-btn"
          >
            Open basscanyon.com lineup →
          </a>
        </div>
        <a
          href={LINEUP_PAGE}
          target="_blank"
          rel="noopener noreferrer"
          className="lineup-spotlight-poster-link"
          aria-label="Bass Canyon 2026 lineup — opens official site"
        >
          <span className="lineup-spotlight-poster-frame">
            <img
              src={LINEUP_POSTER}
              alt=""
              className="lineup-spotlight-poster-img"
              width={800}
              height={1000}
              loading="lazy"
              decoding="async"
            />
          </span>
          <span className="lineup-spotlight-poster-caption" aria-hidden>
            Tap poster · full lineup
          </span>
        </a>
      </div>
    </section>
  );
}

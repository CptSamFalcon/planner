export function FestivalHero({ festival }) {
  if (!festival) return <div className="hero hero-loading">Loading…</div>;
  const { name, venue, location, dates } = festival;
  return (
    <div className="hero">
      <div className="hero-bg" aria-hidden />
      <div className="hero-content">
        <h2 className="hero-title">{name}</h2>
        <p className="hero-venue">{venue}</p>
        <p className="hero-location">{location}</p>
        {dates?.start && (
          <p className="hero-dates">
            Aug 13 (Pre-Party) · Aug 14–16, 2026
          </p>
        )}
      </div>
    </div>
  );
}

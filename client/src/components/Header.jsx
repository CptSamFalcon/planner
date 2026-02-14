export function Header({ view, onViewChange }) {
  return (
    <header className="header">
      <div className="header-inner">
        <h1 className="logo">BASS CANYON 2026</h1>
        <span className="tagline">Group Planner</span>
        {onViewChange && (
          <nav className="header-nav" aria-label="Main">
            <button
              type="button"
              className={`header-nav-btn ${view === 'group' ? 'active' : ''}`}
              onClick={() => onViewChange('group')}
            >
              Home
            </button>
            <button
              type="button"
              className={`header-nav-btn ${view === 'schedule' ? 'active' : ''}`}
              onClick={() => onViewChange('schedule')}
            >
              Schedule
            </button>
            <button
              type="button"
              className={`header-nav-btn ${view === 'packing' ? 'active' : ''}`}
              onClick={() => onViewChange('packing')}
            >
              Packing
            </button>
            <button
              type="button"
              className={`header-nav-btn ${view === 'vehicles-sites' ? 'active' : ''}`}
              onClick={() => onViewChange('vehicles-sites')}
            >
              Vehicles/Sites
            </button>
            <button
              type="button"
              className={`header-nav-btn ${view === 'people' ? 'active' : ''}`}
              onClick={() => onViewChange('people')}
            >
              People
            </button>
            <button
              type="button"
              className={`header-nav-btn ${view === 'official-info' ? 'active' : ''}`}
              onClick={() => onViewChange('official-info')}
            >
              Official Info
            </button>
          </nav>
        )}
      </div>
    </header>
  );
}

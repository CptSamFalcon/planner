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
              Group
            </button>
            <button
              type="button"
              className={`header-nav-btn ${view === 'options' ? 'active' : ''}`}
              onClick={() => onViewChange('options')}
            >
              Options
            </button>
          </nav>
        )}
      </div>
    </header>
  );
}

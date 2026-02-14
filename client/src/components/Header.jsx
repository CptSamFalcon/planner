import { useState } from 'react';

const TABS = [
  { id: 'group', label: 'Home' },
  { id: 'schedule', label: 'Schedule' },
  { id: 'packing', label: 'Packing' },
  { id: 'vehicles-sites', label: 'Vehicles/Sites' },
  { id: 'people', label: 'People' },
  { id: 'official-info', label: 'Official Info' },
];

export function Header({ view, onViewChange }) {
  const [menuOpen, setMenuOpen] = useState(false);

  const handleNav = (id) => {
    onViewChange?.(id);
    setMenuOpen(false);
  };

  return (
    <header className={`header ${menuOpen ? 'header-menu-open' : ''}`}>
      <div className="header-inner">
        <h1 className="logo">BASS CANYON 2026</h1>
        <span className="tagline">Group Planner</span>
        {onViewChange && (
          <>
            <button
              type="button"
              className="header-menu-btn"
              onClick={() => setMenuOpen((o) => !o)}
              aria-expanded={menuOpen}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            >
              <span className="header-menu-icon" aria-hidden />
            </button>
            <nav className="header-nav" aria-label="Main">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={`header-nav-btn ${view === tab.id ? 'active' : ''}`}
                  onClick={() => handleNav(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </>
        )}
      </div>
    </header>
  );
}

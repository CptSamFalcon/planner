import { useState } from 'react';

const TABS = [
  { id: 'group', label: 'Home' },
  { id: 'schedule', label: 'Schedule' },
  { id: 'campsites', label: 'Campsites' },
  { id: 'meals', label: 'Meals' },
  { id: 'people', label: 'People' },
  { id: 'packing', label: 'Packing' },
  { id: 'official-info', label: 'Official Info' },
  { id: 'bingo', label: 'Bingo' },
];

export function Header({ view, onViewChange }) {
  const [menuOpen, setMenuOpen] = useState(false);

  const handleNav = (id) => {
    onViewChange?.(id);
    setMenuOpen(false);
  };

  return (
    <header className={`header ${menuOpen ? 'header-menu-open' : ''}`}>
      <div className="win98-caption">
        <span className="win98-caption-title">Bass Canyon 2026 — Group Planner</span>
        <div className="win98-caption-controls" aria-hidden="true">
          <span className="win98-caption-btn win98-caption-min">_</span>
          <span className="win98-caption-btn win98-caption-max">□</span>
          <span className="win98-caption-btn win98-caption-close">×</span>
        </div>
      </div>
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

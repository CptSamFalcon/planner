import { navLabelForView } from '../nav-tabs';

export function Header({ currentViewId }) {
  return (
    <header className="header">
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
        <span className="tagline">
          Group Planner <span className="header-current-view">· {navLabelForView(currentViewId)}</span>
        </span>
      </div>
    </header>
  );
}

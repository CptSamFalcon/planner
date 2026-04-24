import { navLabelForView } from '../nav-tabs';

export function Header({ currentViewId }) {
  return (
    <header className="header">
      <div className="win98-caption">
        <h1 className="win98-caption-title">FestOS</h1>
        <div className="win98-caption-controls" aria-hidden="true">
          <span className="win98-caption-btn win98-caption-min">_</span>
          <span className="win98-caption-btn win98-caption-max">□</span>
          <span className="win98-caption-btn win98-caption-close">×</span>
        </div>
      </div>
      <div className="header-inner">
        <span className="tagline">
          Group Planner <span className="header-current-view">· {navLabelForView(currentViewId)}</span>
        </span>
      </div>
    </header>
  );
}

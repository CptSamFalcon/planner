import { useEffect, useRef } from 'react';
import { NAV_TABS } from '../nav-tabs';

/**
 * Windows-style Start button + flyout menu. Parent owns `view` and `onSelectView(id)`.
 */
export function Win98StartMenu({ view, open, onOpenChange, onSelectView }) {
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) onOpenChange(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open, onOpenChange]);

  const pick = (id) => {
    onSelectView(id);
    onOpenChange(false);
  };

  return (
    <div className="win98-start-wrap" ref={wrapRef}>
      <button
        type="button"
        className={`win98-start-btn${open ? ' is-pressed' : ''}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? 'win98-start-menu' : undefined}
        onClick={() => onOpenChange(!open)}
      >
        <span className="win98-start-flag" aria-hidden />
        Start
      </button>
      {open && (
        <div
          className="win98-start-menu"
          id="win98-start-menu"
          role="menu"
          aria-label="Programs"
        >
          {NAV_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="menuitem"
              className={`win98-start-menu-item${view === tab.id ? ' is-active' : ''}`}
              onClick={() => pick(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

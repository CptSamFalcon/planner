import { navLabelForView, NAV_TABS } from '../nav-tabs';

function displayNameForMember(member) {
  if (!member) return '';
  const nick = member.nickname && String(member.nickname).trim();
  const name = member.name && String(member.name).trim();
  return nick || name || 'You';
}

export function Header({ currentViewId, onSelectView, member, onOpenProfile }) {
  const showNav = typeof onSelectView === 'function';
  const chipLabel = displayNameForMember(member);
  const avatarSrc = member?.avatar_url
    ? `${member.avatar_url}${member.avatar_url.includes('?') ? '&' : '?'}v=${member.id ?? ''}`
    : null;

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
      <div className="header-menubar">
        <p className="header-menubar-tagline">
          Group Planner <span className="header-current-view">· {navLabelForView(currentViewId)}</span>
        </p>
        {showNav ? (
          <nav className="header-app-nav" aria-label="Planner sections">
            {NAV_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`header-app-nav-btn${currentViewId === tab.id ? ' is-active' : ''}`}
                onClick={() => onSelectView(tab.id)}
                data-retro-tip={tab.label}
                data-status-tip={`Open ${tab.label}`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        ) : null}
        {member && typeof onOpenProfile === 'function' ? (
          <div className="header-menubar-user">
            <button
              type="button"
              className="header-user-chip"
              onClick={onOpenProfile}
              data-retro-tip="My profile"
              data-status-tip="Edit your profile"
              aria-label={`My profile: ${chipLabel}`}
            >
              {avatarSrc ? (
                <img src={avatarSrc} alt="" className="header-user-chip-avatar" width={28} height={28} />
              ) : (
                <span className="header-user-chip-avatar header-user-chip-avatar--placeholder" aria-hidden>
                  {chipLabel.slice(0, 1).toUpperCase()}
                </span>
              )}
              <span className="header-user-chip-name">{chipLabel}</span>
            </button>
          </div>
        ) : null}
      </div>
    </header>
  );
}

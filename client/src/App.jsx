import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { FestivalHero } from './components/FestivalHero';
import { CampsitesHub } from './components/CampsitesHub';
import { Members } from './components/Members';
import { PackingTab } from './components/PackingTab';
import { Schedule } from './components/Schedule';
import { OfficialInfo } from './components/OfficialInfo';
import { LineupSpotlight } from './components/LineupSpotlight';
import { WeatherWidget } from './components/WeatherWidget';
import { Bingo } from './components/Bingo';
import { MealPlanner } from './components/MealPlanner';
import { Notes } from './components/Notes';
import { PasswordGate } from './components/PasswordGate';
import { Win98StartMenu } from './components/Win98StartMenu';

const API = '/api';

function Win98TaskbarClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);
  return (
    <time className="win98-taskbar-tray" dateTime={now.toISOString()}>
      {now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
    </time>
  );
}

export default function App() {
  const [authChecked, setAuthChecked] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [view, setView] = useState('group');
  const [startMenuOpen, setStartMenuOpen] = useState(false);
  const [festival, setFestival] = useState(null);

  useEffect(() => {
    fetch(`${API}/auth`, { credentials: 'include' })
      .then((r) => { setAuthChecked(true); setAuthenticated(r.ok); })
      .catch(() => { setAuthChecked(true); setAuthenticated(false); });
  }, []);

  useEffect(() => {
    if (!authenticated) return;
    fetch(`${API}/festival`, { credentials: 'include' })
      .then((r) => r.json())
      .then(setFestival)
      .catch(() => setFestival({ name: 'Bass Canyon 2026', venue: 'The Gorge', dates: {} }));
  }, [authenticated]);

  if (!authChecked) {
    return (
      <div className="win98-desktop win98-desktop--gate">
        <div className="password-gate password-gate-loading">
          <div className="password-gate-card"><p className="password-gate-subtitle">Loading…</p></div>
        </div>
      </div>
    );
  }
  if (!authenticated) {
    return (
      <div className="win98-desktop win98-desktop--gate">
        <PasswordGate api={API} onAuthenticated={() => setAuthenticated(true)} />
      </div>
    );
  }

  return (
    <div className="win98-desktop">
      <div className="win98-app-window">
        <Header currentViewId={view} />
        <main className="win98-main">
          {view === 'schedule' ? (
            <section className="section">
              <Schedule api={API} />
            </section>
          ) : view === 'campsites' ? (
            <CampsitesHub api={API} />
          ) : view === 'meals' ? (
            <section className="section">
              <MealPlanner api={API} />
            </section>
          ) : view === 'people' ? (
            <section className="section">
              <Members api={API} />
            </section>
          ) : view === 'packing' ? (
            <section className="section">
              <PackingTab api={API} />
            </section>
          ) : view === 'official-info' ? (
            <section className="section">
              <OfficialInfo />
            </section>
          ) : view === 'bingo' ? (
            <section className="section">
              <Bingo api={API} />
            </section>
          ) : (
            <>
              <FestivalHero festival={festival} />
              <LineupSpotlight />
              <WeatherWidget />
              <section className="section section-notes">
                <Notes api={API} />
              </section>
            </>
          )}
        </main>
      </div>
      <footer className="win98-taskbar">
        <Win98StartMenu
          view={view}
          open={startMenuOpen}
          onOpenChange={setStartMenuOpen}
          onSelectView={setView}
        />
        <div className="win98-taskbar-spacer" aria-hidden />
        <Win98TaskbarClock />
      </footer>
    </div>
  );
}

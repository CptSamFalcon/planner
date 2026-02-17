import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { FestivalHero } from './components/FestivalHero';
import { Campsites } from './components/Campsites';
import { VehiclesSites } from './components/VehiclesSites';
import { Members } from './components/Members';
import { PackingTab } from './components/PackingTab';
import { Schedule } from './components/Schedule';
import { OfficialInfo } from './components/OfficialInfo';
import { WeatherWidget } from './components/WeatherWidget';
import { Bingo } from './components/Bingo';
import { Notes } from './components/Notes';
import { PasswordGate } from './components/PasswordGate';

const API = '/api';

export default function App() {
  const [authChecked, setAuthChecked] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [view, setView] = useState('group');
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
      <div className="password-gate password-gate-loading">
        <div className="password-gate-card"><p className="password-gate-subtitle">Loading…</p></div>
      </div>
    );
  }
  if (!authenticated) {
    return <PasswordGate api={API} onAuthenticated={() => setAuthenticated(true)} />;
  }

  return (
    <>
      <Header view={view} onViewChange={setView} />
      <main>
        {view === 'vehicles-sites' ? (
          <section className="section">
            <VehiclesSites api={API} />
          </section>
        ) : view === 'people' ? (
          <section className="section">
            <Members api={API} />
          </section>
        ) : view === 'schedule' ? (
          <section className="section">
            <Schedule api={API} />
          </section>
        ) : view === 'bingo' ? (
          <section className="section">
            <Bingo api={API} />
          </section>
        ) : view === 'packing' ? (
          <section className="section">
            <PackingTab api={API} />
          </section>
        ) : view === 'official-info' ? (
          <section className="section">
            <OfficialInfo />
          </section>
        ) : (
          <>
            <FestivalHero festival={festival} />
            <WeatherWidget />
            <Campsites api={API} onMemberUpdated={() => {}} />
            <section className="section section-notes">
              <Notes api={API} />
            </section>
          </>
        )}
      </main>
    </>
  );
}

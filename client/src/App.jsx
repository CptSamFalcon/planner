import { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { FestivalHero } from './components/FestivalHero';
import { GoingList } from './components/GoingList';
import { Campsites } from './components/Campsites';
import { Options } from './components/Options';
import { Packing } from './components/Packing';
import { Schedule } from './components/Schedule';
import { Notes } from './components/Notes';

const API = '/api';

export default function App() {
  const [view, setView] = useState('group');
  const [festival, setFestival] = useState(null);
  const [selectedPackingCampsiteId, setSelectedPackingCampsiteId] = useState(null);
  const [goingListKey, setGoingListKey] = useState(0);
  const packingSectionRef = useRef(null);

  useEffect(() => {
    fetch(`${API}/festival`)
      .then((r) => r.json())
      .then(setFestival)
      .catch(() => setFestival({ name: 'Bass Canyon 2026', venue: 'The Gorge', dates: {} }));
  }, []);

  const didOpenPackList = useRef(false);
  useEffect(() => {
    if (!didOpenPackList.current) return;
    packingSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    didOpenPackList.current = false;
  }, [selectedPackingCampsiteId]);

  const openPackList = (campsiteId) => {
    didOpenPackList.current = true;
    setSelectedPackingCampsiteId(campsiteId);
  };

  return (
    <>
      <Header view={view} onViewChange={setView} />
      <main>
        {view === 'options' ? (
          <section className="section">
            <Options api={API} />
          </section>
        ) : view === 'schedule' ? (
          <section className="section">
            <Schedule api={API} />
          </section>
        ) : (
          <>
            <FestivalHero festival={festival} />
            <GoingList api={API} refreshKey={goingListKey} onRefresh={() => setGoingListKey((k) => k + 1)} />
            <section className="section section-campsites">
              <Campsites api={API} onOpenPackList={openPackList} onMemberUpdated={() => setGoingListKey((k) => k + 1)} />
            </section>
            <section className="section section-packing" id="section-packing" ref={packingSectionRef}>
              <Packing
                api={API}
                selectedCampsiteId={selectedPackingCampsiteId}
                onSelectedCampsiteIdChange={setSelectedPackingCampsiteId}
              />
            </section>
            <section className="section section-notes">
              <Notes api={API} />
            </section>
          </>
        )}
      </main>
    </>
  );
}

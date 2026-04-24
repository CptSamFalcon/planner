import { useEffect, useMemo, useState } from 'react';
import { parseMemberAllergies } from '../utils/memberAllergies';

const DAY_ORDER = ['Wednesday', 'Thursday Pre-Party', 'Friday', 'Saturday', 'Sunday'];

function daySort(a, b) {
  const ia = DAY_ORDER.indexOf(a.day);
  const ib = DAY_ORDER.indexOf(b.day);
  return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
}

function timeSort(a, b) {
  return String(a.time || '').localeCompare(String(b.time || ''));
}

export function PrintPack({ api }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [festival, setFestival] = useState(null);
  const [members, setMembers] = useState([]);
  const [events, setEvents] = useState([]);
  const [meals, setMeals] = useState([]);
  const [packingItems, setPackingItems] = useState([]);

  useEffect(() => {
    setLoading(true);
    setError('');
    Promise.all([
      fetch(`${api}/festival`, { credentials: 'include' }).then((r) => (r.ok ? r.json() : null)),
      fetch(`${api}/members`, { credentials: 'include' }).then((r) => (r.ok ? r.json() : [])),
      fetch(`${api}/schedule`, { credentials: 'include' }).then((r) => (r.ok ? r.json() : [])),
      fetch(`${api}/meals`, { credentials: 'include' }).then((r) => (r.ok ? r.json() : [])),
      fetch(`${api}/packing?all=1`, { credentials: 'include' }).then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([festivalData, membersData, eventsData, mealsData, packingData]) => {
        setFestival(festivalData || null);
        setMembers(Array.isArray(membersData) ? membersData : []);
        setEvents(Array.isArray(eventsData) ? eventsData : []);
        setMeals(Array.isArray(mealsData) ? mealsData : []);
        setPackingItems(Array.isArray(packingData) ? packingData : []);
      })
      .catch(() => setError('Could not load print pack data.'))
      .finally(() => setLoading(false));
  }, [api]);

  const memberById = useMemo(
    () => new Map(members.map((m) => [Number(m.id), m.name])),
    [members]
  );

  const scheduleByDay = useMemo(() => {
    const grouped = new Map();
    [...events].sort((a, b) => daySort(a, b) || timeSort(a, b)).forEach((ev) => {
      const key = ev.day || 'Other';
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(ev);
    });
    return grouped;
  }, [events]);

  const packingByList = useMemo(() => {
    const grouped = new Map();
    [...packingItems]
      .sort((a, b) => String(a.list_name || '').localeCompare(String(b.list_name || '')) || String(a.label || '').localeCompare(String(b.label || '')))
      .forEach((item) => {
        const key = item.list_name || 'General';
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key).push(item);
      });
    return grouped;
  }, [packingItems]);

  const generatedAt = new Date().toLocaleString();

  return (
    <section className="section section-print-pack">
      <div className="card block print-pack-controls">
        <h3 className="card-title">Offline print pack</h3>
        <p className="card-description">
          Includes people, emergency contacts, schedule, meals, and packing lists in a printable format.
          Save as PDF from your browser print dialog.
        </p>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => window.print()}
          data-retro-tip="Print or Save as PDF"
          data-status-tip="Print this pack"
        >
          Print / Save as PDF
        </button>
      </div>

      {loading ? (
        <p className="print-pack-loading">Loading print pack…</p>
      ) : error ? (
        <p className="print-pack-error">{error}</p>
      ) : (
        <article className="print-pack-sheet" aria-label="Offline festival pack">
          <header className="print-pack-header">
            <h1>{festival?.name || 'Festival'} — Offline Pack</h1>
            <p>{festival?.venue || 'The Gorge'} · Generated {generatedAt}</p>
          </header>

          <section className="print-pack-section">
            <h2>People & emergency contacts</h2>
            <table className="print-pack-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Phone</th>
                  <th>Emergency contact</th>
                  <th>Allergies</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id}>
                    <td>{m.name}</td>
                    <td>{m.status || '—'}</td>
                    <td>{m.contact_number || '—'}</td>
                    <td>{m.emergency_contact || '—'}</td>
                    <td>{parseMemberAllergies(m).join(', ') || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="print-pack-section">
            <h2>Schedule</h2>
            {Array.from(scheduleByDay.entries()).map(([day, dayEvents]) => (
              <div key={day} className="print-pack-subsection">
                <h3>{day}</h3>
                <ul className="print-pack-list">
                  {dayEvents.map((ev) => (
                    <li key={ev.id}>
                      <strong>{ev.time || 'TBD'}</strong> — {ev.title}
                      {ev.stage_name ? ` (${ev.stage_name})` : ''}
                      {Array.isArray(ev.attendee_ids) && ev.attendee_ids.length > 0
                        ? ` · ${ev.attendee_ids.map((id) => memberById.get(Number(id)) || id).join(', ')}`
                        : ''}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>

          <section className="print-pack-section">
            <h2>Meals</h2>
            <ul className="print-pack-list">
              {meals.map((meal) => (
                <li key={meal.id}>
                  <strong>{meal.slot_label || 'Anytime'}</strong> — {meal.title} (Cook: {meal.preparer_name})
                </li>
              ))}
            </ul>
          </section>

          <section className="print-pack-section">
            <h2>Packing lists</h2>
            {Array.from(packingByList.entries()).map(([listName, items]) => (
              <div key={listName} className="print-pack-subsection">
                <h3>{listName}</h3>
                <ul className="print-pack-list">
                  {items.map((item) => (
                    <li key={item.id}>
                      [{item.done ? 'x' : ' '}] {item.label}
                      {item.item_type ? ` · ${item.item_type}` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        </article>
      )}
    </section>
  );
}

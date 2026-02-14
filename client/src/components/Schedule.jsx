import { useState, useEffect } from 'react';

const DAYS = ['Wednesday', 'Thursday Pre-Party', 'Friday', 'Saturday', 'Sunday'];

// Bass Canyon 2026: Aug 12 (Wed) through Aug 16 (Sun)
const DAY_DATE = {
  'Wednesday': 12,
  'Thursday Pre-Party': 13,
  'Friday': 14,
  'Saturday': 15,
  'Sunday': 16,
};

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function dayLabel(dayName) {
  const date = DAY_DATE[dayName];
  return date != null ? `${dayName} (${ordinal(date)})` : dayName;
}

const DEFAULT_DAY_INDEX = 2; // Friday

export function Schedule({ api, festival }) {
  const [events, setEvents] = useState([]);
  const [day, setDay] = useState('Friday');
  const [time, setTime] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [mobileDayIndex, setMobileDayIndex] = useState(DEFAULT_DAY_INDEX);

  const load = () => {
    fetch(`${api}/schedule`).then((r) => r.json()).then(setEvents).catch(() => setEvents([]));
  };

  useEffect(load, [api]);

  const add = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    fetch(`${api}/schedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ day, time: time.trim(), title: title.trim(), description: description.trim() || null }),
    })
      .then((r) => r.json())
      .then((ev) => setEvents((prev) => [...prev, ev].sort((a, b) => (a.day === b.day ? (a.time || '').localeCompare(b.time || '') : DAYS.indexOf(a.day) - DAYS.indexOf(b.day)))))
      .then(() => { setTitle(''); setTime(''); setDescription(''); })
      .catch(console.error);
  };

  const remove = (id) => {
    fetch(`${api}/schedule/${id}`, { method: 'DELETE' })
      .then(() => setEvents((prev) => prev.filter((e) => e.id !== id)))
      .catch(console.error);
  };

  const byDay = DAYS.reduce((acc, d) => ({ ...acc, [d]: [] }), {});
  events.forEach((ev) => {
    if (byDay[ev.day]) byDay[ev.day].push(ev);
    else byDay[ev.day] = [ev];
  });
  DAYS.forEach((d) => {
    (byDay[d] || []).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  });

  return (
    <div className="card block schedule-card">
      <h3 className="card-title">Schedule & Meetups</h3>
      <form className="schedule-form" onSubmit={add}>
        <div className="form-row">
          <select value={day} onChange={(e) => setDay(e.target.value)} className="select">
            {DAYS.map((d) => (
              <option key={d} value={d}>{dayLabel(d)}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Time (e.g. 6:00 PM)"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="input input-time"
          />
          <input
            type="text"
            placeholder="Event or meetup"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input"
          />
        </div>
        <div className="form-row">
          <input
            type="text"
            placeholder="Description / location"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input input-full"
          />
          <button type="submit" className="btn btn-primary">Add</button>
        </div>
      </form>
      {/* Desktop: full week grid */}
      <div className="schedule-calendar schedule-calendar-desktop">
        <div className="schedule-calendar-header">
          {DAYS.map((d) => (
            <div key={d} className="schedule-calendar-day-header">
              <span className="schedule-calendar-day-name">{d.split(' ')[0]}</span>
              <span className="schedule-calendar-day-date">{DAY_DATE[d] != null ? ordinal(DAY_DATE[d]) : ''}</span>
            </div>
          ))}
        </div>
        <div className="schedule-calendar-body">
          {DAYS.map((d) => (
            <div key={d} className="schedule-calendar-day-column">
              <div className="schedule-calendar-events">
                {(byDay[d] || []).map((ev) => (
                  <div key={ev.id} className="schedule-calendar-event">
                    <span className="schedule-calendar-event-time">{ev.time || '—'}</span>
                    <span className="schedule-calendar-event-title">{ev.title}</span>
                    {ev.description && <span className="schedule-calendar-event-desc">{ev.description}</span>}
                    <button type="button" className="btn btn-ghost btn-sm schedule-calendar-event-remove" onClick={() => remove(ev.id)} aria-label="Remove">×</button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile: one day at a time with arrows */}
      <div className="schedule-calendar-mobile">
        <div className="schedule-mobile-header">
          <button
            type="button"
            className="schedule-mobile-arrow"
            onClick={() => setMobileDayIndex((i) => Math.max(0, i - 1))}
            disabled={mobileDayIndex === 0}
            aria-label="Previous day"
          >
            ←
          </button>
          <div className="schedule-mobile-day">
            <span className="schedule-calendar-day-name">{DAYS[mobileDayIndex].split(' ')[0]}</span>
            <span className="schedule-calendar-day-date">{DAY_DATE[DAYS[mobileDayIndex]] != null ? ordinal(DAY_DATE[DAYS[mobileDayIndex]]) : ''}</span>
          </div>
          <button
            type="button"
            className="schedule-mobile-arrow"
            onClick={() => setMobileDayIndex((i) => Math.min(DAYS.length - 1, i + 1))}
            disabled={mobileDayIndex === DAYS.length - 1}
            aria-label="Next day"
          >
            →
          </button>
        </div>
        <div className="schedule-calendar-mobile-events">
          {(byDay[DAYS[mobileDayIndex]] || []).map((ev) => (
            <div key={ev.id} className="schedule-calendar-event">
              <span className="schedule-calendar-event-time">{ev.time || '—'}</span>
              <span className="schedule-calendar-event-title">{ev.title}</span>
              {ev.description && <span className="schedule-calendar-event-desc">{ev.description}</span>}
              <button type="button" className="btn btn-ghost btn-sm schedule-calendar-event-remove" onClick={() => remove(ev.id)} aria-label="Remove">×</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

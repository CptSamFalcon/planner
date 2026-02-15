import { useState, useEffect, useMemo } from 'react';

const DAYS = ['Wednesday', 'Thursday Pre-Party', 'Friday', 'Saturday', 'Sunday'];

const DAY_DATE = {
  'Wednesday': 12,
  'Thursday Pre-Party': 13,
  'Friday': 14,
  'Saturday': 15,
  'Sunday': 16,
};

// Time grid: 12:00 PM through 2:00 AM (30-min slots) = 28 slots
const SLOT_COUNT = 28;
const ROW_HEIGHT_PX = 40;

function buildTimeSlots() {
  const slots = [];
  for (let i = 0; i < SLOT_COUNT; i++) {
    const totalMins = 12 * 60 + i * 30;
    const hours = Math.floor(totalMins / 60) % 24;
    const mins = totalMins % 60;
    const h = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    const ampm = hours < 12 ? 'AM' : 'PM';
    const label = `${h}:${String(mins).padStart(2, '0')} ${ampm}`;
    const value = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
    slots.push({ index: i, label, value });
  }
  return slots;
}

const TIME_SLOTS = buildTimeSlots();

const STAGE_COLOR_PRESETS = ['#00f5ff', '#ff00aa', '#8b5cf6', '#22c55e', '#eab308', '#f97316'];

function getStageColor(stage, index) {
  if (stage.color && /^#[0-9A-Fa-f]{6}$/.test(stage.color)) return stage.color;
  return STAGE_COLOR_PRESETS[index % STAGE_COLOR_PRESETS.length];
}

function timeToSlot(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return 0;
  const t = timeStr.trim();
  const parts = t.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i) || t.match(/^(\d{1,2}):(\d{2})$/);
  if (!parts) return 0;
  let h = parseInt(parts[1], 10);
  const m = parseInt(parts[2], 10);
  const ampm = (parts[3] || '').toUpperCase();
  if (ampm === 'PM' && h !== 12) h += 12;
  if (ampm === 'AM' && h === 12) h = 0;
  if (!ampm && h >= 0 && h <= 11) h += 12; // 0-11 without AM/PM = PM
  let mins = h * 60 + m;
  if (mins < 12 * 60) mins += 24 * 60; // after midnight
  const fromNoon = mins - 12 * 60;
  const slot = Math.floor(fromNoon / 30);
  return Math.max(0, Math.min(slot, SLOT_COUNT - 1));
}

function slotToTime(slotIndex) {
  const totalMins = 12 * 60 + slotIndex * 30;
  const hours = Math.floor(totalMins / 60) % 24;
  const mins = totalMins % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function dayLabel(dayName) {
  const date = DAY_DATE[dayName];
  return date != null ? `${dayName} (${ordinal(date)})` : dayName;
}

export function Schedule({ api }) {
  const [stages, setStages] = useState([]);
  const [events, setEvents] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [selectedDay, setSelectedDay] = useState('Friday');

  // Filter: which people to show (who's going to what). Empty = show all.
  const [filterMemberIds, setFilterMemberIds] = useState(new Set());

  // Add event form
  const [showAddForm, setShowAddForm] = useState(false);
  const [addDay, setAddDay] = useState('Friday');
  const [addStartSlot, setAddStartSlot] = useState(12); // 6 PM
  const [addEndSlot, setAddEndSlot] = useState(14);
  const [addTitle, setAddTitle] = useState('');
  const [addDescription, setAddDescription] = useState('');
  const [addStageId, setAddStageId] = useState('');
  const [addEventType, setAddEventType] = useState('meetup'); // 'set' | 'meetup'
  const [addAttendeeIds, setAddAttendeeIds] = useState([]);

  // Edit event
  const [editingEvent, setEditingEvent] = useState(null);

  // New stage name
  const [newStageName, setNewStageName] = useState('');

  const goingMembers = useMemo(() => members.filter((m) => m.status === 'going'), [members]);

  const load = () => {
    setLoading(true);
    setLoadError(false);
    Promise.all([
      fetch(`${api}/schedule/stages`, { credentials: 'include' }).then((r) => (r.ok ? r.json() : [])),
      fetch(`${api}/schedule`, { credentials: 'include' }).then((r) => (r.ok ? r.json() : [])),
      fetch(`${api}/members`, { credentials: 'include' }).then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([stagesData, eventsData, membersData]) => {
        setStages(Array.isArray(stagesData) ? stagesData : []);
        setEvents(Array.isArray(eventsData) ? eventsData : []);
        setMembers(Array.isArray(membersData) ? membersData : []);
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  };

  useEffect(load, [api]);

  const eventsForDay = useMemo(() => {
    return events
      .filter((e) => e.day === selectedDay)
      .map((e) => {
        const startSlot = timeToSlot(e.time);
        const endSlot = e.end_time ? timeToSlot(e.end_time) : startSlot + 1;
        return {
          ...e,
          startSlot: Math.max(0, startSlot),
          endSlot: Math.min(SLOT_COUNT, Math.max(startSlot + 1, endSlot)),
        };
      });
  }, [events, selectedDay]);

  // Double-booked: for each person with events this day, find overlapping pairs
  const doubleBookedForDay = useMemo(() => {
    const byMember = new Map();
    eventsForDay.forEach((ev) => {
      (ev.attendee_ids || []).forEach((mid) => {
        const id = Number(mid);
        if (Number.isNaN(id)) return;
        if (!byMember.has(id)) byMember.set(id, []);
        byMember.get(id).push(ev);
      });
    });
    const result = [];
    byMember.forEach((evs, memberIdStr) => {
      const memberId = Number(memberIdStr);
      const sorted = [...evs].sort((a, b) => a.startSlot - b.startSlot);
        for (let i = 0; i < sorted.length - 1; i++) {
        if (sorted[i].endSlot > sorted[i + 1].startSlot) {
          const member = members.find((m) => m.id === memberId);
          result.push({
            memberId,
            name: member?.name || 'Someone',
            eventA: sorted[i],
            eventB: sorted[i + 1],
          });
          break; // one entry per person
        }
      }
    });
    return result;
  }, [eventsForDay, members]);

  const hasFilter = filterMemberIds.size > 0;
  const eventMatchesFilter = (ev) => !hasFilter || (ev.attendee_ids || []).some((id) => filterMemberIds.has(Number(id)));
  // Event has everyone from the "Who to show" filter in its attendee list (only when 2+ selected)
  const eventHasAllSelected = (ev) =>
    hasFilter &&
    filterMemberIds.size > 1 &&
    [...filterMemberIds].every((id) => (ev.attendee_ids || []).map(Number).includes(id));
  const toggleFilterMember = (id) => {
    setFilterMemberIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const addEvent = (e) => {
    e.preventDefault();
    if (!addTitle.trim()) return;
    const startTime = slotToTime(addStartSlot);
    const endTime = addEndSlot > addStartSlot ? slotToTime(addEndSlot) : slotToTime(addStartSlot + 1);
    const body = {
      day: addDay,
      time: startTime,
      end_time: endTime,
      title: addTitle.trim(),
      description: addDescription.trim() || null,
      event_type: addEventType,
      stage_id: addEventType === 'set' && addStageId ? Number(addStageId) : null,
      attendee_ids: addAttendeeIds,
    };
    fetch(`${api}/schedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
    })
      .then((r) => r.json())
      .then((ev) => {
        setEvents((prev) => [...prev, ev]);
        setAddTitle('');
        setAddDescription('');
        setAddAttendeeIds([]);
        setShowAddForm(false);
      })
      .catch(console.error);
  };

  const updateEvent = (id, updates) => {
    fetch(`${api}/schedule/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(updates),
    })
      .then((r) => r.json())
      .then((updated) => setEvents((prev) => prev.map((ev) => (ev.id === id ? updated : ev))))
      .then(() => setEditingEvent(null))
      .catch(console.error);
  };

  const removeEvent = (id) => {
    fetch(`${api}/schedule/${id}`, { method: 'DELETE', credentials: 'include' })
      .then(() => setEvents((prev) => prev.filter((ev) => ev.id !== id)))
      .then(() => setEditingEvent(null))
      .catch(console.error);
  };

  const addStage = (e) => {
    e.preventDefault();
    const name = newStageName.trim();
    if (!name) return;
    fetch(`${api}/schedule/stages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name, sort_order: stages.length }),
    })
      .then((r) => r.json())
      .then((s) => {
        setStages((prev) => [...prev, s].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)));
        setNewStageName('');
      })
      .catch(console.error);
  };

  const updateStageColor = (stageId, color) => {
    fetch(`${api}/schedule/stages/${stageId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ color: color || null }),
    })
      .then((r) => r.json())
      .then((updated) => setStages((prev) => prev.map((s) => (s.id === stageId ? { ...s, color: updated.color } : s))))
      .catch(console.error);
  };

  const removeStage = (id) => {
    if (!window.confirm('Remove this stage? Events on it will become meetups.')) return;
    fetch(`${api}/schedule/stages/${id}`, { method: 'DELETE', credentials: 'include' })
      .then(() => {
        setStages((prev) => prev.filter((s) => s.id !== id));
        setEvents((prev) => prev.map((e) => (e.stage_id === id ? { ...e, stage_id: null, stage_name: null, event_type: 'meetup' } : e)));
      })
      .catch(console.error);
  };

  return (
    <div className="schedule-page">
      <div className="schedule-card card block">
        <div className="schedule-header-row">
          <h3 className="card-title">Festival Schedule</h3>
          <p className="schedule-subtitle">Set times by stage + your meetups. Pick a day to see the grid.</p>
        </div>

        {/* Day tabs (desktop only; mobile uses day bar above event list) */}
        <div className="schedule-day-tabs schedule-day-tabs-desktop" role="tablist" aria-label="Select day">
          {DAYS.map((d) => (
            <button
              key={d}
              type="button"
              role="tab"
              aria-selected={selectedDay === d}
              className={`schedule-day-tab ${selectedDay === d ? 'active' : ''}`}
              onClick={() => setSelectedDay(d)}
            >
              {d.split(' ')[0]}
            </button>
          ))}
        </div>

        {/* Who to show: filter by people */}
        {!loading && goingMembers.length > 0 && (
          <div className="schedule-filter-people">
            <span className="schedule-filter-label">Who to show:</span>
            <div className="schedule-filter-chips">
              {goingMembers.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={`schedule-filter-chip ${filterMemberIds.has(m.id) ? 'active' : ''}`}
                  onClick={() => toggleFilterMember(m.id)}
                >
                  {m.name}
                </button>
              ))}
            </div>
            {hasFilter && (
              <button type="button" className="btn btn-ghost btn-sm schedule-filter-clear" onClick={() => setFilterMemberIds(new Set())}>
                Clear
              </button>
            )}
          </div>
        )}

        {/* Double-booked warning for selected day */}
        {!loading && doubleBookedForDay.length > 0 && (
          <div className="schedule-double-booked" role="alert">
            <strong>Double-booked on {selectedDay}:</strong>
            <ul>
              {doubleBookedForDay.map(({ name, eventA, eventB }) => (
                <li key={name + eventA.id + eventB.id}>
                  {name}: <span className="schedule-db-event">{eventA.title}</span> ({TIME_SLOTS[eventA.startSlot]?.label}) & <span className="schedule-db-event">{eventB.title}</span> ({TIME_SLOTS[eventB.startSlot]?.label})
                </li>
              ))}
            </ul>
          </div>
        )}

        {loading && <p className="schedule-loading">Loading schedule…</p>}
        {loadError && (
          <p className="schedule-error" role="alert">
            Couldn&apos;t load schedule. Is the server running?
          </p>
        )}

        {!loading && !loadError && (
          <>
            {/* Desktop: time grid with stages + meetups */}
            <div className="schedule-grid-wrap">
              <div
                className="schedule-grid schedule-grid-desktop"
                style={{
                  '--schedule-rows': SLOT_COUNT,
                  '--schedule-row-height': `${ROW_HEIGHT_PX}px`,
                }}
              >
                <div className="schedule-grid-time-col">
                  {TIME_SLOTS.map((s) => (
                    <div key={s.index} className="schedule-grid-time-cell" style={{ gridRow: s.index + 1 }}>
                      {s.label}
                    </div>
                  ))}
                </div>
                {stages.map((stage, stageIdx) => {
                  const stageColor = getStageColor(stage, stageIdx);
                  return (
                  <div key={stage.id} className="schedule-grid-stage-col" style={{ '--stage-color': stageColor }}>
                    <div className="schedule-grid-stage-header">{stage.name}</div>
                    <div className="schedule-grid-stage-cells">
                      {TIME_SLOTS.map((s) => (
                        <div key={s.index} className="schedule-grid-cell" style={{ gridRow: s.index + 1 }} />
                      ))}
                    </div>
                    <div className="schedule-grid-events">
                      {eventsForDay
                        .filter((ev) => ev.event_type === 'set' && ev.stage_id === stage.id)
                        .map((ev) => {
                        const match = eventMatchesFilter(ev);
                        const allSelected = eventHasAllSelected(ev);
                        const showIds = hasFilter ? (ev.attendee_ids || []).filter((id) => filterMemberIds.has(Number(id))) : (ev.attendee_ids || []);
                        const attendeeNames = showIds.map((id) => members.find((m) => m.id === Number(id))?.name).filter(Boolean);
                        return (
                            <div
                              key={ev.id}
                              className={`schedule-grid-event schedule-grid-event-set ${!match ? 'schedule-grid-event-dim' : ''} ${allSelected ? 'schedule-grid-event-all-selected' : ''}`}
                              style={{
                                top: `${ev.startSlot * ROW_HEIGHT_PX}px`,
                                height: `${(ev.endSlot - ev.startSlot) * ROW_HEIGHT_PX}px`,
                                borderLeftColor: stageColor,
                              }}
                              onClick={() => setEditingEvent(ev)}
                            >
                              {allSelected && <span className="schedule-grid-event-all-badge" title="Everyone you selected is at this event">Everyone here</span>}
                              <span className="schedule-grid-event-title">{ev.title}</span>
                              {ev.description && <span className="schedule-grid-event-desc">{ev.description}</span>}
                              {attendeeNames.length > 0 && (
                                <span className="schedule-grid-event-attendees">Who&apos;s at this set: {attendeeNames.join(', ')}</span>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </div>
                  );
                })}
                <div className="schedule-grid-stage-col schedule-grid-meetups-col">
                  <div className="schedule-grid-stage-header">Meetups</div>
                  <div className="schedule-grid-stage-cells">
                    {TIME_SLOTS.map((s) => (
                      <div key={s.index} className="schedule-grid-cell" style={{ gridRow: s.index + 1 }} />
                    ))}
                  </div>
                  <div className="schedule-grid-events">
                    {eventsForDay
                      .filter((ev) => ev.event_type === 'meetup' || !ev.stage_id)
                      .map((ev) => {
                        const match = eventMatchesFilter(ev);
                        const allSelected = eventHasAllSelected(ev);
                        const showIds = hasFilter ? (ev.attendee_ids || []).filter((id) => filterMemberIds.has(Number(id))) : (ev.attendee_ids || []);
                        const attendeeNames = showIds.map((id) => members.find((m) => m.id === Number(id))?.name).filter(Boolean);
                        return (
                          <div
                            key={ev.id}
                            className={`schedule-grid-event schedule-grid-event-meetup ${!match ? 'schedule-grid-event-dim' : ''} ${allSelected ? 'schedule-grid-event-all-selected' : ''}`}
                            style={{
                              top: `${ev.startSlot * ROW_HEIGHT_PX}px`,
                              height: `${(ev.endSlot - ev.startSlot) * ROW_HEIGHT_PX}px`,
                            }}
                            onClick={() => setEditingEvent(ev)}
                          >
                            {allSelected && <span className="schedule-grid-event-all-badge" title="Everyone you selected is at this event">Everyone here</span>}
                            <span className="schedule-grid-event-title">{ev.title}</span>
                            {ev.description && <span className="schedule-grid-event-desc">{ev.description}</span>}
                            {attendeeNames.length > 0 && (
                              <span className="schedule-grid-event-attendees">Who&apos;s at this set: {attendeeNames.join(', ')}</span>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile: day bar (arrows + label) above event list; arrows change selected day */}
            <div className="schedule-mobile schedule-grid-wrap">
              <div className="schedule-mobile-day-bar">
                <button
                  type="button"
                  className="schedule-mobile-day-arrow"
                  onClick={() => setSelectedDay(DAYS[Math.max(0, DAYS.indexOf(selectedDay) - 1)])}
                  disabled={DAYS.indexOf(selectedDay) <= 0}
                  aria-label="Previous day"
                >
                  ←
                </button>
                <span className="schedule-mobile-day-label" aria-live="polite">
                  {dayLabel(selectedDay)}
                </span>
                <button
                  type="button"
                  className="schedule-mobile-day-arrow"
                  onClick={() => setSelectedDay(DAYS[Math.min(DAYS.length - 1, DAYS.indexOf(selectedDay) + 1)])}
                  disabled={DAYS.indexOf(selectedDay) >= DAYS.length - 1}
                  aria-label="Next day"
                >
                  →
                </button>
              </div>
              <div className="schedule-mobile-events">
                {eventsForDay.length === 0 ? (
                  <p className="schedule-mobile-empty">No events this day. Add a set or meetup below.</p>
                ) : (
                  [...eventsForDay].sort((a, b) => a.startSlot - b.startSlot).map((ev) => {
                    const match = eventMatchesFilter(ev);
                    const allSelected = eventHasAllSelected(ev);
                    const showIds = hasFilter ? (ev.attendee_ids || []).filter((id) => filterMemberIds.has(Number(id))) : (ev.attendee_ids || []);
                    const attendeeNames = showIds.map((id) => members.find((m) => m.id === Number(id))?.name).filter(Boolean);
                    const isSet = ev.event_type === 'set' && ev.stage_id;
                    const stage = isSet ? stages.find((s) => s.id === ev.stage_id) : null;
                    const stageIdx = stage != null ? stages.findIndex((s) => s.id === ev.stage_id) : -1;
                    const stageColor = stage != null ? getStageColor(stage, stageIdx >= 0 ? stageIdx : 0) : null;
                    return (
                      <div
                        key={ev.id}
                        className={`schedule-mobile-event ${isSet ? 'schedule-mobile-event-set' : 'schedule-mobile-event-meetup'} ${!match ? 'schedule-grid-event-dim' : ''} ${allSelected ? 'schedule-grid-event-all-selected' : ''}`}
                        style={isSet && stageColor ? { borderLeftColor: stageColor } : undefined}
                        onClick={() => setEditingEvent(ev)}
                      >
                        {allSelected && <span className="schedule-grid-event-all-badge" title="Everyone you selected is at this event">Everyone here</span>}
                        <span className="schedule-mobile-event-time">
                          {TIME_SLOTS[ev.startSlot]?.label}
                          {ev.endSlot > ev.startSlot + 1 ? ` – ${TIME_SLOTS[ev.endSlot - 1]?.label}` : ''}
                        </span>
                        <span className="schedule-mobile-event-title">{ev.title}</span>
                        <span className="schedule-mobile-event-stage">{ev.stage_name || (ev.event_type === 'meetup' ? 'Meetup' : '')}</span>
                        {attendeeNames.length > 0 && <span className="schedule-mobile-event-attendees">Who&apos;s at this set: {attendeeNames.join(', ')}</span>}
                        {ev.description && <span className="schedule-mobile-event-desc">{ev.description}</span>}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Add event form */}
            <div className="schedule-actions">
              {!showAddForm ? (
                <button type="button" className="btn btn-primary" onClick={() => setShowAddForm(true)}>
                  + Add set or meetup
                </button>
              ) : (
                <form className="schedule-add-form" onSubmit={addEvent}>
                  <h4 className="schedule-form-title">Add set or meetup</h4>
                  <div className="schedule-form-row">
                    <label>
                      <span className="schedule-form-label">Type</span>
                      <select value={addEventType} onChange={(e) => setAddEventType(e.target.value)} className="select">
                        <option value="set">Set (stage)</option>
                        <option value="meetup">Meetup</option>
                      </select>
                    </label>
                    {addEventType === 'set' && (
                      <label>
                        <span className="schedule-form-label">Stage</span>
                        <select value={addStageId} onChange={(e) => setAddStageId(e.target.value)} className="select" required={addEventType === 'set'}>
                          <option value="">—</option>
                          {stages.map((s) => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      </label>
                    )}
                    <label>
                      <span className="schedule-form-label">Day</span>
                      <select value={addDay} onChange={(e) => setAddDay(e.target.value)} className="select">
                        {DAYS.map((d) => (
                          <option key={d} value={d}>{dayLabel(d)}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="schedule-form-row">
                    <label>
                      <span className="schedule-form-label">Start</span>
                      <select value={addStartSlot} onChange={(e) => setAddStartSlot(Number(e.target.value))} className="select">
                        {TIME_SLOTS.map((s) => (
                          <option key={s.index} value={s.index}>{s.label}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span className="schedule-form-label">End</span>
                      <select value={addEndSlot} onChange={(e) => setAddEndSlot(Number(e.target.value))} className="select">
                        {TIME_SLOTS.map((s) => (
                          <option key={s.index} value={s.index}>{s.label}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="schedule-form-row">
                    <input
                      type="text"
                      placeholder="Artist or event name"
                      value={addTitle}
                      onChange={(e) => setAddTitle(e.target.value)}
                      className="input schedule-form-input-title"
                      required
                    />
                  </div>
                  <div className="schedule-form-row">
                    <input
                      type="text"
                      placeholder="Description / location"
                      value={addDescription}
                      onChange={(e) => setAddDescription(e.target.value)}
                      className="input schedule-form-input-desc"
                    />
                  </div>
                  {goingMembers.length > 0 && (
                    <div className="schedule-form-row">
                      <span className="schedule-form-label">Who&apos;s going</span>
                      <div className="schedule-attendees-checkboxes">
                        {goingMembers.map((m) => (
                          <label key={m.id} className="schedule-attendee-check">
                            <input
                              type="checkbox"
                              checked={addAttendeeIds.includes(m.id)}
                              onChange={(e) => setAddAttendeeIds((prev) => (e.target.checked ? [...prev, m.id] : prev.filter((id) => id !== m.id)))}
                            />
                            <span>{m.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="schedule-form-actions">
                    <button type="submit" className="btn btn-primary">Add</button>
                    <button type="button" className="btn btn-ghost" onClick={() => setShowAddForm(false)}>Cancel</button>
                  </div>
                </form>
              )}
            </div>

            {/* Manage stages */}
            <details className="schedule-stages-manage">
              <summary>Manage stages</summary>
              <form className="schedule-stages-form" onSubmit={addStage}>
                <input
                  type="text"
                  placeholder="New stage name"
                  value={newStageName}
                  onChange={(e) => setNewStageName(e.target.value)}
                  className="input"
                />
                <button type="submit" className="btn btn-primary">Add stage</button>
              </form>
              <ul className="schedule-stages-list">
                {stages.map((s, idx) => (
                  <li key={s.id} className="schedule-stages-item">
                    <span className="schedule-stages-item-name">{s.name}</span>
                    <div className="schedule-stages-color-picker" role="group" aria-label={`Stage color for ${s.name}`}>
                      {STAGE_COLOR_PRESETS.map((hex) => (
                        <button
                          key={hex}
                          type="button"
                          className={`schedule-stage-color-chip ${(s.color || STAGE_COLOR_PRESETS[idx % STAGE_COLOR_PRESETS.length]) === hex ? 'active' : ''}`}
                          style={{ backgroundColor: hex }}
                          onClick={() => updateStageColor(s.id, hex)}
                          title={hex}
                          aria-label={`Set color ${hex}`}
                        />
                      ))}
                      <button
                        type="button"
                        className="schedule-stage-color-chip schedule-stage-color-clear"
                        onClick={() => updateStageColor(s.id, null)}
                        title="Use default color"
                        aria-label="Use default color"
                      >
                        —
                      </button>
                    </div>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeStage(s.id)} aria-label={`Remove ${s.name}`}>×</button>
                  </li>
                ))}
              </ul>
            </details>
          </>
        )}
      </div>

      {/* Edit event modal */}
      {editingEvent && (
        <EditEventModal
          event={editingEvent}
          stages={stages}
          days={DAYS}
          dayLabel={dayLabel}
          timeSlots={TIME_SLOTS}
          timeToSlot={timeToSlot}
          slotToTime={slotToTime}
          goingMembers={goingMembers}
          onClose={() => setEditingEvent(null)}
          onSave={(updates) => updateEvent(editingEvent.id, updates)}
          onRemove={() => removeEvent(editingEvent.id)}
        />
      )}
    </div>
  );
}

function EditEventModal({ event, stages, days, dayLabel, timeSlots, timeToSlot, slotToTime, goingMembers, onClose, onSave, onRemove }) {
  const [day, setDay] = useState(event.day);
  const [startSlot, setStartSlot] = useState(timeToSlot(event.time));
  const [endSlot, setEndSlot] = useState(event.end_time ? timeToSlot(event.end_time) : timeToSlot(event.time) + 1);
  const [title, setTitle] = useState(event.title);
  const [description, setDescription] = useState(event.description || '');
  const [eventType, setEventType] = useState(event.event_type || 'meetup');
  const [stageId, setStageId] = useState(event.stage_id ?? '');
  const [attendeeIds, setAttendeeIds] = useState(() => (event.attendee_ids || []).map((id) => Number(id)));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSave({
      day,
      time: slotToTime(startSlot),
      end_time: endSlot > startSlot ? slotToTime(endSlot) : slotToTime(startSlot + 1),
      title: title.trim(),
      description: description.trim() || null,
      event_type: eventType,
      stage_id: eventType === 'set' && stageId ? Number(stageId) : null,
      attendee_ids: attendeeIds,
    });
  };

  return (
    <div className="modal-backdrop schedule-edit-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="schedule-edit-title">
      <div className="schedule-edit-modal card" onClick={(e) => e.stopPropagation()}>
        <h3 id="schedule-edit-title">Edit event</h3>
        <form onSubmit={handleSubmit}>
          <div className="schedule-form-row">
            <label>
              <span className="schedule-form-label">Type</span>
              <select value={eventType} onChange={(e) => setEventType(e.target.value)} className="select">
                <option value="set">Set</option>
                <option value="meetup">Meetup</option>
              </select>
            </label>
            {eventType === 'set' && (
              <label>
                <span className="schedule-form-label">Stage</span>
                <select value={stageId} onChange={(e) => setStageId(e.target.value)} className="select">
                  <option value="">—</option>
                  {stages.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </label>
            )}
            <label>
              <span className="schedule-form-label">Day</span>
              <select value={day} onChange={(e) => setDay(e.target.value)} className="select">
                {days.map((d) => (
                  <option key={d} value={d}>{dayLabel(d)}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="schedule-form-row">
            <label>
              <span className="schedule-form-label">Start</span>
              <select value={startSlot} onChange={(e) => setStartSlot(Number(e.target.value))} className="select">
                {timeSlots.map((s) => (
                  <option key={s.index} value={s.index}>{s.label}</option>
                ))}
              </select>
            </label>
            <label>
              <span className="schedule-form-label">End</span>
              <select value={endSlot} onChange={(e) => setEndSlot(Number(e.target.value))} className="select">
                {timeSlots.map((s) => (
                  <option key={s.index} value={s.index}>{s.label}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="schedule-form-row">
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="input schedule-form-input-title" required />
          </div>
          <div className="schedule-form-row">
            <input type="text" placeholder="Description / location" value={description} onChange={(e) => setDescription(e.target.value)} className="input schedule-form-input-desc" />
          </div>
          {goingMembers && goingMembers.length > 0 && (
            <div className="schedule-form-row">
              <span className="schedule-form-label">Who&apos;s going</span>
              <div className="schedule-attendees-checkboxes">
                {goingMembers.map((m) => (
                  <label key={m.id} className="schedule-attendee-check">
                    <input
                      type="checkbox"
                      checked={attendeeIds.includes(m.id)}
                      onChange={(e) => setAttendeeIds((prev) => (e.target.checked ? [...prev, m.id] : prev.filter((id) => id !== m.id)))}
                    />
                    <span>{m.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          <div className="schedule-edit-modal-actions">
            <button type="submit" className="btn btn-primary">Save</button>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="button" className="btn btn-ghost schedule-edit-delete" onClick={() => onRemove()}>Delete</button>
          </div>
        </form>
      </div>
    </div>
  );
}

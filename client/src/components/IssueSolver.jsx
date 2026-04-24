import { useEffect, useMemo, useState } from 'react';
import { parseMemberAllergies } from '../utils/memberAllergies';
import { mealAllergenConflicts } from '../utils/mealAllergenConflicts';

function toMinutes(t) {
  if (!t || typeof t !== 'string') return null;
  const [h, m] = t.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

function eventRange(ev) {
  const start = toMinutes(ev.time);
  if (start == null) return null;
  const end = toMinutes(ev.end_time);
  return { start, end: end != null && end > start ? end : start + 30 };
}

function overlaps(a, b) {
  return a.start < b.end && b.start < a.end;
}

function findScheduleConflicts(events, membersById) {
  const byDay = new Map();
  for (const ev of events || []) {
    if (!ev?.day) continue;
    if (!byDay.has(ev.day)) byDay.set(ev.day, []);
    byDay.get(ev.day).push(ev);
  }

  const out = [];
  for (const [day, dayEvents] of byDay.entries()) {
    const perMember = new Map();
    for (const ev of dayEvents) {
      const ids = Array.isArray(ev.attendee_ids) ? ev.attendee_ids : [];
      for (const id of ids) {
        if (!perMember.has(id)) perMember.set(id, []);
        perMember.get(id).push(ev);
      }
    }

    for (const [id, evs] of perMember.entries()) {
      const sorted = evs
        .map((ev) => ({ ev, r: eventRange(ev) }))
        .filter((x) => x.r != null)
        .sort((a, b) => a.r.start - b.r.start);
      let conflictCount = 0;
      for (let i = 0; i < sorted.length - 1; i += 1) {
        if (overlaps(sorted[i].r, sorted[i + 1].r)) conflictCount += 1;
      }
      if (conflictCount > 0) {
        out.push({
          day,
          memberId: Number(id),
          memberName: membersById.get(Number(id))?.name || 'Unknown',
          count: conflictCount,
        });
      }
    }
  }
  return out.sort((a, b) => b.count - a.count || a.day.localeCompare(b.day));
}

export function IssueSolver({ api, onNavigate }) {
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState([]);
  const [events, setEvents] = useState([]);
  const [lists, setLists] = useState([]);
  const [meals, setMeals] = useState([]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`${api}/members`, { credentials: 'include' }).then((r) => (r.ok ? r.json() : [])),
      fetch(`${api}/schedule`, { credentials: 'include' }).then((r) => (r.ok ? r.json() : [])),
      fetch(`${api}/packing/lists`, { credentials: 'include' }).then((r) => (r.ok ? r.json() : [])),
      fetch(`${api}/meals`, { credentials: 'include' }).then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([m, s, p, ml]) => {
        setMembers(Array.isArray(m) ? m : []);
        setEvents(Array.isArray(s) ? s : []);
        setLists(Array.isArray(p) ? p : []);
        setMeals(Array.isArray(ml) ? ml : []);
      })
      .catch(() => {
        setMembers([]);
        setEvents([]);
        setLists([]);
        setMeals([]);
      })
      .finally(() => setLoading(false));
  }, [api]);

  const membersById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);

  const criticalPeople = useMemo(
    () =>
      members
        .filter((m) => m.status === 'going')
        .filter(
          (m) =>
            m.campsite_id == null ||
            m.vehicle_id == null ||
            !String(m.emergency_contact || '').trim()
        )
        .map((m) => ({
          id: m.id,
          name: m.name,
          missing: [
            m.campsite_id == null ? 'camp pass' : null,
            m.vehicle_id == null ? 'ride' : null,
            !String(m.emergency_contact || '').trim() ? 'emergency contact' : null,
          ].filter(Boolean),
        })),
    [members]
  );

  const scheduleConflicts = useMemo(() => findScheduleConflicts(events, membersById), [events, membersById]);

  const packingRisks = useMemo(
    () =>
      lists
        .map((l) => ({
          ...l,
          remaining:
            l.total != null && l.done != null ? Math.max(0, Number(l.total) - Number(l.done)) : 0,
        }))
        .filter((l) => l.remaining > 0)
        .sort((a, b) => b.remaining - a.remaining)
        .slice(0, 6),
    [lists]
  );

  const mealWarnings = useMemo(() => {
    const going = members.filter((m) => m.status === 'going');
    return meals
      .map((meal) => ({
        id: meal.id,
        title: meal.title,
        conflicts: mealAllergenConflicts(meal, going),
      }))
      .filter((x) => x.conflicts.length > 0);
  }, [meals, members]);

  const peopleWithAllergies = useMemo(
    () => members.filter((m) => m.status === 'going' && parseMemberAllergies(m).length > 0).length,
    [members]
  );

  return (
    <section className="section section-issue-solver">
      <div className="card block issue-solver-card">
        <h3 className="card-title">Issue Solver</h3>
        <p className="card-description">Mission Control for problems that can break the trip. Fix the biggest blockers first.</p>
        {loading ? (
          <p className="issue-solver-loading">Scanning your planner data…</p>
        ) : (
          <>
            <div className="issue-solver-summary">
              <span className="issue-pill">People issues: {criticalPeople.length}</span>
              <span className="issue-pill">Schedule conflicts: {scheduleConflicts.length}</span>
              <span className="issue-pill">Packing risks: {packingRisks.length}</span>
              <span className="issue-pill">Meal allergy flags: {mealWarnings.length}</span>
              <span className="issue-pill">People with allergies: {peopleWithAllergies}</span>
            </div>

            <div className="issue-grid">
              <article className="issue-panel">
                <h4 className="issue-title">People missing essentials</h4>
                {criticalPeople.length === 0 ? (
                  <p className="issue-empty">Everyone going has ride, camp pass, and emergency contact.</p>
                ) : (
                  <ul className="issue-list">
                    {criticalPeople.slice(0, 6).map((p) => (
                      <li key={p.id} className="issue-item">
                        <strong>{p.name}</strong> missing: {p.missing.join(', ')}
                      </li>
                    ))}
                  </ul>
                )}
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => onNavigate?.('people')}
                  data-retro-tip="Open People tab"
                  data-status-tip="Go to People to resolve missing details"
                >
                  Fix in People
                </button>
              </article>

              <article className="issue-panel">
                <h4 className="issue-title">Schedule overlaps</h4>
                {scheduleConflicts.length === 0 ? (
                  <p className="issue-empty">No attendee overlaps detected.</p>
                ) : (
                  <ul className="issue-list">
                    {scheduleConflicts.slice(0, 6).map((c, i) => (
                      <li key={`${c.memberId}-${c.day}-${i}`} className="issue-item">
                        <strong>{c.memberName}</strong> has {c.count} overlap{c.count > 1 ? 's' : ''} on {c.day}
                      </li>
                    ))}
                  </ul>
                )}
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => onNavigate?.('schedule')}
                  data-retro-tip="Open Schedule tab"
                  data-status-tip="Go to Schedule to fix overlaps"
                >
                  Open Schedule
                </button>
              </article>

              <article className="issue-panel">
                <h4 className="issue-title">Packing lists at risk</h4>
                {packingRisks.length === 0 ? (
                  <p className="issue-empty">All lists are complete.</p>
                ) : (
                  <ul className="issue-list">
                    {packingRisks.map((l) => (
                      <li key={l.id} className="issue-item">
                        <strong>{l.name}</strong>: {l.remaining} item{l.remaining > 1 ? 's' : ''} left
                      </li>
                    ))}
                  </ul>
                )}
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => onNavigate?.('packing')}
                  data-retro-tip="Open Packing tab"
                  data-status-tip="Go to Packing to finish incomplete lists"
                >
                  Open Packing
                </button>
              </article>

              <article className="issue-panel">
                <h4 className="issue-title">Meal allergy warnings</h4>
                {mealWarnings.length === 0 ? (
                  <p className="issue-empty">No meal/allergy conflicts detected.</p>
                ) : (
                  <ul className="issue-list">
                    {mealWarnings.slice(0, 6).map((m) => (
                      <li key={m.id} className="issue-item">
                        <strong>{m.title}</strong>: {m.conflicts.length} potential conflict{m.conflicts.length > 1 ? 's' : ''}
                      </li>
                    ))}
                  </ul>
                )}
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => onNavigate?.('meals')}
                  data-retro-tip="Open Meals tab"
                  data-status-tip="Go to Meals to resolve allergy warnings"
                >
                  Open Meals
                </button>
              </article>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

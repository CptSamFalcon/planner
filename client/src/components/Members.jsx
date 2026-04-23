import { useState, useEffect } from 'react';
import { formatAllergiesInputValue } from '../utils/memberAllergies';

export function Members({ api }) {
  const [members, setMembers] = useState([]);
  const [name, setName] = useState('');
  const [status, setStatus] = useState('going');
  const [wristband, setWristband] = useState('GA');
  const [note, setNote] = useState('');
  const [allergies, setAllergies] = useState('');
  const [preParty, setPreParty] = useState(false);

  const load = () => {
    fetch(`${api}/members`, { credentials: 'include' })
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data) => setMembers(Array.isArray(data) ? data : []))
      .catch(() => setMembers([]));
  };

  useEffect(load, [api]);

  const goingMembers = members.filter((m) => m.status === 'going');
  const otherMembers = members.filter((m) => m.status !== 'going');

  const add = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    const body = {
      name: name.trim(),
      status,
      wristband,
      note: note.trim() || null,
      pre_party: preParty ? 1 : 0,
      ...(allergies.trim() ? { allergies: allergies.trim() } : {}),
    };
    fetch(`${api}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
    })
      .then((r) => r.json())
      .then((m) => setMembers((prev) => [...prev, m]))
      .then(() => {
        setName('');
        setNote('');
        setAllergies('');
        setStatus('going');
        setWristband('GA');
        setPreParty(false);
      })
      .catch(console.error);
  };

  const updateMember = (id, updates) => {
    fetch(`${api}/members/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(updates),
    })
      .then((r) => r.json())
      .then((updated) => setMembers((prev) => prev.map((m) => (m.id === id ? updated : m))))
      .catch(console.error);
  };

  const updateStatus = (id, newStatus) => {
    updateMember(id, { status: newStatus });
  };

  const remove = (id) => {
    fetch(`${api}/members/${id}`, { method: 'DELETE', credentials: 'include' })
      .then(() => setMembers((prev) => prev.filter((m) => m.id !== id)))
      .catch(console.error);
  };

  return (
    <div className="card block">
      <h3 className="card-title">Who&apos;s Going</h3>
      <p className="card-description">Add people and set their status. Food allergies (optional) are saved per person below; they appear on the <strong>Meals</strong> tab when set. Assign campsites, shelter, bed, bedding, and vehicle on the <strong>Group</strong> page.</p>

      <form className="form-row form-add-member" onSubmit={add}>
        <input
          type="text"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="input"
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="select">
          <option value="going">Going</option>
          <option value="maybe">Maybe</option>
          <option value="not-going">Not going</option>
        </select>
        <select value={wristband} onChange={(e) => setWristband(e.target.value)} className="select">
          <option value="GA">GA</option>
          <option value="VIP">VIP</option>
        </select>
        <label className="form-checkbox-label">
          <input
            type="checkbox"
            checked={preParty}
            onChange={(e) => setPreParty(e.target.checked)}
            className="form-checkbox"
          />
          Pre-Party
        </label>
        <input
          type="text"
          placeholder="Note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="input input-note"
        />
        <input
          type="text"
          placeholder="Allergens (optional)"
          value={allergies}
          onChange={(e) => setAllergies(e.target.value)}
          className="input input-note"
          aria-label="Allergens (optional)"
        />
        <button type="submit" className="btn btn-primary">Add</button>
      </form>

      <div className="members-list-section">
        <h4 className="members-list-title">People ({members.length})</h4>
        <ul className="member-list options-list options-list--people-rows">
          {goingMembers.map((m) => (
            <li key={m.id} className="member-item member-item-compact options-item member-person-card">
              <div className="member-person-main">
                <span className="member-name">{m.name}</span>
                {m.note && <span className="member-note">{m.note}</span>}
                {m.pre_party ? <span className="member-badge">Pre-Party</span> : null}
                <select
                  value={m.wristband === 'VIP' ? 'VIP' : 'GA'}
                  onChange={(e) => updateMember(m.id, { wristband: e.target.value })}
                  className="select select-inline"
                >
                  <option value="GA">GA</option>
                  <option value="VIP">VIP</option>
                </select>
                <select
                  value={m.status}
                  onChange={(e) => updateStatus(m.id, e.target.value)}
                  className="select select-inline"
                >
                  <option value="going">Going</option>
                  <option value="maybe">Maybe</option>
                  <option value="not-going">Not going</option>
                </select>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => remove(m.id)} aria-label="Delete">×</button>
              </div>
              <div className="member-person-allergies">
                <label className="member-person-allergies-label" htmlFor={`member-allergies-${m.id}`}>Allergens</label>
                <input
                  id={`member-allergies-${m.id}`}
                  type="text"
                  className="input input-sm member-person-allergies-input"
                  defaultValue={formatAllergiesInputValue(m)}
                  key={`allergies-field-${m.id}-${m.allergies ?? ''}`}
                  placeholder="e.g. peanuts, dairy (optional)"
                  onBlur={(e) => updateMember(m.id, { allergies: e.target.value })}
                  aria-label={`Food allergens for ${m.name}`}
                />
              </div>
            </li>
          ))}
          {otherMembers.map((m) => (
            <li key={m.id} className="member-item member-item-compact options-item member-person-card">
              <div className="member-person-main">
                <span className="member-name">{m.name}</span>
                {m.note && <span className="member-note">{m.note}</span>}
                <select
                  value={m.wristband === 'VIP' ? 'VIP' : 'GA'}
                  onChange={(e) => updateMember(m.id, { wristband: e.target.value })}
                  className="select select-inline"
                >
                  <option value="GA">GA</option>
                  <option value="VIP">VIP</option>
                </select>
                <select
                  value={m.status}
                  onChange={(e) => updateStatus(m.id, e.target.value)}
                  className="select select-inline"
                >
                  <option value="going">Going</option>
                  <option value="maybe">Maybe</option>
                  <option value="not-going">Not going</option>
                </select>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => remove(m.id)} aria-label="Delete">×</button>
              </div>
              <div className="member-person-allergies">
                <label className="member-person-allergies-label" htmlFor={`member-allergies-${m.id}`}>Allergens</label>
                <input
                  id={`member-allergies-${m.id}`}
                  type="text"
                  className="input input-sm member-person-allergies-input"
                  defaultValue={formatAllergiesInputValue(m)}
                  key={`allergies-field-${m.id}-${m.allergies ?? ''}`}
                  placeholder="e.g. peanuts, dairy (optional)"
                  onBlur={(e) => updateMember(m.id, { allergies: e.target.value })}
                  aria-label={`Food allergens for ${m.name}`}
                />
              </div>
            </li>
          ))}
        </ul>
        {members.length === 0 && <p className="options-empty">No people yet. Add someone above.</p>}
      </div>
    </div>
  );
}

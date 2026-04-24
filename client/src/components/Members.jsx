import { useState, useEffect, useRef } from 'react';
import { formatAllergiesInputValue } from '../utils/memberAllergies';

function hasAllergiesValue(member) {
  return formatAllergiesInputValue(member).trim() !== '';
}

function MemberPersonRow({ m, isGoing, updateMember, updateStatus, remove, editingAllergyId, setEditingAllergyId }) {
  const skipSaveBlur = useRef(false);
  const hasAll = hasAllergiesValue(m);
  const isEditing = editingAllergyId === m.id;

  return (
    <li className="member-item member-item-compact options-item member-person-card">
      <div className="member-person-top">
        <h2 className="member-person-title" id={`member-name-${m.id}`}>
          {m.name}
        </h2>
        <div className="member-person-toolbar">
          <select
            value={m.wristband === 'VIP' ? 'VIP' : 'GA'}
            onChange={(e) => updateMember(m.id, { wristband: e.target.value })}
            className="select select-inline"
            aria-labelledby={`member-name-${m.id}`}
          >
            <option value="GA">GA</option>
            <option value="VIP">VIP</option>
          </select>
          <select
            value={m.status}
            onChange={(e) => updateStatus(m.id, e.target.value)}
            className="select select-inline"
            aria-label={`Status for ${m.name}`}
          >
            <option value="going">Going</option>
            <option value="maybe">Maybe</option>
            <option value="not-going">Not going</option>
          </select>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => remove(m.id)}
            aria-label={`Delete ${m.name}`}
            data-retro-tip={`Delete ${m.name}`}
            data-status-tip={`Delete person: ${m.name}`}
          >
            ×
          </button>
        </div>
      </div>
      {m.note ? <p className="member-person-note">{m.note}</p> : null}
      {isGoing && m.pre_party ? <span className="member-badge">Pre-Party</span> : null}
      <div className="member-person-allergies">
        {isEditing ? (
          <input
            key={`allergy-edit-${m.id}`}
            type="text"
            className="input input-sm member-allergy-input"
            defaultValue={formatAllergiesInputValue(m)}
            autoFocus
            placeholder="e.g. peanuts, dairy"
            aria-label={`Food allergens for ${m.name}`}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault();
                skipSaveBlur.current = true;
                setEditingAllergyId(null);
              }
            }}
            onBlur={(e) => {
              if (skipSaveBlur.current) {
                skipSaveBlur.current = false;
                return;
              }
              updateMember(m.id, { allergies: e.target.value.trim() || null });
              setEditingAllergyId(null);
            }}
          />
        ) : hasAll ? (
          <div className="member-allergy-saved">
            <span className="member-allergy-label">Allergies:</span>
            <span className="member-allergy-text">{formatAllergiesInputValue(m)}</span>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setEditingAllergyId(m.id)}
              data-retro-tip={`Edit allergies for ${m.name}`}
              data-status-tip={`Edit allergies for ${m.name}`}
            >
              Edit
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => updateMember(m.id, { allergies: null })}
              data-retro-tip={`Remove allergies for ${m.name}`}
              data-status-tip={`Remove allergies for ${m.name}`}
            >
              Remove
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="btn btn-secondary btn-sm member-allergy-add"
            onClick={() => setEditingAllergyId(m.id)}
            data-retro-tip={`Add allergies for ${m.name}`}
            data-status-tip={`Add allergies for ${m.name}`}
          >
            + Add allergy
          </button>
        )}
      </div>
    </li>
  );
}

export function Members({ api }) {
  const [members, setMembers] = useState([]);
  const [name, setName] = useState('');
  const [status, setStatus] = useState('going');
  const [wristband, setWristband] = useState('GA');
  const [note, setNote] = useState('');
  const [preParty, setPreParty] = useState(false);
  const [editingAllergyId, setEditingAllergyId] = useState(null);

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
    };
    fetch(`${api}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
    })
      .then((r) => r.json())
      .then((member) => setMembers((prev) => [...prev, member]))
      .then(() => {
        setName('');
        setNote('');
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
      .then((updated) => {
        setMembers((prev) => prev.map((m) => (m.id === id ? updated : m)));
      })
      .catch(console.error);
  };

  const updateStatus = (id, newStatus) => {
    updateMember(id, { status: newStatus });
  };

  const remove = (id) => {
    if (editingAllergyId === id) setEditingAllergyId(null);
    fetch(`${api}/members/${id}`, { method: 'DELETE', credentials: 'include' })
      .then(() => setMembers((prev) => prev.filter((m) => m.id !== id)))
      .catch(console.error);
  };

  return (
    <div className="card block">
      <h3 className="card-title">Who&apos;s Going</h3>
      <p className="card-description">
        Add people and set their status. Use <strong>+ Add allergy</strong> on a person when you need to record food allergies; they also show on the <strong>Meals</strong> tab. Assign
        campsites, shelter, bed, bedding, and vehicle on the <strong>Campsites</strong> tab.
      </p>

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
        <button type="submit" className="btn btn-primary">Add</button>
      </form>

      <div className="members-list-section">
        <h4 className="members-list-title">People ({members.length})</h4>
        <ul className="member-list options-list options-list--people-rows">
          {goingMembers.map((m) => (
            <MemberPersonRow
              key={m.id}
              m={m}
              isGoing
              updateMember={updateMember}
              updateStatus={updateStatus}
              remove={remove}
              editingAllergyId={editingAllergyId}
              setEditingAllergyId={setEditingAllergyId}
            />
          ))}
          {otherMembers.map((m) => (
            <MemberPersonRow
              key={m.id}
              m={m}
              isGoing={false}
              updateMember={updateMember}
              updateStatus={updateStatus}
              remove={remove}
              editingAllergyId={editingAllergyId}
              setEditingAllergyId={setEditingAllergyId}
            />
          ))}
        </ul>
        {members.length === 0 && <p className="options-empty">No people yet. Add someone above.</p>}
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';

export function Members({ api }) {
  const [members, setMembers] = useState([]);
  const [name, setName] = useState('');
  const [status, setStatus] = useState('going');
  const [wristband, setWristband] = useState('GA');
  const [note, setNote] = useState('');
  const [preParty, setPreParty] = useState(false);

  const load = () => {
    fetch(`${api}/members`).then((r) => r.json()).then(setMembers).catch(() => setMembers([]));
  };

  useEffect(load, [api]);

  const goingMembers = members.filter((m) => m.status === 'going');
  const otherMembers = members.filter((m) => m.status !== 'going');

  const add = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    const body = { name: name.trim(), status, wristband, note: note.trim() || null, pre_party: preParty ? 1 : 0 };
    fetch(`${api}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
      .then((r) => r.json())
      .then((m) => setMembers((prev) => [...prev, m]))
      .then(() => { setName(''); setNote(''); setStatus('going'); setWristband('GA'); setPreParty(false); })
      .catch(console.error);
  };

  const updateMember = (id, updates) => {
    fetch(`${api}/members/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
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
    fetch(`${api}/members/${id}`, { method: 'DELETE' })
      .then(() => setMembers((prev) => prev.filter((m) => m.id !== id)))
      .catch(console.error);
  };

  return (
    <div className="card block">
      <h3 className="card-title">Who&apos;s Going</h3>
      <p className="card-description">Add people and set their status. Assign campsites, shelter, bed, bedding, and vehicle on the <strong>Group</strong> page.</p>

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
        <ul className="member-list options-list">
          {goingMembers.map((m) => (
            <li key={m.id} className="member-item member-item-compact options-item">
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
            </li>
          ))}
          {otherMembers.map((m) => (
            <li key={m.id} className="member-item member-item-compact options-item">
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
            </li>
          ))}
        </ul>
        {members.length === 0 && <p className="options-empty">No people yet. Add someone above.</p>}
      </div>
    </div>
  );
}

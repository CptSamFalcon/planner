import { useState, useEffect } from 'react';

export function IdentityPicker({ api, onIdentified }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  const load = () => {
    setLoading(true);
    fetch(`${api}/members`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Could not load people'))))
      .then((data) => setMembers(Array.isArray(data) ? data : []))
      .catch((e) => setError(e.message || 'Could not load people'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [api]);

  const choose = (memberId) => {
    setError('');
    fetch(`${api}/me`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ member_id: memberId }),
    })
      .then(async (r) => {
        if (!r.ok) {
          const b = await r.json().catch(() => ({}));
          throw new Error(b.error || 'Could not save your choice');
        }
        onIdentified();
      })
      .catch((e) => setError(e.message || 'Something went wrong'));
  };

  const createAndChoose = (e) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setError('');
    setCreating(true);
    fetch(`${api}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name, status: 'going', wristband: 'GA', pre_party: 0 }),
    })
      .then(async (r) => {
        if (!r.ok) throw new Error('Could not add person');
        return r.json();
      })
      .then((member) =>
        fetch(`${api}/me`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ member_id: member.id }),
        })
      )
      .then(async (r) => {
        if (!r.ok) {
          const b = await r.json().catch(() => ({}));
          throw new Error(b.error || 'Could not link this device to your profile');
        }
        setNewName('');
        onIdentified();
      })
      .catch((e) => setError(e.message || 'Something went wrong'))
      .finally(() => setCreating(false));
  };

  return (
    <div className="password-gate profile-gate">
      <div className="password-gate-card profile-gate-card profile-gate-card--wide">
        <h1 className="password-gate-title">Who are you?</h1>
        <p className="password-gate-subtitle">
          Pick yourself from the crew list, or add your name if you are not on it yet. You will set your festival profile next.
        </p>
        {error ? (
          <p className="password-gate-error" role="alert">
            {error}
          </p>
        ) : null}
        {loading ? (
          <p className="password-gate-subtitle">Loading…</p>
        ) : (
          <>
            <ul className="profile-identity-list" aria-label="Crew members">
              {members.map((m) => (
                <li key={m.id} className="profile-identity-row">
                  <span className="profile-identity-name">{m.name}</span>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => choose(m.id)}
                  >
                    This is me
                  </button>
                </li>
              ))}
            </ul>
            {members.length === 0 ? (
              <p className="password-gate-subtitle">No one is on the list yet. Add yourself below.</p>
            ) : null}
            <form className="profile-identity-new" onSubmit={createAndChoose}>
              <label className="password-gate-label" htmlFor="profile-new-name">
                New person
              </label>
              <div className="profile-identity-new-row">
                <input
                  id="profile-new-name"
                  type="text"
                  className="input password-gate-input"
                  placeholder="Your name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  disabled={creating}
                  maxLength={120}
                />
                <button type="submit" className="btn btn-secondary" disabled={creating || !newName.trim()}>
                  {creating ? 'Adding…' : 'Add me'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

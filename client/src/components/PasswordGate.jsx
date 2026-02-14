import { useState } from 'react';

export function PasswordGate({ api, onAuthenticated }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    fetch(`${api}/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ password }),
    })
      .then((r) => {
        if (r.ok) {
          setPassword('');
          onAuthenticated();
        } else {
          setError('Wrong password');
        }
      })
      .catch(() => setError('Something went wrong'))
      .finally(() => setSubmitting(false));
  };

  return (
    <div className="password-gate">
      <div className="password-gate-card">
        <h1 className="password-gate-title">BASS CANYON 2026</h1>
        <p className="password-gate-subtitle">Group Planner</p>
        <form className="password-gate-form" onSubmit={handleSubmit}>
          <label htmlFor="gate-password" className="password-gate-label">
            Enter password
          </label>
          <input
            id="gate-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(''); }}
            className="input password-gate-input"
            placeholder="Password"
            disabled={submitting}
            autoFocus
          />
          {error && <p className="password-gate-error" role="alert">{error}</p>}
          <button type="submit" className="btn btn-primary password-gate-btn" disabled={submitting}>
            {submitting ? 'Checking…' : 'Enter'}
          </button>
        </form>
      </div>
    </div>
  );
}

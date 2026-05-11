import { useState } from 'react';

export function PasswordGate({ api, onAuthenticated }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('Enter a password');
      return;
    }
    setError('');
    setSubmitting(true);
    fetch(`${api}/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ password }),
    })
      .then(async (r) => {
        if (r.ok) {
          setPassword('');
          onAuthenticated();
          return;
        }
        let msg = 'Wrong password';
        try {
          const body = await r.json();
          if (body?.error === 'Password not configured') {
            msg = 'Server has no password configured. Set PLANNER_PASSWORD on the server.';
          } else if (body?.error) {
            msg = body.error;
          }
        } catch (_) {
          if (r.status === 503) msg = 'Server is not ready (password not configured).';
        }
        setError(msg);
      })
      .catch(() => setError('Cannot reach the server. Is it running, and is the app URL correct?'))
      .finally(() => setSubmitting(false));
  };

  return (
    <div className="password-gate">
      <div className="password-gate-card">
        <p className="password-gate-hint">Hint: he&apos;s the coolest (camel).</p>
        {import.meta.env.DEV && (
          <p className="password-gate-devhint">
            Local dev: if you have not set <code>PLANNER_PASSWORD</code> on the server, the default password is{' '}
            <code>joecamel</code>.
          </p>
        )}
        {!import.meta.env.DEV && (
          <p className="password-gate-devhint password-gate-devhint--prod">
            Use the password your host set (<code>PLANNER_PASSWORD</code> on the server). If the page loads but
            nothing works after login, the server may need <code>PLANNER_COOKIE_SECURE=false</code> when not using HTTPS.
          </p>
        )}
        <form className="password-gate-form" onSubmit={handleSubmit}>
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
          <button
            type="submit"
            className="btn btn-primary password-gate-btn"
            disabled={submitting || !password.trim()}
          >
            {submitting ? 'Checking…' : 'Enter'}
          </button>
        </form>
      </div>
    </div>
  );
}

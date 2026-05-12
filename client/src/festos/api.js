const API = '/api/festos';

export async function festosFetch(path, options = {}) {
  const { json, ...rest } = options;
  const headers = { ...(rest.headers || {}) };
  if (json !== undefined) {
    headers['Content-Type'] = 'application/json';
    rest.body = JSON.stringify(json);
  }
  const r = await fetch(`${API}${path}`, {
    ...rest,
    headers,
    credentials: 'include',
  });
  const text = await r.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: text };
    }
  }
  if (!r.ok) {
    const err = new Error(data?.error || r.statusText || 'Request failed');
    err.status = r.status;
    err.body = data;
    throw err;
  }
  return data;
}

export function festosLogout() {
  return festosFetch('/auth/logout', { method: 'POST' });
}

export function festosMe() {
  return festosFetch('/auth/me');
}

import { useState, useEffect } from 'react';

export function Notes({ api }) {
  const [notes, setNotes] = useState([]);
  const [content, setContent] = useState('');

  const load = () => {
    fetch(`${api}/notes`).then((r) => r.json()).then(setNotes).catch(() => setNotes([]));
  };

  useEffect(load, [api]);

  const add = (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    fetch(`${api}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: content.trim() }),
    })
      .then((r) => r.json())
      .then((n) => setNotes((prev) => [n, ...prev]))
      .then(() => setContent(''))
      .catch(console.error);
  };

  const remove = (id) => {
    fetch(`${api}/notes/${id}`, { method: 'DELETE' })
      .then(() => setNotes((prev) => prev.filter((n) => n.id !== id)))
      .catch(console.error);
  };

  return (
    <div className="card block">
      <h3 className="card-title">Group Notes & Announcements</h3>
      <form className="form-row" onSubmit={add}>
        <input
          type="text"
          placeholder="Add a note (meetup spot, camp info, etc.)…"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="input input-full"
        />
        <button type="submit" className="btn btn-primary">Add</button>
      </form>
      <ul className="notes-list">
        {notes.map((n) => (
          <li key={n.id} className="note-item">
            <p className="note-content">{n.content}</p>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => remove(n.id)} aria-label="Remove">×</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

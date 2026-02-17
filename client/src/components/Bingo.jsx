import { useState, useEffect, useCallback } from 'react';

// 5x5 grid: rows, columns, and both diagonals (indices 0–24)
const BINGO_LINES = [
  [0, 1, 2, 3, 4], [5, 6, 7, 8, 9], [10, 11, 12, 13, 14], [15, 16, 17, 18, 19], [20, 21, 22, 23, 24],
  [0, 5, 10, 15, 20], [1, 6, 11, 16, 21], [2, 7, 12, 17, 22], [3, 8, 13, 18, 23], [4, 9, 14, 19, 24],
  [0, 6, 12, 18, 24], [4, 8, 12, 16, 20],
];

function getWinningLineIndices(checked) {
  const set = new Set();
  for (const line of BINGO_LINES) {
    if (line.every((i) => !!checked[String(i)])) line.forEach((i) => set.add(i));
  }
  return set;
}

export function Bingo({ api }) {
  const [members, setMembers] = useState([]);
  const [selectedMemberId, setSelectedMemberId] = useState(null);
  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);

  useEffect(() => {
    fetch(`${api}/members`, { credentials: 'include' })
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data) => setMembers(Array.isArray(data) ? data : []))
      .catch(() => setMembers([]));
  }, [api]);

  const refreshLeaderboard = useCallback(() => {
    fetch(`${api}/bingo/leaderboard`, { credentials: 'include' })
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data) => setLeaderboard(Array.isArray(data) ? data : []))
      .catch(() => setLeaderboard([]));
  }, [api]);

  useEffect(() => {
    refreshLeaderboard();
  }, [refreshLeaderboard]);

  const goingMembers = members.filter((m) => m.status === 'going');

  useEffect(() => {
    if (selectedMemberId == null || selectedMemberId === '') {
      setBoard(null);
      return;
    }
    setLoading(true);
    fetch(`${api}/bingo/board/${selectedMemberId}`, { credentials: 'include' })
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data) => { setBoard(data); setLoading(false); })
      .catch(() => { setBoard(null); setLoading(false); });
  }, [api, selectedMemberId]);

  useEffect(() => {
    if (!board || selectedMemberId == null) return;
    if (getWinningLineIndices(board.checked).size === 0) return;
    fetch(`${api}/bingo/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ memberId: selectedMemberId }),
    })
      .then((r) => r.json())
      .then(() => refreshLeaderboard())
      .catch(() => {});
  }, [api, board, selectedMemberId, refreshLeaderboard]);

  const toggleTile = (tileIndex) => {
    if (selectedMemberId == null || board == null) return;
    fetch(`${api}/bingo/board/${selectedMemberId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ tileIndex }),
    })
      .then((r) => r.json())
      .then((data) => {
        setBoard((prev) => (prev ? { ...prev, checked: data.checked } : null));
        refreshLeaderboard();
      })
      .catch(console.error);
  };

  const refreshBoard = () => {
    if (selectedMemberId != null) {
      setLoading(true);
      fetch(`${api}/bingo/board/${selectedMemberId}`, { credentials: 'include' })
        .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
        .then((data) => { setBoard(data); setLoading(false); })
        .catch(() => { setBoard(null); setLoading(false); });
    }
  };

  return (
    <section className="section section-bingo">
      <div className="card block bingo-card">
        <div className="bingo-card-header-row">
          <div>
            <h3 className="card-title">Festival Bingo</h3>
                <p className="card-description">
              Each person has their own board with the same items in random order. Select someone and tap tiles to check them off.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-ghost bingo-configure-btn"
            onClick={() => setConfigOpen(true)}
          >
            Configure
          </button>
        </div>

        <div className="bingo-person-row">
          <label htmlFor="bingo-person-select" className="bingo-person-label">Person</label>
          <select
            id="bingo-person-select"
            className="select bingo-person-select"
            value={selectedMemberId ?? ''}
            onChange={(e) => setSelectedMemberId(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">— Select someone —</option>
            {goingMembers.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>

        {goingMembers.length === 0 && (
          <p className="bingo-empty">Add people in People and set them to &quot;Going&quot; to play bingo.</p>
        )}

        {selectedMemberId != null && goingMembers.length > 0 && (
          <>
            {loading && <p className="bingo-loading">Loading board…</p>}
            {!loading && board && (() => {
              const winningIndices = getWinningLineIndices(board.checked);
              const hasBingo = winningIndices.size > 0;
              return (
                <>
                  {hasBingo && (
                    <p className="bingo-win" role="status" aria-live="polite">
                      Bingo!
                    </p>
                  )}
                  <div className="bingo-board" role="grid" aria-label={`Bingo board for ${goingMembers.find((m) => m.id === selectedMemberId)?.name}${hasBingo ? '. Bingo!' : ''}`}>
                    {board.tiles.map((tile) => {
                      const checked = !!board.checked[String(tile.index)];
                      const isWinning = winningIndices.has(tile.index);
                      return (
                        <button
                          key={tile.index}
                          type="button"
                          className={`bingo-tile ${checked ? 'bingo-tile--checked' : ''} ${isWinning ? 'bingo-tile--win' : ''}`}
                          onClick={() => toggleTile(tile.index)}
                          aria-pressed={checked}
                          aria-label={checked ? `${tile.label} (marked)` : tile.label}
                        >
                          <span className="bingo-tile-label">{tile.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </>
              );
            })()}
          </>
        )}
      </div>

      <div className="card block bingo-leaderboard-card">
        <h3 className="card-title">Leaderboard</h3>
        <p className="card-description">First to get bingo wins. Order is when each person completed a line.</p>
        {leaderboard.length === 0 ? (
          <p className="bingo-leaderboard-empty">No one has gotten bingo yet.</p>
        ) : (
          <ol className="bingo-leaderboard-list">
            {leaderboard.map((entry) => (
              <li key={entry.memberId} className="bingo-leaderboard-item">
                <span className="bingo-leaderboard-rank">{entry.rank}</span>
                <span className="bingo-leaderboard-name">{entry.name}</span>
                {entry.completedAt && (
                  <span className="bingo-leaderboard-time">
                    {new Date(entry.completedAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                  </span>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>

      {configOpen && (
        <BingoConfigureModal
          api={api}
          onClose={() => setConfigOpen(false)}
          onSaved={() => {
            setConfigOpen(false);
            refreshBoard();
          }}
        />
      )}
    </section>
  );
}

function BingoConfigureModal({ api, onClose, onSaved }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`${api}/bingo/items`, { credentials: 'include' })
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data) => setItems(Array.isArray(data) ? data.map((i) => ({ ...i, label: i.label || '' })) : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [api]);

  const setItemLabel = (id, label) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, label } : i)));
  };

  const save = () => {
    setSaving(true);
    const promises = items.map((item) =>
      fetch(`${api}/bingo/items/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ label: item.label.trim() || item.label }),
      })
    );
    Promise.all(promises)
      .then(() => onSaved())
      .catch(console.error)
      .finally(() => setSaving(false));
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="bingo-configure-title">
      <div className="modal bingo-configure-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 id="bingo-configure-title" className="card-title">Edit Bingo Tiles</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="modal-body">
          {loading ? (
            <p className="bingo-loading">Loading…</p>
          ) : (
            <>
              <p className="bingo-configure-hint">Item 21 is always the center tile on every board. Edit labels below; changes apply to all boards.</p>
              <ul className="bingo-configure-list">
              {items.map((item) => (
                <li key={item.id} className="bingo-configure-item">
                  <label htmlFor={`bingo-item-${item.id}`} className="bingo-configure-item-label">
                    {typeof item.sort_order === 'number' ? `Item ${item.sort_order + 1}${item.label === 'FREE SPACE' ? ' (center)' : ''}` : `Tile ${item.id}`}
                  </label>
                  <input
                    id={`bingo-item-${item.id}`}
                    type="text"
                    className="input bingo-configure-input"
                    value={item.label}
                    onChange={(e) => setItemLabel(item.id, e.target.value)}
                    placeholder="Label"
                  />
                </li>
              ))}
              </ul>
            </>
          )}
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn-primary" onClick={save} disabled={loading || saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

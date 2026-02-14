import { useState, useEffect } from 'react';

const ITEM_TYPES = [
  { value: '', label: '—' },
  { value: 'bed', label: 'Bed' },
  { value: 'bedding', label: 'Bedding' },
  { value: 'shelter', label: 'Shelter' },
  { value: 'site_furniture', label: 'Site/Furniture' },
  { value: 'food', label: 'Food' },
  { value: 'cooking', label: 'Cooking' },
  { value: 'other', label: 'Other' },
];

const TYPE_ORDER = ['bed', 'bedding', 'shelter', 'site_furniture', 'food', 'cooking', 'other', ''];

export function Packing({ api, campsites = [], selectedCampsiteId, onSelectedCampsiteIdChange }) {
  const [items, setItems] = useState([]);
  const [label, setLabel] = useState('');
  const [itemType, setItemType] = useState('');
  const [occupants, setOccupants] = useState('');
  const [campsitesList, setCampsitesList] = useState(campsites);

  useEffect(() => {
    if (campsites?.length) setCampsitesList(campsites);
    else fetch(`${api}/campsites`).then((r) => r.json()).then(setCampsitesList).catch(() => setCampsitesList([]));
  }, [api, campsites]);

  const load = () => {
    const url = selectedCampsiteId == null || selectedCampsiteId === ''
      ? `${api}/packing`
      : `${api}/packing?campsite_id=${selectedCampsiteId}`;
    fetch(url).then((r) => r.json()).then(setItems).catch(() => setItems([]));
  };

  useEffect(load, [api, selectedCampsiteId]);

  const add = (e) => {
    e.preventDefault();
    if (!label.trim()) return;
    const body = { label: label.trim() };
    if (selectedCampsiteId != null && selectedCampsiteId !== '') {
      body.campsite_id = selectedCampsiteId;
    }
    if (itemType && itemType !== '') {
      body.item_type = itemType;
    }
    if (itemType === 'shelter' && occupants !== '') {
      const n = parseInt(occupants, 10);
      if (!Number.isNaN(n) && n > 0) body.occupants = n;
    }
    fetch(`${api}/packing`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
      .then((r) => r.json())
      .then((item) => setItems((prev) => [...prev, item]))
      .then(() => { setLabel(''); setItemType(''); setOccupants(''); })
      .catch(console.error);
  };

  const toggle = (id, done) => {
    fetch(`${api}/packing/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ done: !done }),
    })
      .then((r) => r.json())
      .then((updated) => setItems((prev) => prev.map((i) => (i.id === id ? updated : i))))
      .catch(console.error);
  };

  const remove = (id) => {
    fetch(`${api}/packing/${id}`, { method: 'DELETE' })
      .then(() => setItems((prev) => prev.filter((i) => i.id !== id)))
      .catch(console.error);
  };

  const updateType = (id, newType) => {
    fetch(`${api}/packing/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_type: newType || null }),
    })
      .then((r) => r.json())
      .then((updated) => setItems((prev) => prev.map((i) => (i.id === id ? updated : i))))
      .catch(console.error);
  };

  const updateOccupants = (id, value) => {
    const n = value === '' ? null : parseInt(value, 10);
    fetch(`${api}/packing/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ occupants: value === '' ? null : (Number.isNaN(n) ? null : n) }),
    })
      .then((r) => r.json())
      .then((updated) => setItems((prev) => prev.map((i) => (i.id === id ? updated : i))))
      .catch(console.error);
  };

  const list = campsitesList || campsites;
  const currentLabel = selectedCampsiteId == null || selectedCampsiteId === ''
    ? 'General'
    : list.find((c) => c.id === selectedCampsiteId)?.name ?? 'Campsite';

  const typeLabel = (t) => (t === '' ? 'Other' : (ITEM_TYPES.find((o) => o.value === t)?.label || 'Other'));
  const byType = TYPE_ORDER.reduce((acc, t) => {
    const key = t || '';
    acc[key] = items.filter((i) => (i.item_type || '') === key);
    return acc;
  }, {});

  return (
    <div className="card block">
      <h3 className="card-title">Packing Lists</h3>
      <p className="card-description">Each camp has its own list. Pick a camp below or click &quot;Pack list&quot; on a campsite above.</p>
      <div className="packing-campsite-picker">
        <label className="packing-picker-label">List for</label>
        <select
          value={selectedCampsiteId ?? ''}
          onChange={(e) => onSelectedCampsiteIdChange(e.target.value ? Number(e.target.value) : null)}
          className="select packing-picker-select"
        >
          <option value="">General</option>
          {(list || []).map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
      <p className="packing-current-label">Packing list: <strong>{currentLabel}</strong></p>
      <form className="form-row packing-add-form" onSubmit={add}>
        <select
          value={itemType}
          onChange={(e) => setItemType(e.target.value)}
          className="select packing-type-select"
          title="Item type"
        >
          {ITEM_TYPES.map((opt) => (
            <option key={opt.value || 'none'} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        {itemType === 'shelter' && (
          <div className="packing-add-occupants">
            <label className="packing-occupants-label" htmlFor="add-occupants">Occupants</label>
            <input
              id="add-occupants"
              type="number"
              min={1}
              placeholder="#"
              value={occupants}
              onChange={(e) => setOccupants(e.target.value)}
              className="input packing-occupants-input"
            />
          </div>
        )}
        <input
          type="text"
          placeholder="Add item…"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="input"
        />
        <button type="submit" className="btn btn-primary">Add</button>
      </form>
      <div className="packing-by-type">
        {TYPE_ORDER.map((t) => {
          const typeItems = byType[t || ''];
          if (!typeItems || typeItems.length === 0) return null;
          const label = typeLabel(t || '');
          return (
            <div key={t || 'none'} className="packing-type-group">
              <h4 className="packing-type-group-title">{label}</h4>
              <ul className="packing-list">
                {typeItems.map((i) => (
                  <li key={i.id} className={`packing-item ${i.done ? 'done' : ''}`}>
                    <button
                      type="button"
                      className="packing-check"
                      onClick={() => toggle(i.id, i.done)}
                      aria-label={i.done ? 'Mark not done' : 'Mark done'}
                    >
                      {i.done ? '✓' : ''}
                    </button>
                    <span className="packing-label">{i.label}</span>
                    {(i.item_type || '') === 'shelter' && (
                      <span className="packing-item-occupants">
                        <label className="packing-occupants-label-inline" htmlFor={`occupants-${i.id}`}>Occupants</label>
                        <input
                          id={`occupants-${i.id}`}
                          type="number"
                          min={1}
                          value={i.occupants ?? ''}
                          onChange={(e) => setItems((prev) => prev.map((x) => (x.id === i.id ? { ...x, occupants: e.target.value } : x)))}
                          onBlur={(e) => updateOccupants(i.id, e.target.value)}
                          className="input packing-occupants-inline"
                        />
                      </span>
                    )}
                    <select
                      value={i.item_type || ''}
                      onChange={(e) => updateType(i.id, e.target.value || null)}
                      className="select packing-type-inline"
                      title="Change type"
                    >
                      {ITEM_TYPES.map((opt) => (
                        <option key={opt.value || 'none'} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => remove(i.id)} aria-label="Remove">×</button>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}

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

function typeLabel(t) {
  return t === '' ? 'Other' : (ITEM_TYPES.find((o) => o.value === t)?.label || 'Other');
}

export function PackingTab({ api }) {
  const [lists, setLists] = useState([]);
  const [selectedListId, setSelectedListId] = useState('general');
  const [items, setItems] = useState([]);
  const [newListName, setNewListName] = useState('');
  const [label, setLabel] = useState('');
  const [itemType, setItemType] = useState('');
  const [occupants, setOccupants] = useState('');

  const loadLists = () => {
    fetch(`${api}/packing/lists`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data) => setLists(Array.isArray(data) ? data : []))
      .catch(() => setLists([]));
  };

  useEffect(loadLists, [api]);

  const loadItems = () => {
    if (selectedListId === '' || selectedListId == null) return;
    const listParam = selectedListId === 'general' ? 'general' : selectedListId;
    fetch(`${api}/packing?list=${encodeURIComponent(listParam)}`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .catch(() => setItems([]));
  };

  useEffect(loadItems, [api, selectedListId]);

  const selectedList = lists.find((l) => String(l.id) === String(selectedListId));
  const isCustomList = selectedList && typeof selectedList.id === 'number';

  const addCustomList = (e) => {
    e.preventDefault();
    const name = newListName.trim();
    if (!name) return;
    fetch(`${api}/packing/lists`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
      .then((r) => r.json())
      .then((list) => {
        setNewListName('');
        loadLists();
        setSelectedListId(list.id);
      })
      .catch(console.error);
  };

  const deleteCustomList = (id) => {
    if (typeof id !== 'number') return;
    if (!window.confirm('Delete this packing list and all its items?')) return;
    fetch(`${api}/packing/lists/${id}`, { method: 'DELETE' })
      .then(() => {
        loadLists();
        if (selectedListId === id) setSelectedListId('general');
      })
      .catch(console.error);
  };

  const cleanupOrphans = () => {
    fetch(`${api}/packing/orphans`, { method: 'DELETE' })
      .then((r) => r.ok ? r.json() : Promise.reject(new Error()))
      .then((data) => {
        if (data.deleted > 0) {
          loadLists();
          loadItems();
        }
      })
      .catch(console.error);
  };

  const addItem = (e) => {
    e.preventDefault();
    if (!label.trim()) return;
    const body = { label: label.trim(), list: selectedListId };
    if (itemType && itemType !== '') body.item_type = itemType;
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
      .then((item) => {
        setItems((prev) => [...prev, item]);
        loadLists();
      })
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
      .then((updated) => {
        setItems((prev) => prev.map((i) => (i.id === id ? updated : i)));
        loadLists();
      })
      .catch(console.error);
  };

  const remove = (id) => {
    fetch(`${api}/packing/${id}`, { method: 'DELETE' })
      .then(() => {
        setItems((prev) => prev.filter((i) => i.id !== id));
        loadLists();
      })
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
    const item = items.find((i) => i.id === id);
    if (!item || (item.item_type || '') !== 'shelter') return;
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

  const byType = TYPE_ORDER.reduce((acc, t) => {
    const key = t || '';
    acc[key] = items.filter((i) => (i.item_type || '') === key);
    return acc;
  }, {});

  return (
    <div className="card block packing-tab-card">
      <h3 className="card-title">Packing Lists</h3>
      <p className="card-description">Each vehicle has a list. Add custom lists below. Green = all checked off; red = items left.</p>

      {/* Overview: all lists as red/green pills */}
      <div className="packing-tab-overview">
        <h4 className="packing-tab-overview-title">All lists</h4>
        <ul className="packing-tab-list-pills">
          {lists.map((list) => (
            <li
              key={list.id}
              className={`packing-tab-pill ${list.complete ? 'packing-tab-pill-complete' : 'packing-tab-pill-incomplete'}`}
            >
              <span className="packing-tab-pill-dot" aria-hidden />
              <span className="packing-tab-pill-name">{list.name}</span>
              {list.total != null && (
                <span className="packing-tab-pill-count">
                  {list.done}/{list.total}
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* Dropdown to select list */}
      <div className="packing-tab-picker">
        <label className="packing-picker-label" htmlFor="packing-tab-select">View list</label>
        <select
          id="packing-tab-select"
          value={selectedListId}
          onChange={(e) => {
            const v = e.target.value;
            setSelectedListId(v === 'general' ? 'general' : (Number.isNaN(Number(v)) ? v : Number(v)));
          }}
          className="select packing-tab-select"
        >
          {lists.map((list) => (
            <option key={list.id} value={list.id}>
              {list.name}
              {list.total != null && list.total > 0 ? ` (${list.done}/${list.total})` : ''}
            </option>
          ))}
        </select>
        {isCustomList && (
          <button
            type="button"
            className="btn btn-ghost btn-sm packing-tab-delete-list"
            onClick={() => deleteCustomList(selectedList.id)}
            aria-label="Delete this list"
          >
            Delete list
          </button>
        )}
      </div>

      {/* Create more packing lists */}
      <div className="packing-tab-create-section">
        <h4 className="packing-tab-create-title">Create more packing lists</h4>
        <form className="packing-tab-create-form" onSubmit={addCustomList}>
          <input
            type="text"
            placeholder="List name"
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
            className="input"
          />
          <button type="submit" className="btn btn-secondary">Add list</button>
        </form>
        <p className="packing-tab-orphans-hint">
          Deleted a campsite or list but still see its items in shelter/bed dropdowns?{' '}
          <button type="button" className="btn btn-ghost btn-sm packing-tab-orphans-btn" onClick={cleanupOrphans}>
            Remove orphaned items
          </button>
        </p>
      </div>

      {/* Selected list items */}
      <div className="packing-tab-current">
        <h4 className="packing-tab-current-title">
          {selectedList?.name ?? 'General'} — items
        </h4>
        <form className="form-row packing-add-form" onSubmit={addItem}>
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
              <label className="packing-occupants-label" htmlFor="add-occupants-tab">Occupants</label>
              <input
                id="add-occupants-tab"
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
            const typeLabelStr = typeLabel(t || '');
            return (
              <div key={t || 'none'} className="packing-type-group">
                <h4 className="packing-type-group-title">{typeLabelStr}</h4>
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
                          <label className="packing-occupants-label-inline" htmlFor={`occupants-tab-${i.id}`}>Occupants</label>
                          <input
                            id={`occupants-tab-${i.id}`}
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
    </div>
  );
}

import { useState, useEffect } from 'react';

export function VehiclesSites({ api }) {
  const [campsites, setCampsites] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [newCampsite, setNewCampsite] = useState('');
  const [newVehicle, setNewVehicle] = useState('');
  const [newVehicleCapacity, setNewVehicleCapacity] = useState(1);

  const load = () => {
    fetch(`${api}/campsites`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data) => setCampsites(Array.isArray(data) ? data : []))
      .catch(() => setCampsites([]));
    fetch(`${api}/vehicles`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data) => setVehicles(Array.isArray(data) ? data : []))
      .catch(() => setVehicles([]));
  };

  useEffect(load, [api]);

  const addCampsite = (e) => {
    e.preventDefault();
    const label = newCampsite.trim();
    if (!label) return;
    fetch(`${api}/campsites`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: label }),
    })
      .then((r) => r.json())
      .then((c) => setCampsites((prev) => [...prev, c].sort((a, b) => a.name.localeCompare(b.name))))
      .then(() => setNewCampsite(''))
      .catch(console.error);
  };

  const removeCampsite = (id) => {
    fetch(`${api}/campsites/${id}`, { method: 'DELETE' })
      .then(() => setCampsites((prev) => prev.filter((c) => c.id !== id)))
      .catch(console.error);
  };

  const CAMPSITE_AREAS = [
    { value: '', label: 'Area' },
    { value: 'front_yard', label: 'Front Yard' },
    { value: 'premier', label: 'Premier' },
    { value: 'general', label: 'General' },
  ];

  const updateCampsiteVehicle = (campsiteId, vehicleId) => {
    const value = vehicleId === '' || vehicleId == null ? null : Number(vehicleId);
    fetch(`${api}/campsites/${campsiteId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vehicle_id: value }),
    })
      .then((r) => r.json())
      .then((updated) => setCampsites((prev) => prev.map((c) => (c.id === campsiteId ? updated : c))))
      .catch(console.error);
  };

  const updateCampsiteArea = (campsiteId, area) => {
    const value = area === '' || area == null ? null : area;
    fetch(`${api}/campsites/${campsiteId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ area: value }),
    })
      .then((r) => r.json())
      .then((updated) => setCampsites((prev) => prev.map((c) => (c.id === campsiteId ? updated : c))))
      .catch(console.error);
  };

  const addVehicle = (e) => {
    e.preventDefault();
    const label = newVehicle.trim();
    if (!label) return;
    const cap = Math.max(1, parseInt(newVehicleCapacity, 10) || 1);
    fetch(`${api}/vehicles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: label, capacity: cap }),
    })
      .then((r) => r.json())
      .then((v) => setVehicles((prev) => [...prev, v].sort((a, b) => a.name.localeCompare(b.name))))
      .then(() => { setNewVehicle(''); setNewVehicleCapacity(1); })
      .catch(console.error);
  };

  const updateVehicleCapacity = (id, capacity) => {
    const cap = Math.max(1, parseInt(capacity, 10) || 1);
    fetch(`${api}/vehicles/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ capacity: cap }),
    })
      .then((r) => r.json())
      .then((updated) => setVehicles((prev) => prev.map((v) => (v.id === id ? updated : v))))
      .catch(console.error);
  };

  const removeVehicle = (id) => {
    fetch(`${api}/vehicles/${id}`, { method: 'DELETE' })
      .then(() => setVehicles((prev) => prev.filter((v) => v.id !== id)))
      .catch(console.error);
  };

  return (
    <div className="options-page">
      <div className="card block options-page-card">
        <h3 className="card-title">Campsites & Vehicles</h3>
        <p className="card-description">Add campsites and vehicles here. Assign one vehicle per campsite. Set area (Front Yard, Premier, General) for each campsite.</p>

        <div className="options-grid">
          <div className="options-panel">
            <h4 className="options-panel-title">Campsites</h4>
            <form className="form-row form-options" onSubmit={addCampsite}>
              <input
                type="text"
                placeholder="e.g. A-12"
                value={newCampsite}
                onChange={(e) => setNewCampsite(e.target.value)}
                className="input"
              />
              <button type="submit" className="btn btn-primary">Add</button>
            </form>
            <ul className="options-list options-list-full">
              {campsites.map((c) => (
                <li key={c.id} className="options-item options-item-campsite">
                  <span>{c.name}</span>
                  <select
                    value={c.area ?? ''}
                    onChange={(e) => updateCampsiteArea(c.id, e.target.value)}
                    className="select select-inline"
                    title="Campsite area"
                  >
                    {CAMPSITE_AREAS.map((opt) => (
                      <option key={opt.value || 'none'} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <select
                    value={c.vehicle_id ?? ''}
                    onChange={(e) => updateCampsiteVehicle(c.id, e.target.value)}
                    className="select select-inline"
                    title="Vehicle for this campsite"
                  >
                    <option value="">Vehicle</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeCampsite(c.id)} aria-label="Remove">×</button>
                </li>
              ))}
              {campsites.length === 0 && <li className="options-empty">No campsites yet</li>}
            </ul>
          </div>
          <div className="options-panel">
            <h4 className="options-panel-title">Vehicles</h4>
            <p className="options-panel-desc">Assign one vehicle per campsite (in the list to the left). Spots = capacity for that vehicle.</p>
            <form className="form-row form-options" onSubmit={addVehicle}>
              <input
                type="text"
                placeholder="e.g. Blue Tacoma"
                value={newVehicle}
                onChange={(e) => setNewVehicle(e.target.value)}
                className="input"
              />
              <label className="options-vehicle-capacity-label">
                <span className="options-vehicle-capacity-text">Spots</span>
                <input
                  type="number"
                  min={1}
                  value={newVehicleCapacity}
                  onChange={(e) => setNewVehicleCapacity(e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="input options-vehicle-capacity-input"
                />
              </label>
              <button type="submit" className="btn btn-primary">Add</button>
            </form>
            <ul className="options-list options-list-full">
              {vehicles.map((v) => (
                <li key={v.id} className="options-item options-item-vehicle">
                  <span>{v.name}</span>
                  <label className="options-vehicle-capacity-inline">
                    <span className="options-vehicle-capacity-text">Spots</span>
                    <input
                      type="number"
                      min={1}
                      value={v.capacity ?? 1}
                      onChange={(e) => setVehicles((prev) => prev.map((x) => (x.id === v.id ? { ...x, capacity: e.target.value === '' ? 1 : parseInt(e.target.value, 10) || 1 } : x)))}
                      onBlur={(e) => updateVehicleCapacity(v.id, e.target.value)}
                      className="input options-vehicle-capacity-inline-input"
                    />
                  </label>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeVehicle(v.id)} aria-label="Remove">×</button>
                </li>
              ))}
              {vehicles.length === 0 && <li className="options-empty">No vehicles yet</li>}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

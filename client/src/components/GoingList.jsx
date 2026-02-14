import { useState, useEffect } from 'react';

function isFullyAssigned(m, campsites) {
  const camp = campsites?.find((c) => c.id === m.campsite_id);
  const hasVehicle = camp?.vehicle_id != null && camp?.vehicle_id !== '';
  return !!(
    (m.contact_number && m.contact_number.trim() !== '') &&
    m.campsite_id != null && m.campsite_id !== '' &&
    m.shelter_packing_id != null && m.shelter_packing_id !== '' &&
    m.bed_packing_id != null && m.bed_packing_id !== '' &&
    m.bedding_packing_id != null && m.bedding_packing_id !== '' &&
    (m.wristband === 'GA' || m.wristband === 'VIP') &&
    hasVehicle
  );
}

function getMissing(m, campsites) {
  const missing = [];
  if (!m.contact_number || m.contact_number.trim() === '') missing.push('Contact');
  if (m.campsite_id == null || m.campsite_id === '') missing.push('Campsite');
  if (m.shelter_packing_id == null || m.shelter_packing_id === '') missing.push('Shelter');
  if (m.bed_packing_id == null || m.bed_packing_id === '') missing.push('Bed');
  if (m.bedding_packing_id == null || m.bedding_packing_id === '') missing.push('Bedding');
  if (m.wristband !== 'GA' && m.wristband !== 'VIP') missing.push('GA/VIP');
  const camp = campsites?.find((c) => c.id === m.campsite_id);
  if (!m.campsite_id || camp?.vehicle_id == null || camp?.vehicle_id === '') missing.push('Vehicle');
  return missing;
}

export function GoingList({ api, refreshKey = 0, onRefresh }) {
  const [members, setMembers] = useState([]);
  const [campsites, setCampsites] = useState([]);
  const [editingMember, setEditingMember] = useState(null);

  useEffect(() => {
    fetch(`${api}/members`)
      .then((r) => r.json())
      .then(setMembers)
      .catch(() => setMembers([]));
  }, [api, refreshKey]);
  useEffect(() => {
    fetch(`${api}/campsites`).then((r) => r.json()).then(setCampsites).catch(() => setCampsites([]));
  }, [api, refreshKey]);

  const going = members.filter((m) => m.status === 'going');
  if (going.length === 0) return null;

  return (
    <section className="section section-going-list">
      <div className="card block going-list-card">
        <h3 className="card-title">Who&apos;s Going</h3>
        <p className="card-description">Green = all set. Red = missing something — click to fix.</p>
        <ul className="going-list">
          {going.map((m) => {
            const complete = isFullyAssigned(m, campsites);
            return (
              <li
                key={m.id}
                className={`going-list-item ${complete ? 'going-list-item-complete' : 'going-list-item-incomplete going-list-item-clickable'}`}
                role={complete ? undefined : 'button'}
                tabIndex={complete ? undefined : 0}
                onClick={() => !complete && setEditingMember(m)}
                onKeyDown={(e) => {
                  if (!complete && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    setEditingMember(m);
                  }
                }}
              >
                <span className="going-list-dot" aria-hidden />
                <span className="going-list-name">{m.name}</span>
              </li>
            );
          })}
        </ul>
      </div>
      {editingMember && (
        <EditMemberModal
          member={editingMember}
          api={api}
          onClose={() => {
            setEditingMember(null);
            onRefresh?.();
          }}
          onSaved={() => onRefresh?.()}
        />
      )}
    </section>
  );
}

function EditMemberModal({ member: initialMember, api, onClose, onSaved }) {
  const [member, setMember] = useState(initialMember);
  const [campsites, setCampsites] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [packingItems, setPackingItems] = useState([]);

  useEffect(() => {
    setMember(initialMember);
  }, [initialMember?.id]);

  useEffect(() => {
    fetch(`${api}/campsites`).then((r) => r.json()).then(setCampsites).catch(() => setCampsites([]));
    fetch(`${api}/vehicles`).then((r) => r.json()).then(setVehicles).catch(() => setVehicles([]));
  }, [api]);

  useEffect(() => {
    const cid = member?.campsite_id;
    if (cid == null || cid === '') {
      fetch(`${api}/packing`).then((r) => r.json()).then(setPackingItems).catch(() => setPackingItems([]));
    } else {
      fetch(`${api}/packing?campsite_id=${cid}&include_general=1`).then((r) => r.json()).then(setPackingItems).catch(() => setPackingItems([]));
    }
  }, [api, member?.campsite_id]);

  const updateMember = (updates) => {
    fetch(`${api}/members/${member.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
      .then((r) => r.json())
      .then((updated) => {
        setMember(updated);
        onSaved?.();
      })
      .catch(console.error);
  };

  const camp = (campsites || []).find((c) => c.id === member?.campsite_id);
  const vehicleName = camp ? (vehicles || []).find((v) => v.id === camp.vehicle_id)?.name : null;
  const missing = getMissing(member, campsites);
  const shelters = (packingItems || []).filter((i) => (i.item_type || '') === 'shelter');
  const beds = (packingItems || []).filter((i) => (i.item_type || '') === 'bed');
  const beddings = (packingItems || []).filter((i) => (i.item_type || '') === 'bedding');

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="edit-member-title">
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 id="edit-member-title" className="card-title">Fix assignments — {member.name}</h3>
          <button type="button" className="btn btn-ghost btn-sm modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>
        {missing.length > 0 && (
          <p className="modal-missing">Missing: <strong>{missing.join(', ')}</strong></p>
        )}
        <div className="modal-fields">
          <div className="member-detail">
            <label className="member-detail-label">Contact</label>
            <input
              type="tel"
              placeholder="Phone"
              value={member.contact_number || ''}
              onChange={(e) => setMember((prev) => ({ ...prev, contact_number: e.target.value }))}
              onBlur={(e) => updateMember({ contact_number: e.target.value.trim() || null })}
              className="input input-sm"
            />
          </div>
          <div className="member-detail">
            <label className="member-detail-label">Campsite</label>
            <select
              value={member.campsite_id ?? ''}
              onChange={(e) => {
                const v = e.target.value ? Number(e.target.value) : null;
                setMember((prev) => ({ ...prev, campsite_id: v }));
                updateMember({ campsite_id: v });
              }}
              className="select select-inline select-sm"
            >
              <option value="">—</option>
              {campsites.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="member-detail">
            <label className="member-detail-label">Shelter</label>
            <select
              value={member.shelter_packing_id ?? ''}
              onChange={(e) => updateMember({ shelter_packing_id: e.target.value ? Number(e.target.value) : null })}
              className="select select-inline select-sm"
            >
              <option value="">—</option>
              {shelters.map((i) => (
                <option key={i.id} value={i.id}>{i.label}{i.occupants != null ? ` (${i.occupants})` : ''}</option>
              ))}
            </select>
          </div>
          <div className="member-detail">
            <label className="member-detail-label">Bed</label>
            <select
              value={member.bed_packing_id ?? ''}
              onChange={(e) => updateMember({ bed_packing_id: e.target.value ? Number(e.target.value) : null })}
              className="select select-inline select-sm"
            >
              <option value="">—</option>
              {beds.map((i) => (
                <option key={i.id} value={i.id}>{i.label}</option>
              ))}
            </select>
          </div>
          <div className="member-detail">
            <label className="member-detail-label">Bedding</label>
            <select
              value={member.bedding_packing_id ?? ''}
              onChange={(e) => updateMember({ bedding_packing_id: e.target.value ? Number(e.target.value) : null })}
              className="select select-inline select-sm"
            >
              <option value="">—</option>
              {beddings.map((i) => (
                <option key={i.id} value={i.id}>{i.label}</option>
              ))}
            </select>
          </div>
          <div className="member-detail">
            <label className="member-detail-label">GA / VIP</label>
            <select
              value={member.wristband === 'VIP' ? 'VIP' : 'GA'}
              onChange={(e) => updateMember({ wristband: e.target.value })}
              className="select select-inline select-sm"
            >
              <option value="GA">GA</option>
              <option value="VIP">VIP</option>
            </select>
          </div>
          <div className="member-detail">
            <label className="member-detail-label">Vehicle</label>
            <span className="member-detail-value">{vehicleName ?? '—'}</span>
            <span className="member-detail-hint">Set in Options (one per campsite)</span>
          </div>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-primary" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}

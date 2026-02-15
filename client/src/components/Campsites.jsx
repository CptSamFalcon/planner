import { useState, useEffect } from 'react';
import { isFullyAssigned, EditMemberModal } from './GoingList';

const CAMPSITE_CAPACITY = 6;

function getMissing(m) {
  const missing = [];
  if (!m.contact_number || m.contact_number.trim() === '') missing.push('Contact');
  if (m.campsite_id == null || m.campsite_id === '') missing.push('Campsite');
  if (m.shelter_packing_id == null || m.shelter_packing_id === '') missing.push('Shelter');
  if (m.bed_packing_id == null || m.bed_packing_id === '') missing.push('Bed');
  if (m.bedding_packing_id == null || m.bedding_packing_id === '') missing.push('Bedding');
  if (m.wristband !== 'GA' && m.wristband !== 'VIP') missing.push('GA/VIP');
  if (m.vehicle_id == null || m.vehicle_id === '') missing.push('Vehicle (ride)');
  return missing;
}

export function Campsites({ api, onMemberUpdated }) {
  const [members, setMembers] = useState([]);
  const [campsites, setCampsites] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [editingMember, setEditingMember] = useState(null);

  const load = () => {
    fetch(`${api}/members`, { credentials: 'include' })
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data) => setMembers(Array.isArray(data) ? data : []))
      .catch(() => setMembers([]));
    fetch(`${api}/campsites`, { credentials: 'include' })
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data) => setCampsites(Array.isArray(data) ? data : []))
      .catch(() => setCampsites([]));
    fetch(`${api}/vehicles`, { credentials: 'include' })
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data) => setVehicles(Array.isArray(data) ? data : []))
      .catch(() => setVehicles([]));
  };

  useEffect(load, [api]);

  const goingMembers = members.filter((m) => m.status === 'going');

  const byCampsite = new Map();
  byCampsite.set(null, []);
  campsites.forEach((c) => byCampsite.set(c.id, []));
  goingMembers.forEach((m) => {
    const key = m.campsite_id ?? null;
    if (!byCampsite.has(key)) byCampsite.set(key, []);
    byCampsite.get(key).push(m);
  });

  const handleSaved = () => {
    setEditingMember(null);
    load();
    onMemberUpdated?.();
  };

  return (
    <section className="section section-campsites">
      <div className="card block campsites-card">
        <div className="campsite-boxes">
          {/* Unassigned */}
          <div className="campsite-box">
            <div className="campsite-box-header">
              <h4 className="campsite-box-title">No campsite</h4>
              <span className="campsite-box-count">{(byCampsite.get(null) || []).length}</span>
            </div>
            <div className="campsite-box-people">
              {(byCampsite.get(null) || []).map((m) => {
                const complete = isFullyAssigned(m);
                const missing = getMissing(m);
                return (
                  <PersonChip
                    key={m.id}
                    member={m}
                    complete={complete}
                    missing={missing}
                    onClick={() => setEditingMember(m)}
                  />
                );
              })}
            </div>
          </div>

          {/* Each campsite */}
          {campsites.map((c) => {
            const campMembers = byCampsite.get(c.id) || [];
            return (
              <div key={c.id} className="campsite-box">
                <div className="campsite-box-header">
                  <h4 className="campsite-box-title">{c.name}</h4>
                  <span className="campsite-box-count">{campMembers.length}/{CAMPSITE_CAPACITY}</span>
                </div>
                <div className="campsite-box-people">
                  {campMembers.map((m) => {
                    const complete = isFullyAssigned(m);
                    const missing = getMissing(m);
                    return (
                      <PersonChip
                        key={m.id}
                        member={m}
                        complete={complete}
                        missing={missing}
                        onClick={() => setEditingMember(m)}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {goingMembers.length === 0 && (
          <p className="campsites-empty">Add people in People and campsites in Vehicles/Sites to see them here.</p>
        )}
      </div>

      {editingMember && (
        <EditMemberModal
          member={editingMember}
          api={api}
          onClose={() => setEditingMember(null)}
          onSaved={handleSaved}
        />
      )}
    </section>
  );
}

function PersonChip({ member, complete, missing, onClick }) {
  const title = complete
    ? `${member.name} · Good to go`
    : `${member.name} · Missing: ${missing.join(', ')}`;
  return (
    <button
      type="button"
      className={`person-chip ${complete ? 'person-chip--complete' : 'person-chip--incomplete'}`}
      onClick={onClick}
      title={title}
      aria-label={title}
    >
      <span className="person-chip-emoji" aria-hidden>{complete ? '😎' : '☹️'}</span>
      <span className="person-chip-dot" aria-hidden />
      <span className="person-chip-name">{member.name}</span>
    </button>
  );
}

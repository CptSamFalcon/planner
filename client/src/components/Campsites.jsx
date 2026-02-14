import { useState, useEffect } from 'react';

const CAMPSITE_CAPACITY = 6;

export function Campsites({ api, onOpenPackList, onMemberUpdated }) {
  const [members, setMembers] = useState([]);
  const [campsites, setCampsites] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [allPackingItems, setAllPackingItems] = useState([]);
  const [collapsed, setCollapsed] = useState(new Set());

  const toggleSection = (key) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const load = () => {
    fetch(`${api}/members`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data) => setMembers(Array.isArray(data) ? data : []))
      .catch(() => setMembers([]));
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

  // Load all packing items (any list) for shelter/bed/bedding assignment
  useEffect(() => {
    fetch(`${api}/packing?all=1`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data) => setAllPackingItems(Array.isArray(data) ? data : []))
      .catch(() => setAllPackingItems([]));
  }, [api]);

  const goingMembers = members.filter((m) => m.status === 'going');

  const byCampsite = new Map();
  byCampsite.set(null, []);
  campsites.forEach((c) => byCampsite.set(c.id, []));
  goingMembers.forEach((m) => {
    const key = m.campsite_id ?? null;
    if (!byCampsite.has(key)) byCampsite.set(key, []);
    byCampsite.get(key).push(m);
  });

  const updateMember = (id, updates) => {
    fetch(`${api}/members/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
      .then((r) => r.json())
      .then((updated) => {
        setMembers((prev) => prev.map((m) => (m.id === id ? updated : m)));
        onMemberUpdated?.();
      })
      .catch(console.error);
  };

  const remove = (id) => {
    fetch(`${api}/members/${id}`, { method: 'DELETE' })
      .then(() => {
        setMembers((prev) => prev.filter((m) => m.id !== id));
        onMemberUpdated?.();
      })
      .catch(console.error);
  };

  return (
    <div className="card block">
      <h3 className="card-title">Campsites</h3>
      <p className="card-description">
        People going, grouped by campsite. Each campsite holds {CAMPSITE_CAPACITY} people. Assign each person <strong>1 shelter</strong>, <strong>1 bed</strong>, and <strong>1 bedding</strong> from any pack list. Vehicle = who they ride with (campsite pass vehicle is in Vehicles/Sites).
      </p>

      <div className="campsite-sections">
        <CampsiteSection
          sectionKey="unassigned"
          title="Without campsite"
          campsiteId={null}
          members={byCampsite.get(null) || []}
          capacity={null}
          campsites={campsites}
          vehicles={vehicles}
          packingItems={allPackingItems}
          isCollapsed={collapsed.has('unassigned')}
          onToggle={() => toggleSection('unassigned')}
          onOpenPackList={onOpenPackList}
          updateMember={updateMember}
          remove={remove}
          setMembers={setMembers}
        />
        {campsites.map((c) => (
          <CampsiteSection
            key={c.id}
            sectionKey={c.id}
            title={c.name}
            campsiteId={c.id}
            members={byCampsite.get(c.id) || []}
            capacity={CAMPSITE_CAPACITY}
            campsites={campsites}
            vehicles={vehicles}
            packingItems={allPackingItems}
            isCollapsed={collapsed.has(c.id)}
            onToggle={() => toggleSection(c.id)}
            onOpenPackList={onOpenPackList}
            updateMember={updateMember}
            remove={remove}
            setMembers={setMembers}
          />
        ))}
      </div>

      {campsites.length === 0 && goingMembers.length === 0 && (
        <p className="campsites-empty">Add people in People and campsites in Vehicles/Sites to see them here.</p>
      )}
    </div>
  );
}

function CampsiteSection({ sectionKey, title, campsiteId, members, capacity, campsites, vehicles, packingItems, isCollapsed, onToggle, onOpenPackList, updateMember, remove, setMembers }) {
  const count = members.length;
  const spotsLeft = capacity != null ? capacity - count : null;
  const emptySlots = capacity != null ? Math.max(0, capacity - count) : 0;
  const camp = campsiteId != null ? (campsites || []).find((c) => c.id === campsiteId) : null;
  const vehicleName = camp ? (vehicles || []).find((v) => v.id === camp.vehicle_id)?.name : null;

  return (
    <div className={`campsite-section ${isCollapsed ? 'campsite-section-collapsed' : ''}`}>
      <div className="campsite-section-header-row">
        <button
          type="button"
          className="campsite-section-header"
          onClick={onToggle}
          aria-expanded={!isCollapsed}
          aria-controls={`campsite-content-${sectionKey}`}
          id={`campsite-header-${sectionKey}`}
        >
          <span className="campsite-section-header-inner">
            <span className="campsite-section-chevron" aria-hidden>▼</span>
            <h4 className="campsite-section-title">{title}</h4>
            {vehicleName && <span className="campsite-section-vehicle">{vehicleName}</span>}
            {capacity != null && (
              <span className="campsite-section-capacity">
                <span className="campsite-section-count">{count}/{capacity}</span>
                {spotsLeft != null && spotsLeft > 0 && (
                  <span className="campsite-section-spots"> · {spotsLeft} spot{spotsLeft !== 1 ? 's' : ''} left</span>
                )}
                {spotsLeft === 0 && <span className="campsite-section-full"> · Full</span>}
              </span>
            )}
          </span>
        </button>
        <button
          type="button"
          className="btn btn-pack-list"
          onClick={(e) => {
            e.stopPropagation();
            onOpenPackList?.(campsiteId);
          }}
        >
          Pack list
        </button>
      </div>
      <div id={`campsite-content-${sectionKey}`} className="campsite-section-content" role="region" aria-labelledby={`campsite-header-${sectionKey}`}>
      <ul className="campsite-slots">
        {members.map((m) => (
          <li key={m.id} className="campsite-slot campsite-slot-filled">
            <MemberRow
              member={m}
              campsites={campsites}
              vehicles={vehicles}
              packingItems={packingItems}
              updateMember={updateMember}
              setMembers={setMembers}
              remove={remove}
            />
          </li>
        ))}
        {Array.from({ length: emptySlots }, (_, i) => (
          <li key={`empty-${i}`} className="campsite-slot campsite-slot-empty" aria-label="Available spot">
            <span className="campsite-slot-empty-label">— Available</span>
          </li>
        ))}
      </ul>
      </div>
    </div>
  );
}

function itemLabel(i) {
  return i.list_name ? `${i.label} (${i.list_name})` : i.label;
}

function MemberRow({ member: m, campsites, vehicles, packingItems, updateMember, setMembers, remove }) {
  const shelters = (packingItems || []).filter((i) => (i.item_type || '') === 'shelter');
  const beds = (packingItems || []).filter((i) => (i.item_type || '') === 'bed');
  const beddings = (packingItems || []).filter((i) => (i.item_type || '') === 'bedding');

  return (
    <div className="member-row-full">
      <div className="member-row-main">
        <span className="member-name">{m.name}</span>
        {m.note && <span className="member-note">{m.note}</span>}
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => remove(m.id)} aria-label="Remove">×</button>
      </div>
      <div className="member-row-fields">
        <div className="member-detail">
          <label className="member-detail-label">Contact</label>
          <input
            type="tel"
            placeholder="Phone"
            value={m.contact_number || ''}
            onChange={(e) => setMembers((prev) => prev.map((x) => (x.id === m.id ? { ...x, contact_number: e.target.value } : x)))}
            onBlur={(e) => updateMember(m.id, { contact_number: e.target.value.trim() || null })}
            className="input input-sm"
          />
        </div>
        <div className="member-detail">
          <label className="member-detail-label">Campsite</label>
          <select
            value={m.campsite_id ?? ''}
            onChange={(e) => updateMember(m.id, { campsite_id: e.target.value ? Number(e.target.value) : null })}
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
            value={m.shelter_packing_id ?? ''}
            onChange={(e) => updateMember(m.id, { shelter_packing_id: e.target.value ? Number(e.target.value) : null })}
            className="select select-inline select-sm"
            title="From any pack list"
          >
            <option value="">—</option>
            {shelters.map((i) => (
              <option key={i.id} value={i.id}>{itemLabel(i)}{i.occupants != null ? ` · ${i.occupants} people` : ''}</option>
            ))}
          </select>
        </div>
        <div className="member-detail">
          <label className="member-detail-label">Bed</label>
          <select
            value={m.bed_packing_id ?? ''}
            onChange={(e) => updateMember(m.id, { bed_packing_id: e.target.value ? Number(e.target.value) : null })}
            className="select select-inline select-sm"
          >
            <option value="">—</option>
            {beds.map((i) => (
              <option key={i.id} value={i.id}>{itemLabel(i)}</option>
            ))}
          </select>
        </div>
        <div className="member-detail">
          <label className="member-detail-label">Bedding</label>
          <select
            value={m.bedding_packing_id ?? ''}
            onChange={(e) => updateMember(m.id, { bedding_packing_id: e.target.value ? Number(e.target.value) : null })}
            className="select select-inline select-sm"
          >
            <option value="">—</option>
            {beddings.map((i) => (
              <option key={i.id} value={i.id}>{itemLabel(i)}</option>
            ))}
          </select>
        </div>
        <div className="member-detail member-detail-checkbox">
          <label className="member-detail-label">Pre-Party</label>
          <input
            type="checkbox"
            checked={m.pre_party === 1}
            onChange={(e) => updateMember(m.id, { pre_party: e.target.checked ? 1 : 0 })}
            className="form-checkbox"
            aria-label="Pre-Party"
          />
        </div>
        <div className="member-detail">
          <label className="member-detail-label">GA / VIP</label>
          <select
            value={m.wristband === 'VIP' ? 'VIP' : 'GA'}
            onChange={(e) => updateMember(m.id, { wristband: e.target.value })}
            className="select select-inline select-sm"
          >
            <option value="GA">GA</option>
            <option value="VIP">VIP</option>
          </select>
        </div>
        <div className="member-detail">
          <label className="member-detail-label">Vehicle (ride)</label>
          <select
            value={m.vehicle_id ?? ''}
            onChange={(e) => updateMember(m.id, { vehicle_id: e.target.value ? Number(e.target.value) : null })}
            className="select select-inline select-sm"
            title="Which car they ride in"
          >
            <option value="">—</option>
            {(vehicles || []).map((v) => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

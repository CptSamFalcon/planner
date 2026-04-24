import { useState } from 'react';
import { VehiclesSites } from './VehiclesSites';
import { Campsites } from './Campsites';

/** Single tab: manage sites/vehicles, then roster by campsite. */
export function CampsitesHub({ api }) {
  const [rosterKey, setRosterKey] = useState(0);

  return (
    <>
      <section className="section section-campsites-admin">
        <VehiclesSites api={api} onDataChanged={() => setRosterKey((k) => k + 1)} />
      </section>
      <Campsites key={rosterKey} api={api} onMemberUpdated={() => setRosterKey((k) => k + 1)} />
    </>
  );
}

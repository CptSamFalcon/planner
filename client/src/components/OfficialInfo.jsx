export function OfficialInfo() {
  return (
    <div className="card block official-info-card">
      <h2 className="official-info-title">Bass Canyon 2026 — Official Info</h2>
      <p className="official-info-subtitle">Featuring Excision · The Gorge Amphitheatre, WA</p>

      <section className="official-info-section">
        <h3 className="official-info-heading">Dates &amp; venue</h3>
        <ul className="official-info-list">
          <li><strong>Festival:</strong> August 14–16, 2026 (3 days)</li>
          <li><strong>Thursday Pre-Party:</strong> August 13, 2026 (separate ticket)</li>
          <li><strong>Venue:</strong> The Gorge Amphitheatre</li>
          <li><strong>Address:</strong> 754 Silica Rd NW, George, WA 98848</li>
          <li><strong>Age:</strong> 18+ only</li>
        </ul>
      </section>

      <section className="official-info-section">
        <h3 className="official-info-heading">Tickets</h3>
        <p className="official-info-text">GA and VIP admission, payment plans, shuttles, and charging lockers available. Thursday Pre-Party sold separately.</p>
        <ul className="official-info-list">
          <li>GA (General Admission)</li>
          <li>VIP Admission</li>
          <li>Thursday Pre-Party add-on</li>
          <li>Payment plans available</li>
        </ul>
        <a href="https://www.basscanyon.com/tickets" target="_blank" rel="noopener noreferrer" className="official-info-link">Get tickets → basscanyon.com/tickets</a>
      </section>

      <section className="official-info-section">
        <h3 className="official-info-heading">Camping</h3>
        <p className="official-info-text">Camping passes are sold separately from festival tickets. Options include:</p>
        <ul className="official-info-list">
          <li><strong>Standard</strong> — General camping</li>
          <li><strong>Premier</strong> — Closer to venue, upgraded amenities</li>
          <li><strong>Front Yard</strong> — Closest to the venue</li>
          <li><strong>Terrace</strong> — Terrace camping &amp; glamping</li>
          <li><strong>Grove</strong> — RV camping</li>
          <li><strong>Oasis / Terrace Glamping</strong> — Premium glamping</li>
          <li><strong>Accessible</strong> — ADA camping</li>
        </ul>
        <a href="https://www.basscanyon.com/camping" target="_blank" rel="noopener noreferrer" className="official-info-link">Camping info → basscanyon.com/camping</a>
      </section>

      <section className="official-info-section">
        <h3 className="official-info-heading">Links</h3>
        <ul className="official-info-links">
          <li><a href="https://www.basscanyon.com/" target="_blank" rel="noopener noreferrer">Official site — basscanyon.com</a></li>
          <li><a href="https://www.basscanyon.com/tickets" target="_blank" rel="noopener noreferrer">Tickets</a></li>
          <li><a href="https://www.basscanyon.com/camping" target="_blank" rel="noopener noreferrer">Camping</a></li>
          <li><a href="https://www.basscanyon.com/faq" target="_blank" rel="noopener noreferrer">FAQ</a></li>
          <li><a href="https://www.basscanyon.com/payment-plans" target="_blank" rel="noopener noreferrer">Payment plans</a></li>
        </ul>
      </section>

      <p className="official-info-disclaimer">Info is from the official Bass Canyon site. Check basscanyon.com for current pricing, lineup, and policies.</p>
    </div>
  );
}

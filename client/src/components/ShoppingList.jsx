import { useState, useEffect, useCallback, useMemo } from 'react';

const BUCKET_COUNTER = 'counter';
const BUCKET_CART = 'cart';

function formatUsd(n) {
  if (!Number.isFinite(Number(n))) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(n));
}

function CartIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 64 56" width="64" height="56" aria-hidden>
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 8h8l6 32h36l8-24H18M26 46a3 3 0 1 0 0 .01M48 46a3 3 0 1 0 0 .01"
      />
      <path fill="currentColor" fillOpacity="0.12" d="M10 12h6l5 28h34l7-20H16z" />
    </svg>
  );
}

function parsePayload(data) {
  if (data && Array.isArray(data.items) && Array.isArray(data.trips)) {
    return { items: data.items, trips: data.trips };
  }
  if (Array.isArray(data)) {
    return { items: data, trips: [] };
  }
  return { items: [], trips: [] };
}

export function ShoppingList({ api }) {
  const [items, setItems] = useState([]);
  const [trips, setTrips] = useState([]);
  const [label, setLabel] = useState('');
  const [cartBump, setCartBump] = useState(false);
  const [counterPulse, setCounterPulse] = useState(false);
  const [dragOver, setDragOver] = useState(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [totalInput, setTotalInput] = useState('');
  const [checkoutSaving, setCheckoutSaving] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');

  const load = useCallback(() => {
    fetch(`${api}/shopping`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : { items: [], trips: [] }))
      .then((data) => {
        const { items: it, trips: tr } = parsePayload(data);
        setItems(Array.isArray(it) ? it : []);
        setTrips(Array.isArray(tr) ? tr : []);
      })
      .catch(() => {
        setItems([]);
        setTrips([]);
      });
  }, [api]);

  useEffect(() => {
    load();
  }, [load]);

  const bumpCart = useCallback(() => {
    setCartBump(true);
    setTimeout(() => setCartBump(false), 650);
  }, []);

  const bumpCounter = useCallback(() => {
    setCounterPulse(true);
    setTimeout(() => setCounterPulse(false), 500);
  }, []);

  const patchItem = useCallback(
    (id, body) => {
      fetch(`${api}/shopping/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      })
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((row) => {
          setItems((prev) => prev.map((x) => (x.id === row.id ? row : x)));
          if (body.bucket === BUCKET_CART) bumpCart();
          if (body.bucket === BUCKET_COUNTER) bumpCounter();
        })
        .catch(console.error);
    },
    [api, bumpCart, bumpCounter]
  );

  const add = (e) => {
    e.preventDefault();
    const t = label.trim();
    if (!t) return;
    fetch(`${api}/shopping`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ label: t, bucket: BUCKET_COUNTER }),
    })
      .then((r) => r.json())
      .then((row) => {
        setItems((prev) => [...prev, row]);
        setLabel('');
        bumpCounter();
      })
      .catch(console.error);
  };

  const remove = (id) => {
    fetch(`${api}/shopping/${id}`, { method: 'DELETE', credentials: 'include' })
      .then(() => setItems((prev) => prev.filter((x) => x.id !== id)))
      .catch(console.error);
  };

  const removeTrip = (tripId) => {
    fetch(`${api}/shopping/trips/${tripId}`, { method: 'DELETE', credentials: 'include' })
      .then((r) => {
        if (r.ok) setTrips((prev) => prev.filter((t) => t.id !== tripId));
      })
      .catch(console.error);
  };

  const openCheckout = () => {
    setTotalInput('');
    setCheckoutError('');
    setCheckoutOpen(true);
  };

  const submitCheckout = (e) => {
    e.preventDefault();
    const n = parseFloat(String(totalInput).replace(/[^0-9.]/g, ''));
    if (!Number.isFinite(n) || n < 0) {
      setCheckoutError('Enter a valid total (e.g. 47.32)');
      return;
    }
    setCheckoutSaving(true);
    setCheckoutError('');
    fetch(`${api}/shopping/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ total: n }),
    })
      .then(async (r) => {
        const body = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(body.error || 'Checkout failed');
        return body;
      })
      .then((body) => {
        if (Array.isArray(body.items)) setItems(body.items);
        if (Array.isArray(body.trips)) setTrips(body.trips);
        setCheckoutOpen(false);
        bumpCart();
      })
      .catch((err) => setCheckoutError(err.message || 'Checkout failed'))
      .finally(() => setCheckoutSaving(false));
  };

  const counterItems = useMemo(
    () => items.filter((i) => i.bucket === BUCKET_COUNTER).sort((a, b) => a.sort_order - b.sort_order || a.id - b.id),
    [items]
  );
  const cartItems = useMemo(
    () => items.filter((i) => i.bucket === BUCKET_CART).sort((a, b) => a.sort_order - b.sort_order || a.id - b.id),
    [items]
  );

  const onDragStart = (e, id) => {
    e.dataTransfer.setData('text/plain', String(id));
    e.dataTransfer.effectAllowed = 'move';
  };

  const allowDrop = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const onDropBucket = (e, bucket) => {
    e.preventDefault();
    setDragOver(null);
    const id = Number(e.dataTransfer.getData('text/plain'));
    if (!Number.isFinite(id)) return;
    const item = items.find((x) => x.id === id);
    if (!item || item.bucket === bucket) return;
    patchItem(id, { bucket });
  };

  return (
    <section className="section section-shopping">
      <div className="card block shopping-card">
        <h3 className="card-title">Grocery run</h3>
        <p className="card-description">
          Build your <strong>wanted list</strong>, drag or toss items into the <strong>cart</strong>, then hit{' '}
          <strong>Checkout</strong> and enter what you paid. Past runs show up as receipts below.
        </p>

        <form className="shopping-add-form" onSubmit={add}>
          <input
            type="text"
            className="input shopping-add-input"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Ice, buns, AA batteries…"
            aria-label="New item"
            data-status-tip="Type an item and Add — it lands on your wanted list"
          />
          <button type="submit" className="btn btn-primary">
            Add to wanted list
          </button>
        </form>

        <div className="shopping-stage">
          <div
            className={`shopping-counter ${counterPulse ? 'shopping-counter--pulse' : ''} ${dragOver === 'counter' ? 'shopping-drop-target--active' : ''}`}
            onDragOver={(e) => {
              allowDrop(e);
              setDragOver('counter');
            }}
            onDragLeave={() => setDragOver((d) => (d === 'counter' ? null : d))}
            onDrop={(e) => onDropBucket(e, BUCKET_COUNTER)}
          >
            <div className="shopping-counter-rail" aria-hidden />
            <div className="shopping-counter-head">
              <span className="shopping-counter-label">Wanted List</span>
              <span className="shopping-counter-sub">Tap add, then toss in the cart</span>
            </div>
            <ul className="shopping-slip-list" aria-label="Items on wanted list">
              {counterItems.length === 0 ? (
                <li className="shopping-slip-empty">Nothing on the list yet.</li>
              ) : (
                counterItems.map((item) => (
                  <li
                    key={item.id}
                    className="shopping-slip"
                    draggable
                    onDragStart={(e) => onDragStart(e, item.id)}
                  >
                    <span className="shopping-slip-tear" aria-hidden />
                    <span className="shopping-slip-label">{item.label}</span>
                    <div className="shopping-slip-actions">
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm shopping-toss-btn"
                        onClick={() => patchItem(item.id, { bucket: BUCKET_CART })}
                        data-status-tip="Move this item into the shopping cart"
                      >
                        Into cart →
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => remove(item.id)}
                        aria-label={`Remove ${item.label}`}
                      >
                        ×
                      </button>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>

          <div
            className={`shopping-cart-panel ${cartBump ? 'shopping-cart-panel--bump' : ''} ${dragOver === 'cart' ? 'shopping-drop-target--active' : ''}`}
            onDragOver={(e) => {
              allowDrop(e);
              setDragOver('cart');
            }}
            onDragLeave={() => setDragOver((d) => (d === 'cart' ? null : d))}
            onDrop={(e) => onDropBucket(e, BUCKET_CART)}
          >
            <div className="shopping-cart-visual" aria-hidden>
              <CartIcon className="shopping-cart-svg" />
              <span className="shopping-cart-badge">{cartItems.length}</span>
            </div>
            <div className="shopping-cart-head">
              <span className="shopping-cart-title">Cart</span>
              <span className="shopping-cart-hint">Drop from the list here</span>
            </div>
            <ul className="shopping-cart-list" aria-label="Items in cart">
              {cartItems.length === 0 ? (
                <li className="shopping-cart-empty">Cart’s empty — drag something from the list.</li>
              ) : (
                cartItems.map((item) => (
                  <li
                    key={item.id}
                    className="shopping-cart-row"
                    draggable
                    onDragStart={(e) => onDragStart(e, item.id)}
                  >
                    <span className="shopping-cart-row-label">{item.label}</span>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => patchItem(item.id, { bucket: BUCKET_COUNTER })}
                      aria-label={`Move ${item.label} back to wanted list`}
                      title="Back to wanted list"
                    >
                      ↩
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => remove(item.id)}
                      aria-label={`Remove ${item.label}`}
                    >
                      ×
                    </button>
                  </li>
                ))
              )}
            </ul>
            <div className="shopping-checkout-wrap">
              <button
                type="button"
                className="btn btn-primary shopping-checkout-btn"
                disabled={cartItems.length === 0}
                onClick={openCheckout}
                data-status-tip="Record total and clear the cart into a saved receipt"
              >
                Checkout
              </button>
              {cartItems.length === 0 ? (
                <span className="shopping-checkout-hint">Fill the cart first.</span>
              ) : (
                <span className="shopping-checkout-hint">{cartItems.length} item{cartItems.length !== 1 ? 's' : ''} ready to ring up</span>
              )}
            </div>
          </div>
        </div>

        <div className="shopping-receipts-section">
          <h4 className="shopping-receipts-title">Checked-out carts</h4>
          <p className="shopping-receipts-sub">Each run keeps what was in the cart and what you paid.</p>
          {trips.length === 0 ? (
            <p className="shopping-receipts-empty">No checkouts yet — your first receipt will land here.</p>
          ) : (
            <ul className="shopping-receipts-list">
              {trips.map((trip) => (
                <li key={trip.id} className="shopping-receipt-card">
                  <div className="shopping-receipt-top">
                    <div>
                      <span className="shopping-receipt-date">
                        {trip.created_at
                          ? new Date(trip.created_at.replace(' ', 'T')).toLocaleString(undefined, {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })
                          : 'Run'}
                      </span>
                      <span className="shopping-receipt-total">{formatUsd(trip.total)}</span>
                    </div>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => removeTrip(trip.id)}
                      aria-label="Delete this receipt"
                      title="Remove receipt"
                    >
                      ×
                    </button>
                  </div>
                  <ul className="shopping-receipt-lines">
                    {(trip.lines || []).map((line, idx) => (
                      <li key={`${trip.id}-${idx}-${line}`}>{line}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {checkoutOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="shopping-checkout-title" onClick={() => !checkoutSaving && setCheckoutOpen(false)}>
          <div className="modal-content shopping-checkout-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 id="shopping-checkout-title" className="card-title">Checkout</h3>
              <button type="button" className="btn btn-ghost btn-sm modal-close" onClick={() => !checkoutSaving && setCheckoutOpen(false)} aria-label="Close">
                ×
              </button>
            </div>
            <form className="shopping-checkout-form" onSubmit={submitCheckout}>
              <p className="shopping-checkout-lead">
                How much was this cart? ({cartItems.length} item{cartItems.length !== 1 ? 's' : ''})
              </p>
              <label className="shopping-checkout-label" htmlFor="shopping-total-input">
                Total (USD)
              </label>
              <div className="shopping-checkout-input-row">
                <span className="shopping-checkout-dollar" aria-hidden>$</span>
                <input
                  id="shopping-total-input"
                  type="text"
                  inputMode="decimal"
                  className="input shopping-checkout-input"
                  value={totalInput}
                  onChange={(e) => setTotalInput(e.target.value)}
                  placeholder="0.00"
                  autoFocus
                  disabled={checkoutSaving}
                />
              </div>
              {checkoutError ? <p className="shopping-checkout-error" role="alert">{checkoutError}</p> : null}
              <div className="shopping-checkout-actions">
                <button type="submit" className="btn btn-primary" disabled={checkoutSaving}>
                  {checkoutSaving ? 'Saving…' : 'Save receipt'}
                </button>
                <button type="button" className="btn btn-ghost" disabled={checkoutSaving} onClick={() => setCheckoutOpen(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

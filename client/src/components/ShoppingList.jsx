import { useState, useEffect, useCallback, useMemo } from 'react';

const BUCKET_COUNTER = 'counter';
const BUCKET_CART = 'cart';
const BUCKET_CHECKED = 'checked';

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

export function ShoppingList({ api }) {
  const [items, setItems] = useState([]);
  const [label, setLabel] = useState('');
  const [cartBump, setCartBump] = useState(false);
  const [counterPulse, setCounterPulse] = useState(false);
  const [dragOver, setDragOver] = useState(null);

  const load = useCallback(() => {
    fetch(`${api}/shopping`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .catch(() => setItems([]));
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
          if (body.bucket === BUCKET_CHECKED) bumpCart();
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

  const clearChecked = () => {
    const ids = items.filter((i) => i.bucket === BUCKET_CHECKED).map((i) => i.id);
    if (ids.length === 0) return;
    Promise.all(
      ids.map((id) => fetch(`${api}/shopping/${id}`, { method: 'DELETE', credentials: 'include' }))
    )
      .then(() => setItems((prev) => prev.filter((i) => i.bucket !== BUCKET_CHECKED)))
      .catch(console.error);
  };

  const counterItems = useMemo(
    () => items.filter((i) => i.bucket === BUCKET_COUNTER).sort((a, b) => a.sort_order - b.sort_order || a.id - b.id),
    [items]
  );
  const cartItems = useMemo(
    () => items.filter((i) => i.bucket === BUCKET_CART).sort((a, b) => a.sort_order - b.sort_order || a.id - b.id),
    [items]
  );
  const checkedItems = useMemo(
    () => items.filter((i) => i.bucket === BUCKET_CHECKED).sort((a, b) => a.sort_order - b.sort_order || a.id - b.id),
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
          Jot things on the <strong>counter slip</strong>, then drag them into the <strong>cart</strong> (or tap “Into cart”).
          At the store, tick items <strong>got it</strong> — they roll into the bag below. Drag back to the counter if you change your mind.
        </p>

        <form className="shopping-add-form" onSubmit={add}>
          <input
            type="text"
            className="input shopping-add-input"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Ice, buns, AA batteries…"
            aria-label="New item"
            data-status-tip="Type an item and Add — it prints on the counter slip"
          />
          <button type="submit" className="btn btn-primary">
            Add to counter
          </button>
        </form>

        <div className="shopping-stage">
          {/* Counter column */}
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
              <span className="shopping-counter-label">Counter</span>
              <span className="shopping-counter-sub">Tap add, then toss in the cart</span>
            </div>
            <ul className="shopping-slip-list" aria-label="Items on counter">
              {counterItems.length === 0 ? (
                <li className="shopping-slip-empty">Nothing on the slip yet.</li>
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

          {/* Cart column */}
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
              <span className="shopping-cart-hint">Drop slips here</span>
            </div>
            <ul className="shopping-cart-list" aria-label="Items in cart">
              {cartItems.length === 0 ? (
                <li className="shopping-cart-empty">Cart’s empty — drag a slip in.</li>
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
                      className="btn btn-secondary btn-sm shopping-got-btn"
                      onClick={() => patchItem(item.id, { bucket: BUCKET_CHECKED })}
                      aria-label={`Got ${item.label}`}
                      data-status-tip="Mark as picked up — drops into the bag"
                    >
                      Got it
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => patchItem(item.id, { bucket: BUCKET_COUNTER })}
                      aria-label={`Move ${item.label} back to counter`}
                      title="Back to counter"
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
          </div>
        </div>

        <div className="shopping-bag-section">
          <div className="shopping-bag-head">
            <h4 className="shopping-bag-title">In the bag</h4>
            <span className="shopping-bag-sub">Checked off at the store</span>
            {checkedItems.length > 0 && (
              <button type="button" className="btn btn-ghost btn-sm shopping-bag-clear" onClick={clearChecked}>
                Clear finished
              </button>
            )}
          </div>
          <ul className="shopping-bag-list" aria-label="Purchased items">
            {checkedItems.length === 0 ? (
              <li className="shopping-bag-empty">No ticks yet — check things off from the cart.</li>
            ) : (
              checkedItems.map((item) => (
                <li key={item.id} className="shopping-bag-row">
                  <span className="shopping-bag-check" aria-hidden>✓</span>
                  <span className="shopping-bag-label">{item.label}</span>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => patchItem(item.id, { bucket: BUCKET_CART })}
                    title="Move back to cart"
                  >
                    Undo
                  </button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => remove(item.id)} aria-label={`Remove ${item.label}`}>
                    ×
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </section>
  );
}

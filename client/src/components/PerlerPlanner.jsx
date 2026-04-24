import { useMemo, useState } from 'react';

const BOARD_SIZES = [
  { id: 'mini', label: 'Mini 14×14', cols: 14, rows: 14 },
  { id: 'square-18', label: 'Square 18×18', cols: 18, rows: 18 },
  { id: 'standard-29', label: 'Standard 29×29', cols: 29, rows: 29 },
  { id: 'wide-58x29', label: 'Wide 58×29', cols: 58, rows: 29 },
];

const PERLER_COLORS = [
  { name: 'White', hex: '#f8f8f8' },
  { name: 'Black', hex: '#1d1d1d' },
  { name: 'Gray', hex: '#8f9194' },
  { name: 'Red', hex: '#da2f2b' },
  { name: 'Orange', hex: '#f58b2c' },
  { name: 'Yellow', hex: '#f7de3a' },
  { name: 'Light Green', hex: '#7ecf4f' },
  { name: 'Dark Green', hex: '#2f7a42' },
  { name: 'Light Blue', hex: '#68c8f0' },
  { name: 'Dark Blue', hex: '#295eb7' },
  { name: 'Lavender', hex: '#ab8ad8' },
  { name: 'Purple', hex: '#7140a8' },
  { name: 'Pink', hex: '#ff84b9' },
  { name: 'Brown', hex: '#8f5f3b' },
  { name: 'Tan', hex: '#d3a47d' },
  { name: 'Glow', hex: '#d7ffe7' },
];

function createGrid(cols, rows) {
  return Array.from({ length: cols * rows }, () => null);
}

export function PerlerPlanner() {
  const [boardId, setBoardId] = useState(BOARD_SIZES[2].id);
  const [selectedColor, setSelectedColor] = useState(PERLER_COLORS[0].hex);
  const [tool, setTool] = useState('paint'); // paint | erase
  const [isDrawing, setIsDrawing] = useState(false);
  const board = BOARD_SIZES.find((b) => b.id === boardId) || BOARD_SIZES[2];
  const [cells, setCells] = useState(() => createGrid(board.cols, board.rows));

  const resizeBoard = (nextId) => {
    const next = BOARD_SIZES.find((b) => b.id === nextId);
    if (!next) return;
    setBoardId(nextId);
    setCells(createGrid(next.cols, next.rows));
  };

  const paintCell = (idx) => {
    setCells((prev) => {
      if (idx < 0 || idx >= prev.length) return prev;
      const next = [...prev];
      next[idx] = tool === 'erase' ? null : selectedColor;
      return next;
    });
  };

  const colorCounts = useMemo(() => {
    const counts = new Map();
    cells.forEach((hex) => {
      if (!hex) return;
      counts.set(hex, (counts.get(hex) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([hex, count]) => {
        const color = PERLER_COLORS.find((c) => c.hex === hex);
        return { hex, count, name: color?.name || hex };
      })
      .sort((a, b) => b.count - a.count);
  }, [cells]);

  const exportPng = () => {
    const px = board.cols <= 18 ? 36 : board.cols <= 29 ? 24 : 16;
    const pad = 24;
    const c = document.createElement('canvas');
    c.width = board.cols * px + pad * 2;
    c.height = board.rows * px + pad * 2;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#f3f4f8';
    ctx.fillRect(0, 0, c.width, c.height);

    // board background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(pad, pad, board.cols * px, board.rows * px);
    ctx.strokeStyle = '#c9ccd3';
    ctx.lineWidth = 1;
    for (let x = 0; x <= board.cols; x += 1) {
      ctx.beginPath();
      ctx.moveTo(pad + x * px, pad);
      ctx.lineTo(pad + x * px, pad + board.rows * px);
      ctx.stroke();
    }
    for (let y = 0; y <= board.rows; y += 1) {
      ctx.beginPath();
      ctx.moveTo(pad, pad + y * px);
      ctx.lineTo(pad + board.cols * px, pad + y * px);
      ctx.stroke();
    }
    cells.forEach((hex, i) => {
      if (!hex) return;
      const x = i % board.cols;
      const y = Math.floor(i / board.cols);
      ctx.fillStyle = hex;
      ctx.fillRect(pad + x * px + 1, pad + y * px + 1, px - 2, px - 2);
    });
    const a = document.createElement('a');
    a.download = `perler-plan-${board.cols}x${board.rows}.png`;
    a.href = c.toDataURL('image/png');
    a.click();
  };

  return (
    <section className="section section-perler-planner">
      <div className="card block perler-card">
        <h3 className="card-title">Perler Planner</h3>
        <p className="card-description">Design pixel art with Perler-style bead colors, board sizes, and a bead count summary.</p>

        <div className="perler-toolbar">
          <label className="perler-label">
            Board size
            <select className="select" value={boardId} onChange={(e) => resizeBoard(e.target.value)}>
              {BOARD_SIZES.map((b) => (
                <option key={b.id} value={b.id}>{b.label}</option>
              ))}
            </select>
          </label>
          <div className="perler-tool-buttons">
            <button
              type="button"
              className={`btn btn-secondary ${tool === 'paint' ? 'is-active' : ''}`}
              onClick={() => setTool('paint')}
            >
              Paint
            </button>
            <button
              type="button"
              className={`btn btn-secondary ${tool === 'erase' ? 'is-active' : ''}`}
              onClick={() => setTool('erase')}
            >
              Erase
            </button>
          </div>
          <button type="button" className="btn btn-ghost" onClick={() => setCells(createGrid(board.cols, board.rows))}>
            Clear board
          </button>
          <button type="button" className="btn btn-primary" onClick={exportPng}>
            Export PNG
          </button>
        </div>

        <div className="perler-layout">
          <div className="perler-palette">
            {PERLER_COLORS.map((c) => (
              <button
                key={c.hex}
                type="button"
                className={`perler-color-chip${selectedColor === c.hex ? ' is-selected' : ''}`}
                style={{ '--chip': c.hex }}
                onClick={() => {
                  setSelectedColor(c.hex);
                  setTool('paint');
                }}
                title={c.name}
              >
                <span className="perler-color-swatch" />
                <span>{c.name}</span>
              </button>
            ))}
          </div>

          <div
            className="perler-grid-wrap"
            onMouseUp={() => setIsDrawing(false)}
            onMouseLeave={() => setIsDrawing(false)}
          >
            <div
              className="perler-grid"
              style={{ '--cols': board.cols }}
              onMouseDown={(e) => {
                if (e.button !== 0) return;
                setIsDrawing(true);
              }}
            >
              {cells.map((hex, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="perler-cell"
                  style={{ '--cell': hex || '#ffffff' }}
                  onMouseDown={() => paintCell(idx)}
                  onMouseEnter={() => {
                    if (isDrawing) paintCell(idx);
                  }}
                  onDragStart={(e) => e.preventDefault()}
                  aria-label={`cell ${idx + 1}`}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="perler-counts">
          <h4 className="perler-counts-title">Bead counts</h4>
          {colorCounts.length === 0 ? (
            <p className="perler-empty">No beads used yet.</p>
          ) : (
            <ul className="perler-count-list">
              {colorCounts.map((c) => (
                <li key={c.hex} className="perler-count-item">
                  <span className="perler-count-dot" style={{ '--dot': c.hex }} />
                  <span>{c.name}</span>
                  <strong>{c.count}</strong>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

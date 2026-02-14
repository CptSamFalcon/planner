const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

try {
  require('./db'); // init DB
} catch (err) {
  console.error('Database init failed:', err.message);
  process.exit(1);
}

const members = require('./routes/members');
const campsites = require('./routes/campsites');
const vehicles = require('./routes/vehicles');
const packing = require('./routes/packing');
const schedule = require('./routes/schedule');
const notes = require('./routes/notes');
const festival = require('./routes/festival');

const app = express();
const PORT = process.env.PORT || 3080;

const publicDir = process.env.PUBLIC_DIR || path.join(process.cwd(), 'client', 'dist');
if (!fs.existsSync(publicDir)) {
  console.warn('Public dir not found:', publicDir, '- API only mode');
}

app.use(cors());
app.use(express.json());

app.use('/api/members', members);
app.use('/api/campsites', campsites);
app.use('/api/vehicles', vehicles);
app.use('/api/packing', packing);
app.use('/api/schedule', schedule);
app.use('/api/notes', notes);
app.use('/api/festival', festival);

// 404 for unknown API routes so client gets JSON, not HTML
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
  // SPA fallback: only for browser navigation (Accept: text/html), not for API or assets
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    const accept = req.get('Accept') || '';
    if (!accept.includes('text/html')) return next();
    res.sendFile(path.join(publicDir, 'index.html'), (err) => {
      if (err) next(err);
    });
  });
}

// Prevent process from exiting on unhandled errors so the app doesn't "flash and close"
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
});
process.on('unhandledRejection', (reason, p) => {
  console.error('Unhandled rejection at:', p, 'reason:', reason);
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Bass Canyon planner running at http://localhost:${PORT}`);
});

server.on('error', (err) => {
  console.error('Server error:', err);
});

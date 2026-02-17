import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDb, getDb } from './db.js';
import { authRouter, requireAuth } from './routes/auth.js';
import { membersRouter } from './routes/members.js';
import { campsitesRouter } from './routes/campsites.js';
import { vehiclesRouter } from './routes/vehicles.js';
import { packingRouter } from './routes/packing.js';
import { scheduleRouter } from './routes/schedule.js';
import { notesRouter } from './routes/notes.js';
import { bingoRouter } from './routes/bingo.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3080;

// Persist data in /app/data when in Docker, else ./data
const dataDir = process.env.DATA_DIR || path.join(__dirname, '..', '..', 'data');
initDb(dataDir);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Auth: require session for all /api except /api/auth
app.use('/api', requireAuth);
app.use('/api/auth', authRouter);

// API routes
app.use('/api/members', membersRouter);
app.use('/api/campsites', campsitesRouter);
app.use('/api/vehicles', vehiclesRouter);
app.use('/api/packing', packingRouter);
app.use('/api/schedule', scheduleRouter);
app.use('/api/notes', notesRouter);
app.use('/api/bingo', bingoRouter);

// Festival info (static)
app.get('/api/festival', (req, res) => {
  res.json({
    name: 'Bass Canyon 2026',
    venue: 'The Gorge Amphitheatre',
    location: 'George, Washington',
    dates: {
      preParty: '2026-08-13',
      start: '2026-08-14',
      end: '2026-08-16',
    },
    days: ['Wednesday', 'Thursday Pre-Party', 'Friday', 'Saturday', 'Sunday'],
  });
});

// Serve built frontend (in Docker: PUBLIC_DIR=/app/client/dist)
const clientDist = process.env.PUBLIC_DIR || path.join(__dirname, '..', '..', 'client', 'dist');
app.use(express.static(clientDist, { maxAge: 0, etag: true }));
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.sendFile(path.join(clientDist, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Bass Canyon Planner running at http://0.0.0.0:${PORT}`);
});

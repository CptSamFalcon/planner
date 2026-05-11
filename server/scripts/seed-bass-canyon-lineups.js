/**
 * One-time seed: load past Bass Canyon lineups from JSON into bass_canyon_official_lineup.
 * Run from project root: node server/scripts/seed-bass-canyon-lineups.js
 * Or with DATA_DIR: DATA_DIR=./data node server/scripts/seed-bass-canyon-lineups.js
 */
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { initDb, getDb } from '../src/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function normalizeName(name) {
  return (name || '')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/&/g, ' and ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

const dataDir = process.env.DATA_DIR || path.join(__dirname, '..', '..', 'data');
const jsonPath = path.join(__dirname, '..', 'data', 'bass-canyon-past-lineups.json');

initDb(dataDir);
const db = getDb();

const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
const insert = db.prepare(`
  INSERT INTO bass_canyon_official_lineup (year, artist_name, name_normalized)
  VALUES (?, ?, ?)
  ON CONFLICT(year, name_normalized) DO UPDATE SET artist_name = excluded.artist_name
`);

let count = 0;
for (const [yearStr, artists] of Object.entries(raw)) {
  const year = parseInt(yearStr, 10);
  if (Number.isNaN(year) || !Array.isArray(artists)) continue;
  for (const name of artists) {
    const n = (name || '').trim();
    if (!n) continue;
    insert.run(year, n, normalizeName(n));
    count += 1;
  }
}

console.log(`Seeded ${count} artist-year rows into bass_canyon_official_lineup.`);

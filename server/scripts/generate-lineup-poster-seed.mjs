/**
 * One-shot pipeline: download (or read local file) poster → OCR → split into name tokens →
 * write server/data/lineup-poster-ocr-seed.json with one DB row per token (Deezer/tags/bios
 * merged when the OCR string matches the curated lineup module).
 *
 *   cd server && npm run generate-lineup-seed
 *
 * Optional: LINEUP_POSTER_FILE=/path/to.png LINEUP_POSTER_URL=... node scripts/generate-lineup-poster-seed.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import sharp from 'sharp';
import Tesseract from 'tesseract.js';
import { parsePosterOcrToNames, matchCuratedEnrichment } from './parse-poster-ocr-names.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_ROOT = path.join(__dirname, '..');
const REPO_ROOT = path.join(SERVER_ROOT, '..');
const OUT_JSON = path.join(SERVER_ROOT, 'data', 'lineup-poster-ocr-seed.json');
const POSTER_URL =
  process.env.LINEUP_POSTER_URL ||
  'https://www.basscanyon.com/wp-content/uploads/2026/04/Bass_Canyon_2026_Lineup4x5_v2.jpg';

const SEED_VERSION = 7;

async function loadPosterBuffer() {
  const file = process.env.LINEUP_POSTER_FILE;
  if (file && fs.existsSync(file)) {
    console.log('Reading poster from file…', file);
    return fs.readFileSync(file);
  }
  console.log('Fetching poster…', POSTER_URL);
  const res = await fetch(POSTER_URL);
  if (!res.ok) throw new Error(`Poster fetch ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function main() {
  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  const buf = await loadPosterBuffer();

  const preprocessed = await sharp(buf)
    .resize({ width: 2800, height: 3600, fit: 'inside', withoutEnlargement: false })
    .greyscale()
    .normalize()
    .png()
    .toBuffer();

  console.log('Running Tesseract…');
  const {
    data: { text: ocrRaw },
  } = await Tesseract.recognize(preprocessed, 'eng', {
    logger: (m) => {
      if (m.status === 'recognizing text') process.stdout.write('.');
    },
  });
  console.log('\n');

  const ocrNames = parsePosterOcrToNames(ocrRaw);
  console.log('Parsed name-like tokens:', ocrNames.length);

  const lineupModPath = path.join(REPO_ROOT, 'client', 'src', 'data', 'bassCanyon2026Lineup.js');
  const { getBassCanyon2026Lineup } = await import(pathToFileURL(lineupModPath).href);
  const curated = getBassCanyon2026Lineup();
  const usedCurated = new Set();

  const artists = [];
  for (let i = 0; i < ocrNames.length; i++) {
    const raw = ocrNames[i];
    const hit = matchCuratedEnrichment(raw, curated);
    const displayName = hit?.name ?? raw;
    if (hit) usedCurated.add(hit.name);
    artists.push({
      name: displayName,
      sort_order: i,
      tags: hit?.tags ?? [],
      bio: hit?.bio ?? '',
      deezerId: hit?.deezerId ?? null,
      image: hit?.image ?? '',
      ocrToken: raw,
    });
  }

  for (const c of curated) {
    if (usedCurated.has(c.name)) continue;
    artists.push({
      name: c.name,
      sort_order: artists.length,
      tags: c.tags ?? [],
      bio: c.bio ?? '',
      deezerId: c.deezerId ?? null,
      image: c.image ?? '',
      ocrToken: null,
    });
  }

  const payload = {
    seedVersion: SEED_VERSION,
    posterUrl: process.env.LINEUP_POSTER_FILE ? `file:${process.env.LINEUP_POSTER_FILE}` : POSTER_URL,
    generatedAt: new Date().toISOString(),
    ocrRaw,
    ocrNote: `seedVersion ${SEED_VERSION}: artists[] is OCR tokens split from the poster (pipe/===/column heuristics), plus curated gap-fill rows with Deezer data.`,
    artists,
  };
  fs.writeFileSync(OUT_JSON, JSON.stringify(payload, null, 2), 'utf8');
  console.log('Wrote', OUT_JSON, '—', artists.length, 'rows (OCR tokens + curated gap-fill)');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

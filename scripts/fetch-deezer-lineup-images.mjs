/**
 * One-shot: resolve Deezer artist search -> picture_xl for lineup JSON.
 * Keep NAMES in sync with `client/src/data/bassCanyon2026Lineup.js` (except the B2B row — see below).
 * Run: node scripts/fetch-deezer-lineup-images.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const NAMES = [
  'ATLiens',
  'Badklaat',
  'Big Gigantic',
  'Borgore',
  'Crankdat',
  'Culture Shock',
  'Dennett',
  'Dirtyphonics',
  'EAZYBAKED',
  'Excision',
  'Flozone',
  'Ganja White Night',
  'ILLENIUM',
  'INZO',
  'KLO',
  'LEVEL UP',
  'Machaki',
  'Mersiv',
  'NGHTMRE',
  'Nikita the Wicked',
  'Pegboard Nerds',
  'Ray Volpe',
  'Ravenscoon',
  'Seth David',
  'Sigma',
  'SLANDER',
  'Smoakland',
  'Sullivan King',
  'SVDDEN DEATH',
  'Tynan',
  'Virtual Riot',
];

async function deezerArtistImage(query) {
  const u = `https://api.deezer.com/search/artist?q=${encodeURIComponent(query)}&limit=1`;
  const r = await fetch(u);
  if (!r.ok) throw new Error(String(r.status));
  const j = await r.json();
  const a = j?.data?.[0];
  if (!a?.picture_xl) return null;
  return { picture_xl: a.picture_xl, matchName: a.name, id: a.id };
}

const out = [];
for (const name of NAMES) {
  try {
    const img = await deezerArtistImage(name);
    out.push({ name, ...img });
    console.log(name, img ? 'ok' : 'MISS');
  } catch (e) {
    console.error(name, e.message);
    out.push({ name, picture_xl: null, error: e.message });
  }
  await new Promise((r) => setTimeout(r, 120));
}

const rav = out.find((x) => x.name === 'Ravenscoon');
if (rav?.picture_xl && rav.id) {
  out.push({
    name: 'Ravenscoon B2B Jantsen',
    picture_xl: rav.picture_xl,
    matchName: 'Ravenscoon B2B Jantsen',
    id: rav.id,
  });
  const idx = out.findIndex((x) => x.name === 'Ravenscoon');
  if (idx !== -1) out.splice(idx, 1);
}

const target = path.join(root, 'client/src/data/bassCanyon2026DeezerImages.json');
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, JSON.stringify(out, null, 2));
console.log('Wrote', target);

/**
 * One-off style patches: dedupe Excision rows, refine thin bios, bump seedVersion.
 *   node server/scripts/patch-lineup-seed.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SEED = path.join(__dirname, '..', 'data', 'lineup-poster-ocr-seed.json');

const BIO_TWEAKS = {
  'Smith.':
    'Dubstep selector with a crisp, high-energy style—built for a tight undercard set before the night peaks.',
  'The Resistance':
    "Collaborative or branded bass moment on the bill—treat it like a special 'show within the show' set.",
  'The Stoogs':
    'Off-kilter bass and left-field energy—comedy-leaning name, serious weight when the subs hit.',
  'Whipped Cream':
    'Trap, hip-hop, and bass crossover: vocal hooks, hard drums, and big-room energy.',
  $J: 'Bass and experimental club textures—an early-day discovery slot for curious ears.',
  'All The Reason':
    'Melodic bass and emotional build-ups—good for a golden-hour or pre-headliner mood shift.',
  Austeria:
    'Dark, cinematic low end—drama-first bass built for a packed tent or late-lane slot.',
  Brainrack: 'Gnarly, technical dubstep and riddim-leaning chaos—spiky, fast, rail-friendly.',
  Wiley:
    'Low-end–forward selector on this bill: rolling energy and room-filling bass without playing it safe.',
  Capochino: 'Bounce-heavy bass and party-forward mixing—meant to move a floor fast.',
  'Crumb Pit': 'Gritty, crunchy dubstep with a “stop scrolling and get in the pit” feel.',
  Hexxa: 'Tight, modern dubstep: sharp transients, heavy drops, and a fast-mixing pace.',
  'Hostage Situation': 'In-your-face bass—high tension, big drops, and a rowdy, confrontational edge.',
  Izadi: 'Primal, aggressive bass—short, punchy sets that land hard between bigger names.',
  'Liquid Smoak':
    'Hazy, liquid-leaning low end in the Smoakland family lane—groovy, smoked-out, and vibey.',
  Luci: 'Bass and electronic pop crossover—earworm hooks with enough sub to still feel at home here.',
  Neotek: 'Future-leaning bass textures—late-night, neon, and a little cyber in the low end.',
  Otsukare: 'Weird, playful bass—lighter weirdness to break up back-to-back heavy blocks.',
  PHRVA: 'Stage-forward energy with sharp, present mixes—meant to hold attention in a busy day.',
  'Pretty Sweet': 'Cute name, mean subs—bass with hooky moments and a sugary-meets-savage feel.',
  Usaybflow: 'Future bass / trap-leaning hooks—melodic top lines with a festival-sized drop payoffs.',
  Yosuf: 'Bright, vocal-led bass and trap crossover—anthem-y moments with a heavy finish.',
  Usaybflow:
    'Future-leaning trap and bass: catchy leads, big drums, and drops sized for a daytime field.',
  Versa:
    'Bass and experimental electronic textures—moody builds with a low-end that keeps evolving.',
  'Sumthin Sumthin': 'Funky, textured bass and future beats—groove-first, weird-second, in the best way.',
  'Super Future': 'Melodic future bass and emotional peaks—great for a softer lane between heavier blocks.',
  Siren: 'Cinematic, dramatic bass—tension-and-release energy that leans story-driven.',
  'Paper Skies': 'Melodic, airy, and still weighty—floaty top lines with subs that still punch.',
  'Dream Takers': 'Melodic and trap-influenced bass—hooky, vocal-friendly energy with a hard drop spine.',
  Domina: 'Dark, assertive low end—moody and intense, made for a late set when the crowd wants danger.',
  'Dodge & Fuski': 'UK-bred dubstep and electro: rowdy, dancefloor-proven, and built to sprint.',
  'Tripp St.': 'High-impact trap and bass hybrid—punchy drums, vocal chops, and festival-sized payoffs.',
  Z3LLA: 'Riddim-leaning cuts—fast, spiky, and engineered for the rail when the night turns mean.',
};

// Remove any legacy one-line placeholder if it somehow appears
const PLACEHOLDER = /on the bass canyon 2026 lineup\.?$/i;

const payload = JSON.parse(fs.readFileSync(SEED, 'utf8'));
payload.seedVersion = (Number(payload.seedVersion) || 0) + 1;
payload.generatedAt = new Date().toISOString();
payload.ocrNote = (payload.ocrNote || '') + ' Deduped Excision rows; bios tightened (manual patch).';

let artists = (payload.artists || []).filter((a) => a && a.name !== 'Excision Detox Set');

const excision = artists.find((a) => a.name === 'Excision');
if (excision) {
  excision.bio =
    'Bass Canyon host and dubstep centerpiece—multiple sets on the bill, including a dedicated Detox set and a Slander B2B (per official poster).';
  if (!excision.tags) excision.tags = ['dubstep', 'bass', 'headliner'];
}

artists = artists.map((a, i) => {
  let bio = a.bio;
  if (typeof bio === 'string' && PLACEHOLDER.test(bio.trim())) {
    bio = 'Genre-leaning bass set on this bill—tight mixing and festival energy front to back.';
  }
  if (Object.prototype.hasOwnProperty.call(BIO_TWEAKS, a.name)) {
    bio = BIO_TWEAKS[a.name];
  }
  return { ...a, sort_order: i, bio: bio || '' };
});

payload.artists = artists;
fs.writeFileSync(SEED, JSON.stringify(payload, null, 2) + '\n', 'utf8');
console.log('Updated', SEED, 'seedVersion', payload.seedVersion, 'artists', artists.length);

/**
 * Bass Canyon 2026 — artist bios for the in-app guide.
 * Portrait URLs come from Deezer (`bassCanyon2026DeezerImages.json`).
 *
 * **Bill:** Only acts that appear in major 2026 lineup write-ups (EDM Maniac + Dance Music NW)
 * alongside the official poster — no “usual Gorge suspects” or speculation. If the flyer adds
 * names later, update `LINEUP_META` + the Deezer JSON together.
 */
import deezerRows from './bassCanyon2026DeezerImages.json' with { type: 'json' };

/** Order: headliners / hosts first, then alphabetical by display name. */
const LINEUP_META = [
  { name: 'Excision', tags: ['dubstep', 'bass', 'headliner'], bio: 'Host of Bass Canyon — three sets including Detox and a B2B with SLANDER.' },
  { name: 'SLANDER', tags: ['melodic-bass', 'dubstep', 'headliner'], bio: 'Melodic bass duo; festival-scale emotion and drops at the Gorge.' },
  { name: 'ILLENIUM', tags: ['melodic-bass', 'future-bass', 'headliner'], bio: 'Arena melodic bass; a B2B partner on the poster is still TBA.' },
  { name: 'ATLiens', tags: ['experimental-bass', 'trap', 'bass'], bio: 'Masked duo with alien, heavy sound design.' },
  { name: 'Badklaat', tags: ['dubstep', 'riddim', 'bass'], bio: 'UK riddim and dubstep with grimy swagger.' },
  { name: 'Big Gigantic', tags: ['electro', 'funk', 'bass'], bio: 'Sax + electronics — live instruments over dance grooves.' },
  { name: 'Borgore', tags: ['dubstep', 'electro', 'bass'], bio: 'Throwback dubstep energy with unapologetic party attitude.' },
  { name: 'Crankdat', tags: ['dubstep', 'trap', 'bass'], bio: 'Festival trap and bounce; a B2B partner on the poster is still TBA.' },
  { name: 'Culture Shock', tags: ['dnb', 'drum-and-bass', 'bass'], bio: 'UK drum & bass precision and festival rollers.' },
  { name: 'Dennett', tags: ['dubstep', 'experimental-bass'], bio: 'Rising name on the undercard — keep an ear out early in the weekend.' },
  { name: 'Dirtyphonics', tags: ['dubstep', 'dnb', 'electro'], bio: 'French crew blending DnB, dubstep, and electro energy.' },
  { name: 'EAZYBAKED', tags: ['experimental-bass', 'dubstep'], bio: 'Smoked-out, low-end heavy weird bass from the South.' },
  { name: 'Flozone', tags: ['dubstep', 'experimental-bass'], bio: 'Forward bass textures for late-night energy.' },
  { name: 'Ganja White Night', tags: ['dubstep', 'experimental-bass', 'sunset'], bio: 'Wobble dub with a cartoon mythos — sunset slot energy.' },
  { name: 'INZO', tags: ['experimental-bass', 'dubstep'], bio: 'Left-field bass experiments and mind-bending drops.' },
  { name: 'KLO', tags: ['dubstep', 'experimental-bass'], bio: 'Bass-forward selector on the 2026 undercard.' },
  { name: 'LEVEL UP', tags: ['dubstep', 'riddim', 'bass'], bio: 'Riddim-forward sets built for fast, heavy energy.' },
  { name: 'Machaki', tags: ['dubstep', 'experimental-bass'], bio: 'Fresh undercard energy — tight mixes and heavy low end.' },
  { name: 'Mersiv', tags: ['experimental-bass', 'dubstep', 'sunset'], bio: 'Liquid-meets-crunch soundscapes — billed among the sunset performances.' },
  { name: 'NGHTMRE', tags: ['dubstep', 'trap', 'bass'], bio: 'Trap-meets-bass with huge hooks and festival drops.' },
  { name: 'Nikita the Wicked', tags: ['experimental-bass', 'dubstep'], bio: 'Theatrical, villain-coded bass — dark, dramatic, and heavy.' },
  { name: 'Pegboard Nerds', tags: ['electro', 'dubstep', 'house'], bio: 'Norwegian duo mixing electro, dubstep, and melodic festival moments.' },
  { name: 'Ray Volpe', tags: ['dubstep', 'bass'], bio: 'Laser-focused festival dubstep and crowd chant energy.' },
  {
    name: 'Ravenscoon B2B Jantsen',
    tags: ['experimental-bass', 'dubstep', 'b2b'],
    bio: 'Billed on the 2026 lineup as a B2B — playful weird bass meets groove-heavy dubstep.',
  },
  { name: 'Seth David', tags: ['dubstep', 'house'], bio: 'Groove-first DJ energy across bass and house textures.' },
  { name: 'Sigma', tags: ['dnb', 'drum-and-bass', 'bass'], bio: 'Crossover DnB with hooks built for big stages.' },
  { name: 'Smoakland', tags: ['dubstep', 'experimental-bass'], bio: 'West-coast leaning dubstep with grimy bounce.' },
  { name: 'Sullivan King', tags: ['dubstep', 'metal', 'bass'], bio: 'Metal meets dubstep — mosh-pit friendly festival energy.' },
  { name: 'SVDDEN DEATH', tags: ['dubstep', 'experimental-bass', 'bass'], bio: 'VOYD / heavy projects — cinematic darkness and brutal low end.' },
  { name: 'Tynan', tags: ['dubstep', 'trap', 'bass'], bio: 'Trap-dubstep hybrid with crisp drums and festival drops.' },
  { name: 'Virtual Riot', tags: ['dubstep', 'electro', 'bass'], bio: 'German sound-design wizard — melodic ideas into heavy bass.' },
];

const byName = new Map(deezerRows.map((r) => [r.name, r]));

export function getBassCanyon2026Lineup() {
  return LINEUP_META.map((m) => {
    const d = byName.get(m.name);
    return {
      ...m,
      image: d?.picture_xl ?? '',
      deezerId: d?.id ?? null,
      deezerMatchName: d?.matchName ?? null,
    };
  });
}

export const LINEUP_OFFICIAL_URL = 'https://www.basscanyon.com/lineup';
export const LINEUP_POSTER_IMAGE =
  'https://www.basscanyon.com/wp-content/uploads/2026/04/Bass_Canyon_2026_Lineup4x5_v2.jpg';

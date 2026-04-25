import { parseMemberAllergies } from './memberAllergies';

function ingredientsToLines(ingredients) {
  if (Array.isArray(ingredients)) {
    return ingredients.map((x) => String(x).trim()).filter(Boolean);
  }
  if (typeof ingredients === 'string') {
    return ingredients.split(/\n/).map((x) => x.trim()).filter(Boolean);
  }
  return [];
}

/** Lowercased text used to match allergens (title, recipe, each ingredient line). */
export function haystackForMeal(meal) {
  const parts = [
    meal?.title != null ? String(meal.title) : '',
    meal?.recipe != null ? String(meal.recipe) : '',
    ...ingredientsToLines(meal?.ingredients),
  ];
  return parts.join('\n').toLowerCase();
}

function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function levenshtein(a, b) {
  const s = String(a || '');
  const t = String(b || '');
  if (s === t) return 0;
  if (!s.length) return t.length;
  if (!t.length) return s.length;
  const prev = new Array(t.length + 1);
  const next = new Array(t.length + 1);
  for (let j = 0; j <= t.length; j += 1) prev[j] = j;
  for (let i = 1; i <= s.length; i += 1) {
    next[0] = i;
    for (let j = 1; j <= t.length; j += 1) {
      const cost = s[i - 1] === t[j - 1] ? 0 : 1;
      next[j] = Math.min(next[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= t.length; j += 1) prev[j] = next[j];
  }
  return prev[t.length];
}

/**
 * True if allergen appears in haystack (already lowercased).
 * Short tokens: word boundary or substring (so "egg" matches "eggs").
 * Phrases / long tokens: substring only.
 */
export function allergenMatchesInText(haystack, allergen) {
  const t = String(allergen).trim().toLowerCase();
  if (!t || !haystack) return false;
  if (t.includes(' ') || t.length > 14) return haystack.includes(t);
  const esc = t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (new RegExp(`\\b${esc}\\b`, 'i').test(haystack)) return true;
  return haystack.includes(t);
}

function fuzzyTokenNear(tokens, term) {
  const t = String(term || '').trim().toLowerCase();
  if (!t || t.length < 4) return false;
  const parts = tokenize(t);
  if (!parts.length) return false;
  // For multi-word alias/canonical terms, require each word to be present or near.
  return parts.every((p) =>
    tokens.some((tok) => {
      if (tok === p) return true;
      if (Math.abs(tok.length - p.length) > 2) return false;
      const d = levenshtein(tok, p);
      return d <= (p.length >= 8 ? 2 : 1);
    })
  );
}

function buildCatalogTermMap(allergenCatalog) {
  const map = new Map();
  const byCanonical = new Map();
  for (const row of allergenCatalog || []) {
    const canonical = String(row?.canonical_name || '').trim().toLowerCase();
    if (!canonical) continue;
    const allTerms = [canonical, ...(Array.isArray(row.aliases) ? row.aliases : [])]
      .map((x) => String(x).trim().toLowerCase())
      .filter(Boolean);
    if (!byCanonical.has(canonical)) byCanonical.set(canonical, new Set());
    for (const term of allTerms) {
      map.set(term, canonical);
      byCanonical.get(canonical).add(term);
    }
  }
  return { termToCanonical: map, canonicalToTerms: byCanonical };
}

/**
 * Members whose listed allergens may appear in this meal's title, recipe, or ingredients.
 * Includes the preparer (they may still want a heads-up) and "maybe" attendees; skips only "not-going".
 */
export function mealAllergenConflicts(meal, members, allergenCatalog = []) {
  const hay = haystackForMeal(meal);
  if (!hay.trim()) return [];
  const tokens = tokenize(hay);
  const { termToCanonical, canonicalToTerms } = buildCatalogTermMap(allergenCatalog);
  const out = [];
  for (const m of members) {
    if (m.status === 'not-going') continue;
    const allergies = parseMemberAllergies(m);
    if (allergies.length === 0) continue;
    const hitTerms = [];
    const matchedCanonical = new Set();
    for (const a of allergies) {
      const raw = String(a || '').trim();
      if (!raw) continue;
      const lower = raw.toLowerCase();
      const direct = allergenMatchesInText(hay, lower);
      const fuzzy = !direct && fuzzyTokenNear(tokens, lower);
      if (direct || fuzzy) {
        hitTerms.push(raw);
        const canonical = termToCanonical.get(lower);
        if (canonical) matchedCanonical.add(canonical);
      }
      if (direct || fuzzy) continue;
      const canonical = termToCanonical.get(lower);
      if (!canonical) continue;
      const terms = Array.from(canonicalToTerms.get(canonical) || []);
      const catalogHit = terms.some((t) => allergenMatchesInText(hay, t) || fuzzyTokenNear(tokens, t));
      if (catalogHit) {
        hitTerms.push(raw);
        matchedCanonical.add(canonical);
      }
    }
    if (hitTerms.length > 0) {
      out.push({
        member: m,
        terms: [...new Set(hitTerms)],
        suggestedAllergens: Array.from(matchedCanonical),
      });
    }
  }
  return out;
}

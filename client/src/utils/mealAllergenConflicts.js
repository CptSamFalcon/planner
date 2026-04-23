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

/**
 * Members whose listed allergens may appear in this meal's title, recipe, or ingredients.
 * Includes the preparer (they may still want a heads-up) and "maybe" attendees; skips only "not-going".
 */
export function mealAllergenConflicts(meal, members) {
  const hay = haystackForMeal(meal);
  if (!hay.trim()) return [];
  const out = [];
  for (const m of members) {
    if (m.status === 'not-going') continue;
    const allergies = parseMemberAllergies(m);
    if (allergies.length === 0) continue;
    const hitTerms = [];
    for (const a of allergies) {
      if (allergenMatchesInText(hay, a)) hitTerms.push(a);
    }
    if (hitTerms.length > 0) out.push({ member: m, terms: hitTerms });
  }
  return out;
}

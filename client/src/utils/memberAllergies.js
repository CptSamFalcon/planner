/** Parse stored member.allergies (JSON array or plain text) into a list of non-empty strings. */
export function parseMemberAllergies(member) {
  const raw = member?.allergies;
  if (raw == null || raw === '') return [];
  if (Array.isArray(raw)) {
    return raw.map((s) => String(s).trim()).filter(Boolean);
  }
  if (typeof raw === 'string') {
    const s = raw.trim();
    if (!s) return [];
    try {
      const a = JSON.parse(s);
      if (Array.isArray(a)) return a.map((x) => String(x).trim()).filter(Boolean);
      if (typeof a === 'string' && a.trim()) return [a.trim()];
      return [];
    } catch (_) {
      return s.split(/[,;\n]/).map((x) => x.trim()).filter(Boolean);
    }
  }
  return [];
}

/** Value for a text field: comma-separated from JSON array, or raw string if not JSON. */
export function formatAllergiesInputValue(member) {
  const raw = member?.allergies;
  if (raw == null || raw === '') return '';
  if (Array.isArray(raw)) return raw.map((x) => String(x).trim()).filter(Boolean).join(', ');
  if (typeof raw !== 'string') return '';
  const s = raw.trim();
  if (!s) return '';
  try {
    const a = JSON.parse(s);
    if (Array.isArray(a)) return a.map((x) => String(x).trim()).filter(Boolean).join(', ');
    if (typeof a === 'string') return a.trim();
    return '';
  } catch (_) {
    return s;
  }
}

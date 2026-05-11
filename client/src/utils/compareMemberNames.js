/**
 * Alphabetical order ignoring ASCII case. Stable when names tie after lowercasing.
 * Uses explicit lowercasing so behavior matches across browsers (localeCompare
 * sensitivity options can differ for some characters).
 */
export function compareMemberNames(a, b) {
  const an = String(a?.name ?? '').toLowerCase();
  const bn = String(b?.name ?? '').toLowerCase();
  const cmp = an.localeCompare(bn, 'en', { numeric: true });
  if (cmp !== 0) return cmp;
  return Number(a?.id ?? 0) - Number(b?.id ?? 0);
}

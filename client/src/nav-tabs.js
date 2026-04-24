/** Main app views — order matches Start menu */
export const NAV_TABS = [
  { id: 'group', label: 'Home' },
  { id: 'schedule', label: 'Schedule' },
  { id: 'campsites', label: 'Campsites' },
  { id: 'meals', label: 'Meals' },
  { id: 'people', label: 'People' },
  { id: 'packing', label: 'Packing' },
  { id: 'official-info', label: 'Official Info' },
  { id: 'bingo', label: 'Bingo' },
];

export function navLabelForView(viewId) {
  return NAV_TABS.find((t) => t.id === viewId)?.label ?? 'Home';
}

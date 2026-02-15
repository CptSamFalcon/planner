/**
 * Calendar export: map schedule events (day + time) to Google Calendar URLs and iCalendar (.ics).
 * Festival dates: Aug 12–16, 2026 at The Gorge (Pacific time).
 */

const DAY_DATE = {
  'Wednesday': 12,
  'Thursday Pre-Party': 13,
  'Friday': 14,
  'Saturday': 15,
  'Sunday': 16,
};

const FESTIVAL_TZ_OFFSET = '-07:00'; // PDT

/** Parse "HH:MM" (24h) to { hours, minutes }. */
function parseTime(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return { hours: 12, minutes: 0 };
  const parts = timeStr.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!parts) return { hours: 12, minutes: 0 };
  let hours = parseInt(parts[1], 10);
  const minutes = parseInt(parts[2], 10) || 0;
  if (hours >= 24) hours = 0;
  return { hours, minutes };
}

/**
 * Event start/end as Date (interpreted in festival timezone, then UTC).
 * @param {string} day - e.g. 'Friday'
 * @param {string} timeStr - e.g. '18:00'
 * @returns {Date}
 */
export function eventStartDate(day, timeStr) {
  const dayNum = DAY_DATE[day];
  if (dayNum == null) return new Date();
  const { hours, minutes } = parseTime(timeStr);
  const iso = `2026-08-${String(dayNum).padStart(2, '0')}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00${FESTIVAL_TZ_OFFSET}`;
  return new Date(iso);
}

/**
 * End date from day + end_time; falls back to start + 1 slot (30 min) if no end_time.
 */
export function eventEndDate(day, timeStr, endTimeStr) {
  if (endTimeStr && endTimeStr.trim() !== '') {
    return eventStartDate(day, endTimeStr);
  }
  const start = eventStartDate(day, timeStr);
  return new Date(start.getTime() + 30 * 60 * 1000);
}

/** Format Date as Google Calendar / iCal UTC: YYYYMMDDTHHmmssZ */
function toUTCString(d) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  const h = String(d.getUTCHours()).padStart(2, '0');
  const min = String(d.getUTCMinutes()).padStart(2, '0');
  const s = String(d.getUTCSeconds()).padStart(2, '0');
  return `${y}${m}${day}T${h}${min}${s}Z`;
}

/**
 * Build Google Calendar "Add event" URL for one event.
 * @param {{ title: string, description?: string, day: string, time: string, end_time?: string }} ev
 */
export function googleCalendarUrl(ev) {
  const start = eventStartDate(ev.day, ev.time);
  const end = eventEndDate(ev.day, ev.time, ev.end_time);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: ev.title || 'Event',
    dates: `${toUTCString(start)}/${toUTCString(end)}`,
  });
  if (ev.description) {
    params.set('details', ev.description.replace(/\n/g, '\n'));
  }
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function escapeIcsText(s) {
  if (!s) return '';
  return String(s)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/**
 * Build one VEVENT for iCalendar.
 * @param {{ id?: number, title: string, description?: string, day: string, time: string, end_time?: string }} ev
 * @param {string} [uid] - optional UID for the event
 */
export function eventToIcsVevent(ev, uid) {
  const start = eventStartDate(ev.day, ev.time);
  const end = eventEndDate(ev.day, ev.time, ev.end_time);
  const u = uid || `event-${ev.id ?? Date.now()}-${Math.random().toString(36).slice(2)}`;
  const lines = [
    'BEGIN:VEVENT',
    `UID:${u}@bass-canyon-planner`,
    `DTSTAMP:${toUTCString(new Date())}`,
    `DTSTART:${toUTCString(start)}`,
    `DTEND:${toUTCString(end)}`,
    `SUMMARY:${escapeIcsText(ev.title || 'Event')}`,
  ];
  if (ev.description) {
    lines.push(`DESCRIPTION:${escapeIcsText(ev.description)}`);
  }
  lines.push('END:VEVENT');
  return lines.join('\r\n');
}

/**
 * Build full .ics file content for multiple events.
 * @param {Array<{ id?: number, title: string, description?: string, day: string, time: string, end_time?: string }>} events
 * @param {string} [calendarName] - name for the calendar
 */
export function eventsToIcs(events, calendarName = 'Bass Canyon Schedule') {
  const vevents = events.map((ev) => eventToIcsVevent(ev));
  const header = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Bass Canyon Planner//EN',
    `X-WR-CALNAME:${escapeIcsText(calendarName)}`,
    'CALSCALE:GREGORIAN',
  ].join('\r\n');
  const footer = 'END:VCALENDAR';
  return [header, ...vevents, footer].join('\r\n');
}

/**
 * Trigger download of a blob as a file.
 */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Download .ics for one or more events.
 * @param {Array} events
 * @param {string} [filename] - e.g. 'bass-canyon-schedule.ics'
 */
export function downloadIcs(events, filename = 'bass-canyon-schedule.ics') {
  const ics = eventsToIcs(events);
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  downloadBlob(blob, filename);
}

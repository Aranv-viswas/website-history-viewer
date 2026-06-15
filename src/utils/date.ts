/**
 * Date helpers bridging three representations:
 *   - ISO date strings ("2010-01-01") used in routes/forms
 *   - Wayback timestamps ("20100101000000") used by the Archive API
 *   - Human-readable labels ("January 1, 2010") used in the UI
 */

import { ARCHIVE_START_YEAR, DEFAULT_TIME } from '@lib/constants';

/** Today's date as YYYY-MM-DD (UTC). */
export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** The current year. */
export function currentYear(): number {
  return new Date().getUTCFullYear();
}

/** Convert "YYYY-MM-DD" (or "YYYY") to a Wayback timestamp "YYYYMMDDhhmmss". */
export function toWaybackTimestamp(date: string): string {
  const clean = (date ?? '').trim();

  // Year only -> Jan 1 of that year.
  if (/^\d{4}$/.test(clean)) return `${clean}0101${DEFAULT_TIME}`;

  // Full ISO date.
  const match = clean.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [, y, m, d] = match;
    return `${y}${m}${d}${DEFAULT_TIME}`;
  }

  // Already a (partial) Wayback timestamp.
  if (/^\d{8,14}$/.test(clean)) return clean.padEnd(14, '0');

  // Fallback: today.
  return toWaybackTimestamp(todayISO());
}

/** Parse a Wayback timestamp "YYYYMMDDhhmmss" into a Date (UTC). */
export function fromWaybackTimestamp(ts: string): Date | null {
  const m = ts?.match(/^(\d{4})(\d{2})(\d{2})(\d{2})?(\d{2})?(\d{2})?$/);
  if (!m) return null;
  const [, y, mo, d, h = '00', mi = '00', s = '00'] = m;
  const date = new Date(
    Date.UTC(+y, +mo - 1, +d, +h, +mi, +s)
  );
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Wayback timestamp -> "YYYY-MM-DD". */
export function waybackTimestampToISO(ts: string): string | null {
  const date = fromWaybackTimestamp(ts);
  return date ? date.toISOString().slice(0, 10) : null;
}

const LONG_DATE = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  timeZone: 'UTC',
});

/** Human-readable label from an ISO date string. */
export function formatISODate(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? iso : LONG_DATE.format(date);
}

const SHORT_DATE = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

/** Compact label like "Jan 2008" from an ISO date string. */
export function formatMonthYear(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? iso : SHORT_DATE.format(date);
}

/** Human-readable label from a Wayback timestamp. */
export function formatWaybackTimestamp(ts: string): string {
  const date = fromWaybackTimestamp(ts);
  return date ? LONG_DATE.format(date) : ts;
}

/** First-of-year ISO date for a given year, e.g. 2008 -> "2008-01-01". */
export function yearToISO(year: number): string {
  return `${year}-01-01`;
}

/** Clamp a year into the range the Wayback Machine can serve. */
export function clampYear(year: number): number {
  const max = currentYear();
  if (year < ARCHIVE_START_YEAR) return ARCHIVE_START_YEAR;
  if (year > max) return max;
  return year;
}

/**
 * Build a sensible list of years for a timeline between `from` and now.
 * Defaults to every ~4 years for a compact, scannable timeline.
 */
export function timelineYears(from = 1999, step = 4): number[] {
  const years: number[] = [];
  const max = currentYear();
  for (let y = clampYear(from); y <= max; y += step) {
    years.push(y);
  }
  if (years[years.length - 1] !== max) years.push(max);
  return years;
}

/** Validate that an ISO date string is well-formed and within archive range. */
export function isValidArchiveDate(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return false;
  const year = date.getUTCFullYear();
  return year >= ARCHIVE_START_YEAR && year <= currentYear();
}

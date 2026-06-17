import { describe, it, expect } from 'vitest';
import {
  toWaybackTimestamp,
  fromWaybackTimestamp,
  waybackTimestampToISO,
  yearToISO,
  clampYear,
  timelineYears,
  isValidArchiveDate,
  currentYear,
} from './date';

describe('toWaybackTimestamp', () => {
  it('expands a full ISO date to a 14-digit timestamp', () => {
    expect(toWaybackTimestamp('2010-01-01')).toBe('20100101000000');
  });

  it('expands a year to Jan 1', () => {
    expect(toWaybackTimestamp('2008')).toBe('20080101000000');
  });

  it('pads an already-partial wayback timestamp', () => {
    expect(toWaybackTimestamp('20100101')).toBe('20100101000000');
  });

  it('falls back to today for garbage input', () => {
    const ts = toWaybackTimestamp('not-a-date');
    expect(ts).toMatch(/^\d{14}$/);
  });
});

describe('wayback timestamp parsing', () => {
  it('parses a full timestamp to a UTC Date', () => {
    const d = fromWaybackTimestamp('20100203040506');
    expect(d?.toISOString()).toBe('2010-02-03T04:05:06.000Z');
  });

  it('returns null for malformed input', () => {
    expect(fromWaybackTimestamp('abc')).toBeNull();
  });

  it('converts a timestamp to an ISO date', () => {
    expect(waybackTimestampToISO('20100203040506')).toBe('2010-02-03');
  });
});

describe('yearToISO', () => {
  it('produces a first-of-year ISO date', () => {
    expect(yearToISO(2008)).toBe('2008-01-01');
  });
});

describe('clampYear', () => {
  it('clamps below the archive start', () => {
    expect(clampYear(1990)).toBe(1996);
  });

  it('clamps above the current year', () => {
    expect(clampYear(currentYear() + 5)).toBe(currentYear());
  });

  it('passes through an in-range year', () => {
    expect(clampYear(2010)).toBe(2010);
  });
});

describe('timelineYears', () => {
  it('steps by the given interval and always includes the current year', () => {
    const years = timelineYears(1999, 4);
    expect(years[0]).toBe(1999);
    expect(years[years.length - 1]).toBe(currentYear());
    // Strictly increasing, no duplicate final year.
    const sorted = [...years].sort((a, b) => a - b);
    expect(years).toEqual(sorted);
    expect(new Set(years).size).toBe(years.length);
  });
});

describe('isValidArchiveDate', () => {
  it('accepts a well-formed in-range date', () => {
    expect(isValidArchiveDate('2010-06-15')).toBe(true);
  });

  it.each(['2010', '06-15-2010', '2010-13-01', 'not-a-date', ''])(
    'rejects %s',
    (input) => {
      expect(isValidArchiveDate(input)).toBe(false);
    }
  );

  it('rejects dates before the archive start year', () => {
    expect(isValidArchiveDate('1990-01-01')).toBe(false);
  });

  it('rejects future years', () => {
    expect(isValidArchiveDate(`${currentYear() + 1}-01-01`)).toBe(false);
  });
});

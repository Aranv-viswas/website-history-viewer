import { describe, it, expect } from 'vitest';
import {
  computeStats,
  groupByYear,
  pickRepresentativeMonths,
  buildFrames,
  detectArchivingSpikes,
  monthToISO,
  monthLabel,
  formatCoverage,
  formatCount,
} from './history';
import type { ArchiveOverview, MonthlyCaptures } from './types';

/** Build a months array from [year, month, captures] triples. */
function months(
  ...triples: Array<[number, number, number]>
): MonthlyCaptures[] {
  return triples.map(([year, month, captures]) => ({
    year,
    month,
    captures,
    statusClass: '2',
  }));
}

function overview(
  ms: MonthlyCaptures[],
  extra: Partial<ArchiveOverview> = {}
): ArchiveOverview {
  return {
    domain: 'example.com',
    status: 'ok',
    message: null,
    months: ms,
    firstTimestamp: null,
    lastTimestamp: null,
    totalCaptures: ms.reduce((s, m) => s + m.captures, 0),
    ...extra,
  };
}

describe('monthToISO / monthLabel', () => {
  it('targets mid-month so the closest-capture lookup can reach either side', () => {
    expect(monthToISO(2005, 6)).toBe('2005-06-15');
  });

  it('zero-pads single-digit months', () => {
    expect(monthToISO(1999, 1)).toBe('1999-01-15');
  });

  it('formats a compact label', () => {
    expect(monthLabel(2005, 6)).toBe('Jun 2005');
    expect(monthLabel(1998, 12)).toBe('Dec 1998');
  });
});

describe('computeStats', () => {
  it('returns zeroed stats for an overview with no months', () => {
    const stats = computeStats(overview([]));
    expect(stats.totalCaptures).toBe(0);
    expect(stats.firstArchivedDate).toBeNull();
    expect(stats.yearsSpanned).toBe(0);
    expect(stats.busiestMonth).toBeNull();
  });

  it('derives span, coverage and busiest month', () => {
    const stats = computeStats(
      overview(months([2000, 1, 10], [2000, 3, 50], [2001, 1, 20]))
    );
    expect(stats.firstYear).toBe(2000);
    expect(stats.lastYear).toBe(2001);
    expect(stats.yearsSpanned).toBe(2);
    expect(stats.yearsWithCaptures).toBe(2);
    expect(stats.totalCaptures).toBe(80);
    expect(stats.monthsWithCaptures).toBe(3);
    // Jan 2000 -> Jan 2001 inclusive is 13 months; 3 of them hold captures.
    expect(stats.monthsInSpan).toBe(13);
    expect(stats.coverage).toBeCloseTo(3 / 13);
    expect(stats.busiestMonth).toEqual({ year: 2000, month: 3, captures: 50 });
  });

  it('prefers the exact first/last capture timestamps when present', () => {
    const stats = computeStats(
      overview(months([1998, 11, 4], [2026, 9, 40]), {
        firstTimestamp: '19981111184551',
        lastTimestamp: '20260903120000',
      })
    );
    expect(stats.firstArchivedDate).toBe('1998-11-11');
    expect(stats.lastArchivedDate).toBe('2026-09-03');
  });

  it('falls back to month buckets when timestamps are missing', () => {
    const stats = computeStats(overview(months([1998, 11, 4])));
    expect(stats.firstArchivedDate).toBe('1998-11-15');
  });
});

describe('groupByYear', () => {
  it('fills gap years with a zero total so the axis stays proportional', () => {
    const years = groupByYear(months([2000, 1, 5], [2003, 1, 7]));
    expect(years.map((y) => y.year)).toEqual([2000, 2001, 2002, 2003]);
    expect(years.map((y) => y.captures)).toEqual([5, 0, 0, 7]);
  });

  it('sums every month within a year', () => {
    const years = groupByYear(months([2000, 1, 5], [2000, 6, 7]));
    expect(years).toHaveLength(1);
    expect(years[0].captures).toBe(12);
    expect(years[0].months).toHaveLength(2);
  });

  it('returns nothing for an empty history', () => {
    expect(groupByYear([])).toEqual([]);
  });
});

describe('pickRepresentativeMonths', () => {
  it('returns everything when there are fewer months than requested', () => {
    const ms = months([2000, 1, 5], [2001, 1, 5]);
    expect(pickRepresentativeMonths(ms, 10)).toHaveLength(2);
  });

  it('always keeps the first and last month on record', () => {
    const ms = Array.from({ length: 120 }, (_, i) => ({
      year: 2000 + Math.floor(i / 12),
      month: (i % 12) + 1,
      captures: 10,
      statusClass: '2',
    }));
    const picked = pickRepresentativeMonths(ms, 8);
    expect(picked[0]).toEqual(ms[0]);
    expect(picked[picked.length - 1]).toEqual(ms[ms.length - 1]);
  });

  it('spreads across the whole span instead of collapsing on dense years', () => {
    // Sparse early years, then an enormous modern crawl volume. Picking by
    // density alone would return only 2018-2019.
    const ms = [
      ...months([1999, 6, 3], [2001, 4, 5], [2004, 9, 8], [2008, 2, 12]),
      ...Array.from({ length: 24 }, (_, i) => ({
        year: 2018 + Math.floor(i / 12),
        month: (i % 12) + 1,
        captures: 5000,
        statusClass: '2',
      })),
    ];
    const picked = pickRepresentativeMonths(ms, 6);
    const years = picked.map((p) => p.year);
    expect(Math.min(...years)).toBe(1999);
    // At least one pick from the sparse pre-2018 era survived.
    expect(years.some((y) => y < 2018)).toBe(true);
  });

  it('prefers the densest month inside each time window', () => {
    const ms = months(
      [2000, 1, 1],
      [2000, 2, 99],
      [2000, 3, 1],
      [2010, 1, 1],
      [2010, 2, 99],
      [2010, 3, 1]
    );
    // Four slots: the two anchored extremes plus the densest month of each
    // half. (With only two slots the anchors fill them both, by design.)
    const picked = pickRepresentativeMonths(ms, 4);
    expect(picked.filter((p) => p.captures === 99)).toHaveLength(2);
  });

  it('never returns duplicates', () => {
    const ms = months([2000, 1, 5], [2005, 1, 5], [2010, 1, 5]);
    const picked = pickRepresentativeMonths(ms, 3);
    const keys = picked.map((p) => `${p.year}-${p.month}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('stays chronologically sorted', () => {
    const ms = Array.from({ length: 60 }, (_, i) => ({
      year: 2000 + Math.floor(i / 12),
      month: (i % 12) + 1,
      captures: (i * 37) % 100,
      statusClass: '2',
    }));
    const picked = pickRepresentativeMonths(ms, 7);
    const ordered = [...picked].sort(
      (a, b) => a.year - b.year || a.month - b.month
    );
    expect(picked).toEqual(ordered);
  });

  it('handles a zero/negative count', () => {
    expect(pickRepresentativeMonths(months([2000, 1, 5]), 0)).toEqual([]);
    expect(pickRepresentativeMonths(months([2000, 1, 5]), -3)).toEqual([]);
  });

  it('handles an empty history', () => {
    expect(pickRepresentativeMonths([], 5)).toEqual([]);
  });
});

describe('buildFrames', () => {
  it('produces renderable frames with dates and labels', () => {
    const frames = buildFrames(
      overview(months([1999, 6, 3], [2005, 3, 10], [2020, 11, 40])),
      3
    );
    expect(frames).toHaveLength(3);
    expect(frames[0]).toMatchObject({
      year: 1999,
      month: 6,
      date: '1999-06-15',
      label: 'Jun 1999',
    });
    expect(frames[0].snapshot).toBeNull();
  });

  it('returns nothing for an empty history', () => {
    expect(buildFrames(overview([]), 5)).toEqual([]);
  });
});

describe('detectArchivingSpikes', () => {
  it('needs at least three years of data', () => {
    expect(
      detectArchivingSpikes(overview(months([2000, 1, 10], [2001, 1, 500])))
    ).toEqual([]);
  });

  it('flags a year far above its local baseline', () => {
    const ms = months(
      [2000, 1, 20],
      [2001, 1, 20],
      [2002, 1, 200],
      [2003, 1, 20],
      [2004, 1, 20]
    );
    const spikes = detectArchivingSpikes(overview(ms));
    expect(spikes.map((s) => s.year)).toEqual([2002]);
    expect(spikes[0].ratio).toBeGreaterThanOrEqual(2.5);
  });

  it('does not flag steady growth as a spike', () => {
    const ms = months(
      [2000, 1, 100],
      [2001, 1, 110],
      [2002, 1, 125],
      [2003, 1, 140],
      [2004, 1, 155]
    );
    expect(detectArchivingSpikes(overview(ms))).toEqual([]);
  });

  it('ignores years below the minimum capture floor', () => {
    const ms = months(
      [2000, 1, 1],
      [2001, 1, 1],
      [2002, 1, 8],
      [2003, 1, 1],
      [2004, 1, 1]
    );
    expect(detectArchivingSpikes(overview(ms))).toEqual([]);
  });

  it('honours a configurable ratio', () => {
    const ms = months(
      [2000, 1, 20],
      [2001, 1, 20],
      [2002, 1, 60],
      [2003, 1, 20],
      [2004, 1, 20]
    );
    expect(detectArchivingSpikes(overview(ms), { ratio: 10 })).toEqual([]);
    expect(
      detectArchivingSpikes(overview(ms), { ratio: 2 }).map((s) => s.year)
    ).toEqual([2002]);
  });

  it('caps the number of results and returns them chronologically', () => {
    // Alternating quiet/loud years produce many candidate spikes.
    const ms = months(
      ...Array.from(
        { length: 30 },
        (_, i) =>
          [2000 + i, 1, i % 2 === 0 ? 20 : 400] as [number, number, number]
      )
    );
    const spikes = detectArchivingSpikes(overview(ms), { maxResults: 3 });
    expect(spikes.length).toBeLessThanOrEqual(3);
    expect(spikes.map((s) => s.year)).toEqual(
      [...spikes.map((s) => s.year)].sort((a, b) => a - b)
    );
  });
});

describe('formatters', () => {
  it('never reports 0% for a history that has captures', () => {
    expect(formatCoverage(0.001)).toBe('1%');
    expect(formatCoverage(0)).toBe('0%');
    expect(formatCoverage(0.734)).toBe('73%');
    expect(formatCoverage(1)).toBe('100%');
  });

  it('groups thousands', () => {
    expect(formatCount(1234567)).toBe('1,234,567');
    expect(formatCount(0)).toBe('0');
  });
});

describe('pickRepresentativeMonths — count is a hard cap', () => {
  it('never returns more than the requested count', () => {
    const ms = Array.from({ length: 360 }, (_, i) => ({
      year: 1996 + Math.floor(i / 12),
      month: (i % 12) + 1,
      captures: (i * 17) % 500,
      statusClass: '2',
    }));
    for (const n of [2, 3, 8, 24, 60]) {
      const picked = pickRepresentativeMonths(ms, n);
      expect(picked.length).toBeLessThanOrEqual(n);
    }
  });

  it('keeps the extremes even when trimming to the cap', () => {
    const ms = Array.from({ length: 120 }, (_, i) => ({
      year: 2000 + Math.floor(i / 12),
      month: (i % 12) + 1,
      captures: 50,
      statusClass: '2',
    }));
    const picked = pickRepresentativeMonths(ms, 5);
    expect(picked).toHaveLength(5);
    expect(picked[0]).toEqual(ms[0]);
    expect(picked[picked.length - 1]).toEqual(ms[ms.length - 1]);
  });

  it('still returns both extremes when only two are requested', () => {
    const ms = Array.from({ length: 50 }, (_, i) => ({
      year: 2000 + Math.floor(i / 12),
      month: (i % 12) + 1,
      captures: 10,
      statusClass: '2',
    }));
    const picked = pickRepresentativeMonths(ms, 2);
    expect(picked).toHaveLength(2);
    expect(picked[0]).toEqual(ms[0]);
    expect(picked[1]).toEqual(ms[ms.length - 1]);
  });
});

describe('pickRepresentativeMonths — trimming preserves the early web', () => {
  /**
   * Regression: crawl volume grows by orders of magnitude over a site's life,
   * so trimming the *least-captured* frames deletes the oldest ones — exactly
   * what the even time spread exists to prevent.
   */
  it('keeps early frames when the modern era is far denser', () => {
    const ms: MonthlyCaptures[] = [];
    for (let year = 1998; year <= 2026; year += 1) {
      for (let month = 1; month <= 12; month += 1) {
        ms.push({
          year,
          month,
          // 4 captures/month in 1998 growing to ~1M by 2026.
          captures: Math.round(4 * Math.pow(1.55, year - 1998)),
          statusClass: '2',
        });
      }
    }

    const picked = pickRepresentativeMonths(ms, 6);
    expect(picked).toHaveLength(6);

    const years = picked.map((p) => p.year);
    expect(years[0]).toBe(1998);
    expect(years[years.length - 1]).toBe(2026);

    // The interior frames must span the history, not bunch up in the dense
    // modern years. With 6 frames over 29 years, at least two interior frames
    // should predate the halfway point.
    const midpoint = 2012;
    const early = years.filter((y) => y < midpoint);
    expect(early.length).toBeGreaterThanOrEqual(2);
  });

  it('spaces trimmed frames roughly evenly in time', () => {
    const ms: MonthlyCaptures[] = [];
    for (let year = 2000; year <= 2023; year += 1) {
      for (let month = 1; month <= 12; month += 1) {
        ms.push({
          year,
          month,
          captures: Math.round(Math.pow(2, year - 2000)),
          statusClass: '2',
        });
      }
    }

    const picked = pickRepresentativeMonths(ms, 8);
    expect(picked).toHaveLength(8);

    const indices = picked.map((p) => p.year * 12 + p.month);
    const gaps = indices.slice(1).map((v, i) => v - indices[i]);
    const largest = Math.max(...gaps);
    const smallest = Math.min(...gaps);

    // No gap should be wildly out of proportion with the others.
    expect(largest / smallest).toBeLessThan(4);
  });
});

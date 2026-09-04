/**
 * Pure computations over an `ArchiveOverview`.
 *
 * Everything here is a deterministic function of already-fetched data — no
 * network, no environment — so the statistics, the timeline shape, the
 * evolution frame list and the redesign heuristic are all unit-testable and can
 * run identically on the server or in the browser.
 *
 * A recurring theme: the Internet Archive's coverage is uneven and incomplete.
 * These functions describe *the archive's holdings*, never the website's real
 * history, and the labels they feed must say so.
 */

import type {
  ArchiveOverview,
  EvolutionFrame,
  HistoryStats,
  MonthlyCaptures,
} from './types';
import { waybackTimestampToISO } from '@utils/date';

/** Total months from (y1,m1) to (y2,m2) inclusive. */
function monthSpan(y1: number, m1: number, y2: number, m2: number): number {
  return (y2 - y1) * 12 + (m2 - m1) + 1;
}

/** "2005-06" style key. */
export function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/** Compact label for a month bucket, e.g. "Jun 2005". */
export function monthLabel(year: number, month: number): string {
  return `${MONTH_NAMES[month - 1] ?? '?'} ${year}`;
}

/**
 * Mid-month ISO date for a bucket, e.g. (2005, 6) -> "2005-06-15".
 *
 * We aim at the middle rather than the 1st because the availability API returns
 * the *closest* capture to the requested instant: from mid-month it can reach
 * captures on either side, which finds a real capture far more often than
 * asking for the 1st of a month whose captures all land late.
 */
export function monthToISO(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}-15`;
}

/**
 * Derive the headline statistics for a domain's archived history.
 *
 * Returns zeroed stats (rather than throwing) for a non-'ok' overview so the UI
 * can render the same layout with an explanatory empty state.
 */
export function computeStats(overview: ArchiveOverview): HistoryStats {
  const { months, domain } = overview;

  const empty: HistoryStats = {
    domain,
    firstArchivedDate: null,
    lastArchivedDate: null,
    firstYear: null,
    lastYear: null,
    yearsSpanned: 0,
    yearsWithCaptures: 0,
    totalCaptures: 0,
    coverage: 0,
    monthsWithCaptures: 0,
    monthsInSpan: 0,
    busiestMonth: null,
  };

  if (months.length === 0) return empty;

  const first = months[0];
  const last = months[months.length - 1];

  // Prefer the exact first/last capture timestamps when the Archive gave them
  // to us; fall back to the month buckets, which are always present.
  const firstArchivedDate =
    (overview.firstTimestamp &&
      waybackTimestampToISO(overview.firstTimestamp)) ||
    monthToISO(first.year, first.month);
  const lastArchivedDate =
    (overview.lastTimestamp && waybackTimestampToISO(overview.lastTimestamp)) ||
    monthToISO(last.year, last.month);

  const firstYear = Number(firstArchivedDate.slice(0, 4)) || first.year;
  const lastYear = Number(lastArchivedDate.slice(0, 4)) || last.year;

  const monthsInSpan = monthSpan(
    first.year,
    first.month,
    last.year,
    last.month
  );
  const busiest = months.reduce((best, m) =>
    m.captures > best.captures ? m : best
  );

  return {
    domain,
    firstArchivedDate,
    lastArchivedDate,
    firstYear,
    lastYear,
    yearsSpanned: Math.max(1, lastYear - firstYear + 1),
    yearsWithCaptures: new Set(months.map((m) => m.year)).size,
    totalCaptures: overview.totalCaptures,
    coverage: monthsInSpan > 0 ? months.length / monthsInSpan : 0,
    monthsWithCaptures: months.length,
    monthsInSpan,
    busiestMonth: {
      year: busiest.year,
      month: busiest.month,
      captures: busiest.captures,
    },
  };
}

/**
 * Group months into per-year buckets for the timeline axis.
 *
 * Years with no captures at all are included with a zero total, so the axis
 * stays proportional to real time and gaps in the archive are visible rather
 * than silently collapsed.
 */
export function groupByYear(
  months: MonthlyCaptures[]
): Array<{ year: number; captures: number; months: MonthlyCaptures[] }> {
  if (months.length === 0) return [];

  const byYear = new Map<number, MonthlyCaptures[]>();
  for (const m of months) {
    const list = byYear.get(m.year);
    if (list) list.push(m);
    else byYear.set(m.year, [m]);
  }

  const firstYear = months[0].year;
  const lastYear = months[months.length - 1].year;
  const out: Array<{
    year: number;
    captures: number;
    months: MonthlyCaptures[];
  }> = [];

  for (let year = firstYear; year <= lastYear; year += 1) {
    const list = byYear.get(year) ?? [];
    out.push({
      year,
      captures: list.reduce((sum, m) => sum + m.captures, 0),
      months: list,
    });
  }
  return out;
}

/**
 * Choose `count` representative months spread evenly across the whole history.
 *
 * The naive approaches both fail: taking the first N months over-weights the
 * archive's early years, and taking the N densest months collapses onto the
 * 2015+ era where crawl volume exploded (a large site can have 100× more
 * captures per month now than in 1999). Neither shows how a site *evolved*.
 *
 * So we slice the calendar span into `count` equal time windows and pick one
 * month from each — the densest month in the window, because a month with more
 * captures is more likely to resolve to a snapshot that actually renders.
 * Windows with no captures are skipped rather than filled, which keeps genuine
 * archive gaps honest instead of duplicating a neighbouring year.
 *
 * The first and last months on record are always included, so a history always
 * begins and ends at its true extremes.
 */
export function pickRepresentativeMonths(
  months: MonthlyCaptures[],
  count: number
): MonthlyCaptures[] {
  if (months.length === 0) return [];
  if (count <= 0) return [];
  if (months.length <= count) return [...months];

  const first = months[0];
  const last = months[months.length - 1];
  const totalMonths = monthSpan(first.year, first.month, last.year, last.month);

  /** Absolute month index relative to the first month on record. */
  const indexOf = (m: MonthlyCaptures) =>
    monthSpan(first.year, first.month, m.year, m.month) - 1;

  const windowSize = totalMonths / count;
  const chosen = new Map<string, MonthlyCaptures>();

  // Anchor the extremes so the timeline always spans the real range.
  chosen.set(monthKey(first.year, first.month), first);
  chosen.set(monthKey(last.year, last.month), last);

  for (let w = 0; w < count; w += 1) {
    const lo = w * windowSize;
    const hi = (w + 1) * windowSize;

    let best: MonthlyCaptures | null = null;
    for (const m of months) {
      const idx = indexOf(m);
      if (idx < lo || idx >= hi) continue;
      if (!best || m.captures > best.captures) best = m;
    }
    if (best) chosen.set(monthKey(best.year, best.month), best);
  }

  let picked = [...chosen.values()].sort(
    (a, b) => a.year - b.year || a.month - b.month
  );

  // Anchoring the extremes can push the result one or two past the requested
  // count, which would make `count` a suggestion rather than a cap. Trim back
  // down — but trim by *temporal redundancy*, never by density.
  //
  // Dropping the least-captured months instead would be actively wrong: crawl
  // volume grows by orders of magnitude over a site's life, so "sparsest" is
  // almost always "oldest", and trimming that way deletes the early-web frames
  // the even spread exists to preserve. (Observed: google.com at count=6 came
  // back as 1998, 2012, 2016, 2022, 2022, 2026.)
  //
  // So we remove the interior month whose neighbours are closest together —
  // the point that adds least to the coverage of the span — which keeps the
  // remaining frames as evenly spaced in time as possible.
  while (picked.length > count && picked.length > 2) {
    let redundant = 1;
    let smallestGap = Infinity;
    for (let i = 1; i < picked.length - 1; i += 1) {
      const gap = indexOf(picked[i + 1]) - indexOf(picked[i - 1]);
      if (gap < smallestGap) {
        smallestGap = gap;
        redundant = i;
      }
    }
    picked = picked.filter((_, i) => i !== redundant);
  }

  return picked;
}

/**
 * Build the frame list an evolution playback (or a horizontal timeline) renders.
 *
 * Frames carry only what the UI needs to draw a point and, on demand, request
 * the snapshot behind it — resolving every snapshot up front would mean dozens
 * of upstream calls for a single page view.
 */
export function buildFrames(
  overview: ArchiveOverview,
  count: number
): EvolutionFrame[] {
  return pickRepresentativeMonths(overview.months, count).map((m) => ({
    year: m.year,
    month: m.month,
    date: monthToISO(m.year, m.month),
    captures: m.captures,
    label: monthLabel(m.year, m.month),
    snapshot: null,
  }));
}

/* ─────────────────────────── Redesign heuristics ─────────────────────────── */

/**
 * Tunables for {@link detectArchivingSpikes}. Exposed so the threshold can be
 * raised or lowered per page without editing the algorithm.
 */
export interface SpikeConfig {
  /**
   * How many times the surrounding baseline a year must exceed to count.
   * Higher = fewer, more confident signals.
   */
  ratio: number;
  /** Years of context either side used to compute the baseline. */
  window: number;
  /** Ignore years below this many captures — tiny numbers are noise. */
  minCaptures: number;
  /** Never return more than this many, keeping the UI readable. */
  maxResults: number;
}

export const DEFAULT_SPIKE_CONFIG: SpikeConfig = {
  ratio: 2.5,
  window: 2,
  minCaptures: 12,
  maxResults: 6,
};

/**
 * Find years where archiving activity spiked well above its local baseline.
 *
 * IMPORTANT — what this does and does not mean. This measures *crawl volume*,
 * not pixels: the Internet Archive crawls a site harder when it changes, is
 * newsworthy, or gets more inbound links, so a spike is a signal that something
 * notable happened that year, and relaunches are a common cause. It is not a
 * detected redesign, and the UI must present it as "worth a look", never as a
 * confirmed visual change. Confirming an actual redesign needs rendered
 * screenshots and a pixel comparison (see `detectVisualChange` in
 * `@services/visual-diff`, which requires a configured screenshot provider).
 *
 * The baseline is the median of the surrounding years rather than the mean, so
 * one enormous year doesn't raise the bar for its neighbours and hide them.
 */
export function detectArchivingSpikes(
  overview: ArchiveOverview,
  config: Partial<SpikeConfig> = {}
): Array<{ year: number; captures: number; baseline: number; ratio: number }> {
  const cfg = { ...DEFAULT_SPIKE_CONFIG, ...config };
  const years = groupByYear(overview.months);
  if (years.length < 3) return [];

  const spikes: Array<{
    year: number;
    captures: number;
    baseline: number;
    ratio: number;
  }> = [];

  for (let i = 0; i < years.length; i += 1) {
    const current = years[i];
    if (current.captures < cfg.minCaptures) continue;

    const neighbours = years
      .slice(Math.max(0, i - cfg.window), i)
      .concat(years.slice(i + 1, i + 1 + cfg.window))
      .map((y) => y.captures)
      .sort((a, b) => a - b);

    if (neighbours.length === 0) continue;

    const mid = Math.floor(neighbours.length / 2);
    const baseline =
      neighbours.length % 2 === 0
        ? (neighbours[mid - 1] + neighbours[mid]) / 2
        : neighbours[mid];

    // A year next to genuinely empty years is a resumption, not a spike —
    // treat the baseline as at least 1 so the ratio stays finite and meaningful.
    const ratio = current.captures / Math.max(1, baseline);
    if (ratio >= cfg.ratio) {
      spikes.push({
        year: current.year,
        captures: current.captures,
        baseline,
        ratio,
      });
    }
  }

  return spikes
    .sort((a, b) => b.ratio - a.ratio)
    .slice(0, cfg.maxResults)
    .sort((a, b) => a.year - b.year);
}

/**
 * Format a coverage ratio as a rounded percentage string, e.g. 0.734 -> "73%".
 * Anything above zero reports at least "1%" so a sparse history never reads as
 * "0% covered" when captures demonstrably exist.
 */
export function formatCoverage(coverage: number): string {
  if (coverage <= 0) return '0%';
  return `${Math.max(1, Math.round(coverage * 100))}%`;
}

/** Thousands-separated capture count, e.g. 1234567 -> "1,234,567". */
export function formatCount(n: number): string {
  return n.toLocaleString('en-US');
}

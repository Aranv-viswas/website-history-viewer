/**
 * Design evolution — how a site's markup, palette and logo changed over time,
 * and where the likely redesigns are.
 *
 * This is the expensive path in the whole application: it fetches and analyses
 * one archived HTML document per frame (~2s each). Three things keep that
 * affordable:
 *
 *   1. **A hard frame budget.** Eight frames by default, twelve at most. Enough
 *      to see an arc; not enough to become a crawl.
 *   2. **Bounded concurrency.** Two in flight, so a cold request is a few
 *      seconds rather than a burst the Archive will rate-limit.
 *   3. **Aggressive caching + de-duplication.** The whole sequence is memoized
 *      for a day and concurrent identical requests share one run, so the cost is
 *      paid once per domain rather than once per visitor.
 *
 * Because of the cost, nothing renders this synchronously — the page ships its
 * shell and fetches /api/design-evolution behind a progress state.
 */

import type {
  ArchiveOverview,
  DesignFrame,
  DeviceComparison,
  PageFingerprint,
} from '@lib/types';
import { analyzeSnapshot, compareFingerprints } from './page-analysis';
import { getArchiveOverview } from './archive-overview';
import { dedupe } from './cache';
import { buildFrames, groupByYear } from '@lib/history';
import { normalizeDomain } from '@utils/domain';

/** Frames analysed per sequence. */
export const DEFAULT_DESIGN_FRAMES = 8;
export const MAX_DESIGN_FRAMES = 12;

/**
 * Simultaneous archived-page fetches.
 *
 * Deliberately small, and lowered from 3 after measuring: at 3, the Archive
 * started refusing and timing out enough that half a sequence came back
 * unreadable. Two in flight is slower per run but analyses far more frames,
 * and a run that succeeds is cached for a day.
 */
const CONCURRENCY = 2;

const TTL_MS = 24 * 60 * 60 * 1000;

/**
 * How much markup distance counts as a likely redesign.
 *
 * Tuned against real sequences: routine content churn on a busy site lands in
 * the teens and twenties, while genuine rebuilds (layout technique changed,
 * navigation replaced) land well above 50. The threshold is exported and
 * accepted as a parameter so it can be tightened or loosened per call rather
 * than being baked into the algorithm.
 */
export const DEFAULT_REDESIGN_THRESHOLD = 55;

/** Run `task` over `items` with at most `limit` in flight, preserving order. */
async function mapLimit<T, R>(
  items: T[],
  limit: number,
  task: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;

  async function worker(): Promise<void> {
    while (next < items.length) {
      const index = next++;
      results[index] = await task(items[index], index);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker)
  );
  return results;
}

/**
 * Build the design-evolution sequence for a domain.
 *
 * Each frame carries its palette, best logo candidate, era markers, and — from
 * the second frame on — how far its markup moved from the frame before it.
 */
export async function getDesignEvolution(
  input: string,
  frameCount = DEFAULT_DESIGN_FRAMES
): Promise<{
  domain: string;
  status: ArchiveOverview['status'];
  message: string | null;
  frames: DesignFrame[];
  analyzedCount: number;
}> {
  const domain = normalizeDomain(input);
  const count = Math.min(MAX_DESIGN_FRAMES, Math.max(2, frameCount));

  return dedupe(
    `design:${domain}:${count}`,
    async () => {
      const overview = await getArchiveOverview(domain);

      if (overview.status !== 'ok') {
        return {
          domain,
          status: overview.status,
          message: overview.message,
          frames: [] as DesignFrame[],
          analyzedCount: 0,
        };
      }

      const picks = buildFrames(overview, count);

      const fingerprints = await mapLimit(picks, CONCURRENCY, (frame) =>
        analyzeSnapshot(domain, frame.date)
      );

      /* Chain the comparisons: each analysed frame is measured against the last
         one that analysed successfully, so a single unreadable capture creates a
         gap rather than breaking the chain for everything after it. */
      let previous: PageFingerprint | null = null;

      const frames: DesignFrame[] = picks.map((pick, i) => {
        const fp = fingerprints[i];

        if (!fp.ok) {
          return {
            year: pick.year,
            date: pick.date,
            label: pick.label,
            ok: false,
            message: fp.message,
            title: null,
            colors: [],
            logo: null,
            usesTableLayout: false,
            usesFlash: false,
            isResponsive: false,
            changeScore: null,
            changes: [],
          };
        }

        const comparison = previous ? compareFingerprints(previous, fp) : null;
        previous = fp;

        return {
          year: pick.year,
          date: fp.date || pick.date,
          label: pick.label,
          ok: true,
          message: null,
          title: fp.title,
          colors: fp.colors,
          logo: fp.logos[0]
            ? { url: fp.logos[0].url, alt: fp.logos[0].alt }
            : null,
          usesTableLayout: fp.usesTableLayout,
          usesFlash: fp.usesFlash,
          isResponsive: fp.isResponsive,
          changeScore: comparison ? comparison.score : null,
          changes: comparison ? comparison.changes : [],
        };
      });

      return {
        domain,
        status: 'ok' as const,
        message: null,
        frames,
        analyzedCount: frames.filter((f) => f.ok).length,
      };
    },
    TTL_MS
  );
}

/**
 * Pick out the frames that look like redesigns.
 *
 * A frame qualifies when its markup distance from the previous analysed frame
 * clears `threshold`. Because frames are spread across the whole history, a hit
 * means "the site was rebuilt somewhere between these two dates" — not "it was
 * rebuilt on this date". The UI must say so.
 */
export function findLikelyRedesigns(
  frames: DesignFrame[],
  threshold = DEFAULT_REDESIGN_THRESHOLD
): Array<{
  from: DesignFrame;
  to: DesignFrame;
  score: number;
  headline: string;
}> {
  const results: Array<{
    from: DesignFrame;
    to: DesignFrame;
    score: number;
    headline: string;
  }> = [];

  let previousOk: DesignFrame | null = null;

  for (const frame of frames) {
    if (!frame.ok) continue;

    if (
      previousOk &&
      frame.changeScore !== null &&
      frame.changeScore >= threshold
    ) {
      results.push({
        from: previousOk,
        to: frame,
        score: frame.changeScore,
        // The strongest observation makes the best one-line summary.
        headline: frame.changes[0]?.summary ?? 'Substantial markup changes',
      });
    }
    previousOk = frame;
  }

  return results;
}

/* ─────────────────────────── Mobile vs. desktop ──────────────────────────── */

/**
 * Host prefixes that historically served a site's dedicated mobile version.
 * Checked in order; the first with real captures wins.
 */
const MOBILE_PREFIXES = ['m.', 'mobile.', 'touch.', 'wap.'];

/**
 * Find whether a domain had a separate mobile site the archive captured.
 *
 * Deliberately conservative. A dedicated mobile host either has captures or it
 * doesn't, and when it doesn't we say exactly that rather than presenting a
 * desktop capture at a narrow viewport and calling it mobile — the archive
 * stores what was served, and inventing a mobile version would be a lie about
 * what is in it. Sites that went responsive instead of building a separate
 * mobile host will correctly report no mobile captures; the responsive markup
 * signal in the design evolution is where that story shows up.
 */
export async function getDeviceComparison(
  input: string
): Promise<DeviceComparison> {
  const domain = normalizeDomain(input);

  return dedupe<DeviceComparison>(
    `devices:${domain}`,
    async () => {
      const desktop = await getArchiveOverview(domain);

      const base: DeviceComparison = {
        domain,
        mobileHost: null,
        hasMobileCaptures: false,
        mobileFirstYear: null,
        mobileLastYear: null,
        mobileCaptures: 0,
        desktopFirstYear: desktop.months[0]?.year ?? null,
        desktopLastYear:
          desktop.months[desktop.months.length - 1]?.year ?? null,
        desktopCaptures: desktop.totalCaptures,
        overlappingYears: [],
        message: null,
      };

      if (desktop.status !== 'ok') {
        return { ...base, message: desktop.message };
      }

      // A bare host has no useful "m." form (m.m.google.com), and a host that
      // already looks mobile shouldn't be probed for a mobile version of itself.
      if (MOBILE_PREFIXES.some((p) => domain.startsWith(p))) {
        return {
          ...base,
          message: 'This is already a mobile host.',
        };
      }

      for (const prefix of MOBILE_PREFIXES) {
        const host = `${prefix}${domain}`;
        const mobile = await getArchiveOverview(host);
        if (mobile.status !== 'ok' || mobile.months.length === 0) continue;

        const desktopYears = new Set(
          groupByYear(desktop.months)
            .filter((y) => y.captures > 0)
            .map((y) => y.year)
        );
        const overlapping = groupByYear(mobile.months)
          .filter((y) => y.captures > 0 && desktopYears.has(y.year))
          .map((y) => y.year);

        return {
          ...base,
          mobileHost: host,
          hasMobileCaptures: true,
          mobileFirstYear: mobile.months[0].year,
          mobileLastYear: mobile.months[mobile.months.length - 1].year,
          mobileCaptures: mobile.totalCaptures,
          overlappingYears: overlapping,
          message: null,
        };
      }

      return {
        ...base,
        message: `The Wayback Machine has no captures of a separate mobile site for ${domain} (we checked ${MOBILE_PREFIXES.map(
          (p) => `${p}${domain}`
        ).join(', ')}). Many sites went responsive instead of building one.`,
      };
    },
    TTL_MS
  );
}

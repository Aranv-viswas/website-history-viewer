/**
 * Archive overview service — the fast, primary source of history data.
 *
 * The Wayback Machine's own calendar UI is driven by an undocumented but stable
 * endpoint:
 *
 *   https://web.archive.org/__wb/sparkline?output=json&url=<host>&collection=web
 *
 * It answers in well under a second (measured ~0.75s across large and small
 * domains) and returns everything the timeline, statistics and evolution
 * features need:
 *
 *   {
 *     "years":   { "1996": [ ...12 monthly capture counts... ], ... },
 *     "status":  { "1996": "2222....." },   // one HTTP status class per month
 *     "first_ts": "19961012231057",
 *     "last_ts":  "20260901120000",
 *     "error":   { "type": "blocked" }      // domain excluded from the archive
 *     "message": "…The Wayback Machine has not archived that URL…"
 *   }
 *
 * Why this and not the CDX index: a CDX capture listing for a large domain
 * measured 20–45 seconds and returned 403/503 under even light concurrency, so
 * it can't sit on a page render's critical path. CDX still has a role — exact
 * capture listings for a *bounded* window — and lives in `./cdx.ts` as an
 * explicitly optional, non-blocking enhancement.
 *
 * This module only fetches and normalizes. All derived numbers (totals, spans,
 * coverage, representative sampling) are pure functions in `@lib/history` so
 * they're testable without network access.
 */

import type { ArchiveOverview, MonthlyCaptures } from '@lib/types';
import { dedupe } from './cache';
import { normalizeDomain } from '@utils/domain';
import { ARCHIVE_START_YEAR } from '@lib/constants';

const SPARKLINE_ENDPOINT = 'https://web.archive.org/__wb/sparkline';

/** The endpoint is fast; a short ceiling keeps a stall off the render path. */
const REQUEST_TIMEOUT_MS = 9000;

/**
 * Overviews change at most once a day (a new capture shifts `last_ts` and one
 * monthly bucket), so successes cache for hours. Failures cache briefly — long
 * enough to shield the upstream from a retry storm, short enough that a blip
 * clears fast. "Blocked" and "not archived" are properties of the domain rather
 * than transient faults, so they hold for longer than an outage does.
 */
const SUCCESS_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const NEGATIVE_TTL_MS = 60 * 60 * 1000; // 1 hour — blocked / not archived
const FAILURE_TTL_MS = 2 * 60 * 1000; // 2 minutes — timeouts, 5xx, rate limits

const USER_AGENT =
  'WebsiteHistoryViewer/1.0 (+https://websitehistoryviewer.com)';

/** Raw shape of the sparkline response (all fields optional/defensive). */
interface SparklineResponse {
  years?: Record<string, unknown>;
  status?: Record<string, unknown>;
  first_ts?: string | null;
  last_ts?: string | null;
  error?: { type?: string; block_reason?: string } | null;
  message?: string | null;
}

function failure(
  domain: string,
  status: ArchiveOverview['status'],
  message: string
): ArchiveOverview {
  return {
    domain,
    status,
    message,
    months: [],
    firstTimestamp: null,
    lastTimestamp: null,
    totalCaptures: 0,
  };
}

/**
 * Coerce one year's 12-element count array. The upstream occasionally returns
 * numbers as strings, short arrays, or nulls, so every slot is normalized to a
 * non-negative integer and the array is padded to 12.
 */
function normalizeYearCounts(raw: unknown): number[] {
  const arr = Array.isArray(raw) ? raw : [];
  const out = new Array<number>(12).fill(0);
  for (let i = 0; i < 12; i += 1) {
    const n = Number(arr[i]);
    out[i] = Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
  }
  return out;
}

/**
 * Flatten `{ years, status }` into a chronologically sorted list of months that
 * actually hold captures. Empty months are dropped — a sparse 30-year history
 * would otherwise be 360 mostly-zero entries to ship to the client.
 *
 * `status` is a 12-character string per year, one HTTP status *class* digit per
 * month ("2" = 2xx, "3" = redirect, "4"/"5" = error). We keep it so the UI can
 * distinguish "captured and served fine" from "captured an error page".
 */
function toMonths(
  years: Record<string, unknown> | undefined,
  statuses: Record<string, unknown> | undefined
): MonthlyCaptures[] {
  const months: MonthlyCaptures[] = [];
  const thisYear = new Date().getUTCFullYear();

  for (const [yearKey, counts] of Object.entries(years ?? {})) {
    const year = Number(yearKey);
    // Guard against junk keys and impossible years leaking into the timeline.
    if (!Number.isInteger(year) || year < ARCHIVE_START_YEAR - 1) continue;
    if (year > thisYear + 1) continue;

    const perMonth = normalizeYearCounts(counts);
    const statusRow =
      typeof statuses?.[yearKey] === 'string'
        ? (statuses[yearKey] as string)
        : '';

    for (let m = 0; m < 12; m += 1) {
      if (perMonth[m] <= 0) continue;
      months.push({
        year,
        month: m + 1,
        captures: perMonth[m],
        statusClass: statusRow[m] ?? null,
      });
    }
  }

  months.sort((a, b) => a.year - b.year || a.month - b.month);
  return months;
}

/** A 14-digit Wayback timestamp, or null when the value is unusable. */
function cleanTimestamp(value: unknown): string | null {
  const s = typeof value === 'string' ? value.trim() : '';
  return /^\d{14}$/.test(s) ? s : null;
}

/**
 * Fetch the archive overview for a domain.
 *
 * Always resolves — never throws — so callers can render a useful state for
 * every outcome. Inspect `status` to tell them apart:
 *
 *   'ok'            usable history in `months`
 *   'not-archived'  the Archive has nothing for this host
 *   'blocked'       the host is excluded from the Wayback Machine
 *   'unavailable'   upstream error/timeout/rate limit — retryable
 *   'invalid'       the input isn't a usable domain
 */
export async function getArchiveOverview(
  input: string
): Promise<ArchiveOverview> {
  const domain = normalizeDomain(input);
  if (!domain) {
    return failure(domain, 'invalid', 'Please enter a valid website address.');
  }

  return dedupe<ArchiveOverview>(
    `overview:${domain}`,
    () => fetchOverview(domain),
    (o) => {
      if (o.status === 'ok') return SUCCESS_TTL_MS;
      if (o.status === 'blocked' || o.status === 'not-archived')
        return NEGATIVE_TTL_MS;
      return FAILURE_TTL_MS;
    }
  );
}

async function fetchOverview(domain: string): Promise<ArchiveOverview> {
  const url = `${SPARKLINE_ENDPOINT}?output=json&url=${encodeURIComponent(
    domain
  )}&collection=web`;

  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/json',
        // The endpoint serves the Archive's own calendar; a matching Referer
        // keeps us on its expected request shape.
        Referer: 'https://web.archive.org/',
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (err) {
    const timedOut = err instanceof Error && err.name === 'TimeoutError';
    return failure(
      domain,
      'unavailable',
      timedOut
        ? 'The Internet Archive took too long to respond. Please try again.'
        : 'We could not reach the Internet Archive. Please try again shortly.'
    );
  }

  if (res.status === 429) {
    return failure(
      domain,
      'unavailable',
      'The Internet Archive is rate-limiting requests right now. Please try again in a moment.'
    );
  }
  if (!res.ok) {
    return failure(
      domain,
      'unavailable',
      `The Internet Archive returned an error (HTTP ${res.status}).`
    );
  }

  let data: SparklineResponse;
  try {
    data = (await res.json()) as SparklineResponse;
  } catch {
    return failure(
      domain,
      'unavailable',
      'The Internet Archive returned an unexpected response.'
    );
  }

  // Domains excluded from the Wayback Machine (robots/admin exclusions) report
  // an explicit error type. Say so plainly rather than implying "no history".
  if (data.error?.type === 'blocked') {
    return failure(
      domain,
      'blocked',
      `${domain} has been excluded from the Wayback Machine, so its archived history can't be shown.`
    );
  }

  const months = toMonths(data.years, data.status);

  if (months.length === 0) {
    return failure(
      domain,
      'not-archived',
      `The Wayback Machine has no archived captures for ${domain}.`
    );
  }

  return {
    domain,
    status: 'ok',
    message: null,
    months,
    firstTimestamp: cleanTimestamp(data.first_ts),
    lastTimestamp: cleanTimestamp(data.last_ts),
    totalCaptures: months.reduce((sum, m) => sum + m.captures, 0),
  };
}

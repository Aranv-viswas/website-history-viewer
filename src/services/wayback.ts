/**
 * Wayback Machine service.
 *
 * Wraps the Internet Archive "availability" API:
 *   https://archive.org/wayback/available?url=google.com&timestamp=20100101
 *
 * Responsibilities:
 *   - Build well-formed queries from a (domain, date) pair.
 *   - Normalize the loose API response into our `Snapshot` type.
 *   - Gracefully handle missing snapshots, timeouts, rate limits, and failures.
 *   - Cache results so repeat views and timelines are fast and polite.
 */

import type { Snapshot, WaybackAvailabilityResponse } from '@lib/types';
import { cached } from './cache';
import { normalizeDomain } from '@utils/domain';
import {
  toWaybackTimestamp,
  waybackTimestampToISO,
  todayISO,
} from '@utils/date';

const AVAILABILITY_ENDPOINT = 'https://archive.org/wayback/available';
const REQUEST_TIMEOUT_MS = 8000;

/** A descriptive User-Agent is courteous and recommended by archive.org. */
const USER_AGENT =
  'WebsiteHistoryViewer/1.0 (+https://websitehistoryviewer.com)';

function notAvailable(
  domain: string,
  date: string,
  message: string
): Snapshot {
  return {
    domain,
    requestedDate: date,
    available: false,
    archivedUrl: null,
    timestamp: null,
    capturedAt: null,
    status: null,
    message,
  };
}

/**
 * Get the closest archived snapshot for a domain at (or near) a given date.
 *
 * @param domain  Any user input; will be normalized to a bare host.
 * @param date    "YYYY-MM-DD", "YYYY", or a Wayback timestamp.
 */
export async function getSnapshot(
  domain: string,
  date: string
): Promise<Snapshot> {
  const host = normalizeDomain(domain);
  const requestedDate = /^\d{4}$/.test(date) ? `${date}-01-01` : date;

  if (!host) {
    return notAvailable(host, requestedDate, 'Please enter a valid website.');
  }

  const timestamp = toWaybackTimestamp(date);
  const cacheKey = `snapshot:${host}:${timestamp}`;

  return cached<Snapshot>(cacheKey, async () => {
    const url = `${AVAILABILITY_ENDPOINT}?url=${encodeURIComponent(
      host
    )}&timestamp=${timestamp}`;

    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      if (res.status === 429) {
        return notAvailable(
          host,
          requestedDate,
          'The Internet Archive is rate-limiting requests right now. Please try again in a moment.'
        );
      }

      if (!res.ok) {
        return notAvailable(
          host,
          requestedDate,
          `The Wayback Machine returned an error (HTTP ${res.status}).`
        );
      }

      const data = (await res.json()) as WaybackAvailabilityResponse;
      const closest = data?.archived_snapshots?.closest;

      if (!closest || !closest.available || !closest.url) {
        return notAvailable(
          host,
          requestedDate,
          `No archived snapshot was found for ${host} around that date. Try an earlier or later date.`
        );
      }

      return {
        domain: host,
        requestedDate,
        available: true,
        // Force https so embedded previews don't trip mixed-content blocks.
        archivedUrl: closest.url.replace(/^http:\/\//, 'https://'),
        timestamp: closest.timestamp,
        capturedAt: waybackTimestampToISO(closest.timestamp),
        status: closest.status ?? null,
      };
    } catch (err) {
      const aborted = err instanceof Error && err.name === 'TimeoutError';
      return notAvailable(
        host,
        requestedDate,
        aborted
          ? 'The request to the Internet Archive timed out. Please try again.'
          : 'We could not reach the Internet Archive. Please try again shortly.'
      );
    }
  });
}

/** Convenience: the most recent ("today") snapshot for a domain. */
export function getLatestSnapshot(domain: string): Promise<Snapshot> {
  return getSnapshot(domain, todayISO());
}

/**
 * Resolve snapshots for many dates at once (used by timelines).
 * Runs in parallel but is naturally throttled by the cache on repeat loads.
 */
export async function getSnapshots(
  domain: string,
  dates: string[]
): Promise<Snapshot[]> {
  return Promise.all(dates.map((date) => getSnapshot(domain, date)));
}

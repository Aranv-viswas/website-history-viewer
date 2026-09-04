/**
 * Shared helpers for the JSON API routes under /api.
 *
 * Centralizes response shape and cache headers so every endpoint behaves the
 * same way: successes are cached hard at the edge (archived data is immutable
 * once captured), failures are cached only briefly so a transient upstream
 * problem clears quickly instead of being pinned for a day.
 */

/** Cache-Control for a successful, effectively-immutable result. */
export const CACHE_SUCCESS =
  'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800';

/**
 * Cache-Control for a result we expect to change soon — an upstream outage, a
 * rate limit, or a domain that may gain captures later. Still cached, because
 * even 60 seconds of edge caching absorbs a burst of retries.
 */
export const CACHE_TRANSIENT =
  'public, max-age=60, s-maxage=300, stale-while-revalidate=600';

/**
 * Cache-Control for a negative result that's a property of the domain rather
 * than a fault (excluded from the archive, never archived).
 */
export const CACHE_NEGATIVE =
  'public, max-age=600, s-maxage=3600, stale-while-revalidate=86400';

export interface JsonOptions {
  status?: number;
  /** Full Cache-Control value; omit to send `no-store`. */
  cache?: string;
}

/** Build a JSON response with consistent headers. */
export function json(data: unknown, opts: JsonOptions = {}): Response {
  const { status = 200, cache } = opts;
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': cache ?? 'no-store',
      // These endpoints only ever expose already-public Internet Archive data,
      // so allowing cross-origin reads costs nothing and makes the API usable
      // from other tools and from our own pages on any locale prefix.
      'Access-Control-Allow-Origin': '*',
    },
  });
}

/** A structured error payload, so clients can branch on `error` not on prose. */
export function apiError(
  error: string,
  message: string,
  opts: JsonOptions = {}
): Response {
  return json(
    { error, message },
    { status: opts.status ?? 400, cache: opts.cache ?? CACHE_TRANSIENT }
  );
}

/**
 * Map an archive status onto the right cache policy, so a blocked domain isn't
 * re-fetched every minute while a genuine outage still recovers quickly.
 */
export function cacheForStatus(status: string): string {
  if (status === 'ok') return CACHE_SUCCESS;
  if (status === 'blocked' || status === 'not-archived') return CACHE_NEGATIVE;
  return CACHE_TRANSIENT;
}

/**
 * Clamp a numeric query parameter into a supported range.
 * Falls back to `fallback` when the value is missing or unparseable.
 *
 * The null check is load-bearing and easy to lose: `Number(null)` is 0, not
 * NaN, and `Number('')` is 0 too. Testing only `Number.isFinite` therefore
 * treats *every omitted parameter* as a valid zero and clamps it to `min`,
 * silently ignoring the fallback — which shipped a redesign threshold of 10
 * instead of 55 and let every minor change through as a "likely redesign".
 */
export function clampParam(
  raw: string | null,
  fallback: number,
  min: number,
  max: number
): number {
  if (raw === null || raw.trim() === '') return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

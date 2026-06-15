/**
 * Tiny in-memory TTL cache.
 *
 * On Vercel each serverless instance keeps its own copy, which is exactly what
 * we want for cheap, fast memoization of Wayback lookups without standing up
 * external infrastructure. Snapshot data is effectively immutable for a given
 * (domain, date) pair, so a long TTL is safe. Swap the backing store here later
 * (KV, Redis, etc.) without touching call sites.
 */

interface Entry<T> {
  value: T;
  expiresAt: number;
}

const store = new Map<string, Entry<unknown>>();

/** Default time-to-live: 6 hours. */
export const DEFAULT_TTL_MS = 6 * 60 * 60 * 1000;

/** Read a cached value, or undefined if missing/expired. */
export function cacheGet<T>(key: string): T | undefined {
  const entry = store.get(key) as Entry<T> | undefined;
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return undefined;
  }
  return entry.value;
}

/** Write a value with an optional TTL. */
export function cacheSet<T>(key: string, value: T, ttlMs = DEFAULT_TTL_MS): void {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

/**
 * Memoize an async producer behind the cache. On a hit returns the cached
 * value; on a miss runs `produce`, stores the result, and returns it. Failures
 * are not cached, so transient API errors can be retried on the next request.
 */
export async function cached<T>(
  key: string,
  produce: () => Promise<T>,
  ttlMs = DEFAULT_TTL_MS
): Promise<T> {
  const hit = cacheGet<T>(key);
  if (hit !== undefined) return hit;

  const value = await produce();
  cacheSet(key, value, ttlMs);
  return value;
}

/** Invalidate a single key (cache invalidation support). */
export function cacheInvalidate(key: string): void {
  store.delete(key);
}

/** Invalidate every key matching a prefix, e.g. "snapshot:google.com:". */
export function cacheInvalidatePrefix(prefix: string): number {
  let removed = 0;
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) {
      store.delete(key);
      removed += 1;
    }
  }
  return removed;
}

/** Clear the entire cache (useful for tests / manual invalidation). */
export function cacheClear(): void {
  store.clear();
}

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  cached,
  cacheGet,
  cacheSet,
  cacheClear,
  cacheInvalidate,
  cacheInvalidatePrefix,
} from './cache';

beforeEach(() => {
  cacheClear();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('cacheGet / cacheSet', () => {
  it('stores and reads a value', () => {
    cacheSet('k', 42);
    expect(cacheGet<number>('k')).toBe(42);
  });

  it('expires after its TTL', () => {
    cacheSet('k', 'v', 1000);
    vi.advanceTimersByTime(1001);
    expect(cacheGet('k')).toBeUndefined();
  });
});

describe('cached', () => {
  it('memoizes the producer on a hit', async () => {
    const produce = vi.fn().mockResolvedValue('value');
    await cached('k', produce);
    await cached('k', produce);
    expect(produce).toHaveBeenCalledTimes(1);
  });

  it('supports a value-dependent TTL (negative caching)', async () => {
    // Success caches long; failure caches briefly.
    const ttl = (v: { ok: boolean }) => (v.ok ? 10_000 : 1000);

    await cached('fail', async () => ({ ok: false }), ttl);
    await cached('ok', async () => ({ ok: true }), ttl);

    vi.advanceTimersByTime(1500);
    expect(cacheGet('fail')).toBeUndefined(); // expired
    expect(cacheGet('ok')).toEqual({ ok: true }); // still valid
  });
});

describe('invalidation', () => {
  it('removes a single key', () => {
    cacheSet('k', 1);
    cacheInvalidate('k');
    expect(cacheGet('k')).toBeUndefined();
  });

  it('removes every key matching a prefix', () => {
    cacheSet('snapshot:google.com:1', 1);
    cacheSet('snapshot:google.com:2', 2);
    cacheSet('snapshot:other.com:1', 3);
    const removed = cacheInvalidatePrefix('snapshot:google.com:');
    expect(removed).toBe(2);
    expect(cacheGet('snapshot:other.com:1')).toBe(3);
  });
});

import { describe, it, expect } from 'vitest';
import {
  clampParam,
  cacheForStatus,
  CACHE_SUCCESS,
  CACHE_NEGATIVE,
  CACHE_TRANSIENT,
} from './api';

describe('clampParam', () => {
  it('uses the fallback when the parameter is absent', () => {
    // Regression: `Number(null)` is 0, not NaN. Checking only Number.isFinite
    // made every omitted parameter clamp to `min` instead of the fallback —
    // which shipped a redesign threshold of 10 in place of 55.
    expect(clampParam(null, 55, 10, 95)).toBe(55);
    expect(clampParam(null, 24, 2, 60)).toBe(24);
  });

  it('uses the fallback for an empty or whitespace value', () => {
    expect(clampParam('', 55, 10, 95)).toBe(55);
    expect(clampParam('   ', 8, 2, 12)).toBe(8);
  });

  it('uses the fallback for a non-numeric value', () => {
    expect(clampParam('lots', 24, 2, 60)).toBe(24);
    expect(clampParam('NaN', 24, 2, 60)).toBe(24);
  });

  it('accepts an explicit zero rather than treating it as missing', () => {
    // An explicitly-passed 0 is a real request and should clamp to the range,
    // not fall back — which is precisely why the null check has to be separate.
    expect(clampParam('0', 55, 10, 95)).toBe(10);
  });

  it('clamps into range', () => {
    expect(clampParam('1000', 24, 2, 60)).toBe(60);
    expect(clampParam('-5', 24, 2, 60)).toBe(2);
    expect(clampParam('30', 24, 2, 60)).toBe(30);
  });

  it('rounds fractional values', () => {
    expect(clampParam('8.6', 8, 2, 12)).toBe(9);
  });
});

describe('cacheForStatus', () => {
  it('caches a found history hard', () => {
    expect(cacheForStatus('ok')).toBe(CACHE_SUCCESS);
  });

  it('caches domain-level negatives for a while, not a day', () => {
    expect(cacheForStatus('blocked')).toBe(CACHE_NEGATIVE);
    expect(cacheForStatus('not-archived')).toBe(CACHE_NEGATIVE);
  });

  it('keeps transient failures short so an outage clears quickly', () => {
    expect(cacheForStatus('unavailable')).toBe(CACHE_TRANSIENT);
    expect(cacheForStatus('anything-else')).toBe(CACHE_TRANSIENT);
  });
});

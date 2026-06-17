import { describe, it, expect } from 'vitest';
import {
  normalizeDomain,
  isValidDomain,
  domainToSlug,
  slugToDomain,
  domainDisplayName,
} from './domain';

describe('normalizeDomain', () => {
  it('strips scheme, www, path, query, and hash', () => {
    expect(normalizeDomain('https://www.Google.com/search?q=x#top')).toBe(
      'google.com'
    );
  });

  it('lowercases and trims', () => {
    expect(normalizeDomain('  YouTube.COM  ')).toBe('youtube.com');
  });

  it('drops a trailing FQDN dot', () => {
    expect(normalizeDomain('example.com.')).toBe('example.com');
  });

  it('assumes .com for a single bare word', () => {
    expect(normalizeDomain('facebook')).toBe('facebook.com');
  });

  it('preserves subdomains and multi-part TLDs', () => {
    expect(normalizeDomain('http://news.bbc.co.uk/')).toBe('news.bbc.co.uk');
  });

  it('returns empty string for empty input', () => {
    expect(normalizeDomain('')).toBe('');
    expect(normalizeDomain('   ')).toBe('');
  });
});

describe('isValidDomain', () => {
  it.each([
    'google.com',
    'news.ycombinator.com',
    'bbc.co.uk',
    'a.io',
    'facebook', // normalized to facebook.com
  ])('accepts %s', (input) => {
    expect(isValidDomain(input)).toBe(true);
  });

  it.each([
    '',
    'has space.com',
    '-leading.com',
    'trailing-.com',
    'under_score.com',
  ])('rejects %s', (input) => {
    expect(isValidDomain(input)).toBe(false);
  });

  it('treats a bare word as .com (so it is valid)', () => {
    // A single label with no dot is normalized to "<word>.com".
    expect(isValidDomain('no-tld')).toBe(true);
  });

  it('rejects hosts longer than 253 chars', () => {
    const long = `${'a'.repeat(250)}.com`;
    expect(isValidDomain(long)).toBe(false);
  });
});

describe('slug round-tripping', () => {
  it('round-trips a normal domain', () => {
    const slug = domainToSlug('google.com');
    expect(slugToDomain(slug)).toBe('google.com');
  });

  it('round-trips a multi-part domain', () => {
    const slug = domainToSlug('news.bbc.co.uk');
    expect(slugToDomain(slug)).toBe('news.bbc.co.uk');
  });
});

describe('domainDisplayName', () => {
  it('uses curated names with correct casing', () => {
    expect(domainDisplayName('youtube.com')).toBe('YouTube');
    expect(domainDisplayName('https://www.google.com')).toBe('Google');
  });

  it('handles multi-part country-code TLDs', () => {
    expect(domainDisplayName('bbc.co.uk')).toBe('Bbc');
    expect(domainDisplayName('news.com.au')).toBe('News');
  });

  it('uses the registrable label, not a subdomain', () => {
    expect(domainDisplayName('news.ycombinator.com')).toBe('Ycombinator');
  });

  it('capitalizes an unknown single-label brand', () => {
    expect(domainDisplayName('example.org')).toBe('Example');
  });
});

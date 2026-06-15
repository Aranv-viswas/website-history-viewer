/**
 * Domain parsing, validation, and display helpers.
 *
 * Users type all sorts of things ("https://www.Google.com/", "youtube.com",
 * "facebook"). We normalize to a bare lowercase host before talking to the
 * Wayback API, and provide friendly display names for the UI.
 */

/**
 * Normalize arbitrary user input into a bare host like "google.com".
 * Returns an empty string if nothing usable is found.
 */
export function normalizeDomain(input: string): string {
  if (!input) return '';
  let value = input.trim().toLowerCase();

  // Strip a scheme if present so the URL parser (and humans) agree.
  value = value.replace(/^https?:\/\//, '');
  // Drop everything after the first slash, query, or hash.
  value = value.split(/[/?#]/)[0];
  // Remove a leading "www.".
  value = value.replace(/^www\./, '');
  // Remove a trailing dot (fully-qualified domains) and surrounding whitespace.
  value = value.replace(/\.$/, '').trim();

  // If the user typed a single bare word (e.g. "facebook"), assume .com.
  if (value && !value.includes('.')) {
    value = `${value}.com`;
  }

  return value;
}

/** Loose but practical domain validation (allows subdomains and TLDs). */
export function isValidDomain(input: string): boolean {
  const domain = normalizeDomain(input);
  if (!domain || domain.length > 253) return false;
  // label.label(.label)+ — each label 1-63 chars, alphanumerics/hyphens.
  const re =
    /^(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))+$/;
  return re.test(domain);
}

/**
 * URL-safe slug for a domain, used in routes like /site/[domain]/[date].
 * We keep dots (they're valid in path segments) so "google.com" round-trips.
 */
export function domainToSlug(domain: string): string {
  return encodeURIComponent(normalizeDomain(domain));
}

/** Reverse of domainToSlug. */
export function slugToDomain(slug: string): string {
  return normalizeDomain(decodeURIComponent(slug));
}

/**
 * Human-friendly display name: "youtube.com" -> "YouTube", "bbc.co.uk" -> "Bbc".
 * Falls back to capitalizing the first label.
 */
export function domainDisplayName(domain: string): string {
  const known: Record<string, string> = {
    'google.com': 'Google',
    'youtube.com': 'YouTube',
    'facebook.com': 'Facebook',
    'amazon.com': 'Amazon',
    'reddit.com': 'Reddit',
    'apple.com': 'Apple',
    'wikipedia.org': 'Wikipedia',
    'twitter.com': 'Twitter',
    'microsoft.com': 'Microsoft',
    'netflix.com': 'Netflix',
  };
  const normalized = normalizeDomain(domain);
  if (known[normalized]) return known[normalized];

  const firstLabel = normalized.split('.')[0] ?? normalized;
  return firstLabel.charAt(0).toUpperCase() + firstLabel.slice(1);
}

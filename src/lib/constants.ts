/**
 * Site-wide configuration and curated data.
 */

import type { PopularSite } from './types';

/** Global site metadata used across SEO, header, footer, structured data. */
export const SITE = {
  name: 'Website History Viewer',
  shortName: 'History Viewer',
  /** Canonical URL — kept in sync with astro.config.mjs `site`. */
  url: import.meta.env.PUBLIC_SITE_URL ?? 'https://websitehistoryviewer.com',
  description:
    'Free website history viewer to check website history and see what any site looked like in the past. Track, look up and view website history with archived Wayback Machine screenshots.',
  /** Default keyword set surfaced in <meta name="keywords">. */
  keywords: [
    'website history',
    'website history viewer',
    'website history check',
    'website history tracker',
    'website history lookup',
    'website history checker',
    'how to see website history on iphone',
    'website history archive',
    'website history google',
    'check website history',
    'see website history',
    'how to see website history',
    'apple website history',
    'website history search',
    'view website history',
  ],
  defaultOgImage: '/og/default.png',
  twitter: '@webhistoryview',
  locale: 'en_US',
  themeColor: '#ffffff',
  /** Contact address surfaced on the Contact and legal pages. */
  email: 'arnab47biswas@gmail.com',
} as const;

/**
 * Static "company" pages linked from the header and footer. Kept here so the
 * navigation and the routes stay in sync, and so the date used on the legal
 * pages has a single source of truth.
 */
export const LEGAL_PAGES: Array<{ href: string; label: string }> = [
  { href: '/about', label: 'About Us' },
  { href: '/contact', label: 'Contact Us' },
  { href: '/privacy-policy', label: 'Privacy Policy' },
  { href: '/terms', label: 'Terms & Conditions' },
];

/** Last-updated date shown on the Privacy Policy and Terms pages. */
export const LEGAL_LAST_UPDATED = 'June 16, 2026';

/**
 * Popular sites used for homepage example links and as the seed for featured
 * evolution pages. The `year` is a "good old days" snapshot worth linking to.
 */
export const POPULAR_SITES: PopularSite[] = [
  {
    domain: 'google.com',
    name: 'Google',
    year: 2005,
    emoji: '🔍',
    blurb: 'The minimalist search box that took over the web.',
  },
  {
    domain: 'youtube.com',
    name: 'YouTube',
    year: 2008,
    emoji: '▶️',
    blurb: 'Before HD, before recommendations took over.',
  },
  {
    domain: 'facebook.com',
    name: 'Facebook',
    year: 2010,
    emoji: '👍',
    blurb: 'The blue social network in its growth years.',
  },
  {
    domain: 'amazon.com',
    name: 'Amazon',
    year: 1999,
    emoji: '📦',
    blurb: 'Still mostly a bookstore back then.',
  },
  {
    domain: 'reddit.com',
    name: 'Reddit',
    year: 2007,
    emoji: '👽',
    blurb: 'The front page of the early internet.',
  },
  {
    domain: 'apple.com',
    name: 'Apple',
    year: 2000,
    emoji: '🍎',
    blurb: 'The candy-colored iMac era.',
  },
  {
    domain: 'wikipedia.org',
    name: 'Wikipedia',
    year: 2003,
    emoji: '📚',
    blurb: 'The encyclopedia anyone could edit, in its infancy.',
  },
  {
    domain: 'twitter.com',
    name: 'Twitter',
    year: 2009,
    emoji: '🐦',
    blurb: 'When 140 characters changed everything.',
  },
];

/**
 * Curated "Popular Comparisons" for the homepage — each renders as a quick link
 * to the /compare route. `b` defaults to "today" (resolved at request time).
 */
export const POPULAR_COMPARISONS: Array<{
  domain: string;
  name: string;
  yearA: number;
}> = [
  { domain: 'google.com', name: 'Google', yearA: 2000 },
  { domain: 'youtube.com', name: 'YouTube', yearA: 2006 },
  { domain: 'facebook.com', name: 'Facebook', yearA: 2004 },
  { domain: 'amazon.com', name: 'Amazon', yearA: 1999 },
];

/**
 * Fun, shareable internet history facts for the homepage. Static content —
 * cheap to render, great for dwell time and SEO.
 */
export const INTERNET_HISTORY_FACTS: Array<{ year: number; fact: string }> = [
  {
    year: 1991,
    fact: 'The first ever website went live at info.cern.ch, explaining what the World Wide Web was.',
  },
  {
    year: 1996,
    fact: 'The Internet Archive was founded, beginning its mission to archive the entire web.',
  },
  {
    year: 1998,
    fact: 'Google launched from a garage in Menlo Park with a famously bare homepage.',
  },
  {
    year: 2001,
    fact: 'The Wayback Machine opened to the public with 10 billion archived pages.',
  },
  {
    year: 2005,
    fact: 'YouTube was founded; its first video, "Me at the zoo", is 19 seconds long.',
  },
  {
    year: 2007,
    fact: 'The iPhone launched, kicking off the mobile-first redesign of nearly every website.',
  },
];

/** Default capture time appended to date-only queries (midnight UTC). */
export const DEFAULT_TIME = '000000';

/** Earliest year the Wayback Machine has meaningful coverage. */
export const ARCHIVE_START_YEAR = 1996;

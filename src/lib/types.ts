/**
 * Shared TypeScript types for Website History Viewer.
 *
 * These describe the shapes flowing between the Wayback service, the screenshot
 * provider, and the UI components. Keeping them in one place makes the data
 * contract explicit and refactors safe.
 */

/** Raw shape returned by the Wayback "available" API. */
export interface WaybackAvailabilityResponse {
  url: string;
  archived_snapshots: {
    closest?: {
      available: boolean;
      url: string;
      timestamp: string; // e.g. "20100101000000"
      status: string; // HTTP status the archive recorded, e.g. "200"
    };
  };
}

/** Normalized snapshot returned by `getSnapshot()`. */
export interface Snapshot {
  /** The requested domain, normalized (e.g. "google.com"). */
  domain: string;
  /** The date we asked for, as YYYY-MM-DD. */
  requestedDate: string;
  /** Whether the Wayback Machine had a usable snapshot. */
  available: boolean;
  /** Full archived URL, e.g. https://web.archive.org/web/20100101000000/http://google.com/ */
  archivedUrl: string | null;
  /** The actual capture timestamp the archive returned (YYYYMMDDhhmmss). */
  timestamp: string | null;
  /** The actual capture date as a JS-friendly ISO string, if available. */
  capturedAt: string | null;
  /** HTTP status recorded at capture time, e.g. "200". */
  status: string | null;
  /** Human-readable message for UI fallback states. */
  message?: string;
}

/** A snapshot URL rendered as a viewable image (or a fallback strategy). */
export interface Screenshot {
  /** How we obtained/derived this preview. */
  provider: ScreenshotProviderName;
  /** Image URL to display, or null if no image is available. */
  imageUrl: string | null;
  /** When true, the UI should embed the archived page in an <iframe> instead. */
  useIframe: boolean;
  /** The URL to load in the iframe fallback. */
  iframeUrl: string | null;
  /** Width/height hints for layout stability (avoids CLS). */
  width: number;
  height: number;
  /** Alt text describing the screenshot for accessibility/SEO. */
  alt: string;
}

export type ScreenshotProviderName =
  | 'placeholder'
  | 'api'
  | 'wayback-thumbnail'
  | 'playwright'
  | 'puppeteer'
  | 'cache';

/** One entry on a historical timeline. */
export interface TimelineEntry {
  /** Year label, e.g. "2008". */
  year: number;
  /** Date string we queried for this entry (YYYY-MM-DD). */
  date: string;
  /** The resolved snapshot for that point in time. */
  snapshot: Snapshot;
}

/** A featured/popular website used for homepage examples and quick links. */
export interface PopularSite {
  /** Bare domain, e.g. "youtube.com". */
  domain: string;
  /** Display name, e.g. "YouTube". */
  name: string;
  /** A representative "good old days" year for example links. */
  year: number;
  /** Optional emoji/icon used in compact cards. */
  emoji?: string;
  /** Short tagline shown under the name. */
  blurb?: string;
}

/** Inputs for a two-version comparison. */
export interface ComparisonInput {
  domain: string;
  dateA: string;
  dateB: string;
}

/** Resolved data for a comparison view. */
export interface ComparisonResult {
  domain: string;
  a: { snapshot: Snapshot; screenshot: Screenshot };
  b: { snapshot: Snapshot; screenshot: Screenshot };
}

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

/* ───────────────────────── Archive overview & history ─────────────────────── */

/** One month that holds at least one capture. */
export interface MonthlyCaptures {
  year: number;
  /** 1-12. */
  month: number;
  /** How many captures the Archive recorded that month. */
  captures: number;
  /**
   * HTTP status *class* the Archive recorded ("2", "3", "4", "5"), or null.
   * "2" means the captures served normally; "4"/"5" mean the archive holds
   * error pages for that month.
   */
  statusClass: string | null;
}

/** Why an archive overview could not be produced (or 'ok' when it could). */
export type ArchiveStatus =
  | 'ok'
  | 'not-archived'
  | 'blocked'
  | 'unavailable'
  | 'invalid';

/** Normalized result of the Wayback sparkline endpoint. */
export interface ArchiveOverview {
  domain: string;
  status: ArchiveStatus;
  /** User-facing explanation when `status` isn't 'ok'. */
  message: string | null;
  /** Chronologically sorted months that hold captures (empty when not ok). */
  months: MonthlyCaptures[];
  /** Wayback timestamp of the earliest known capture. */
  firstTimestamp: string | null;
  /** Wayback timestamp of the most recent known capture. */
  lastTimestamp: string | null;
  /** Sum of every monthly bucket. */
  totalCaptures: number;
}

/**
 * Derived statistics for a domain's archived history.
 *
 * Every field describes *what the Internet Archive holds*, not the website
 * itself — a site can predate its first capture, and the archive's coverage is
 * uneven. The UI wording must reflect that ("first archived snapshot found").
 */
export interface HistoryStats {
  domain: string;
  /** ISO date of the earliest known capture, e.g. "1998-11-11". */
  firstArchivedDate: string | null;
  /** ISO date of the most recent known capture. */
  lastArchivedDate: string | null;
  firstYear: number | null;
  lastYear: number | null;
  /** Whole years spanned by the archive, first to last (inclusive). */
  yearsSpanned: number;
  /** Distinct calendar years that hold at least one capture. */
  yearsWithCaptures: number;
  /** Total captures the Archive reports across every month. */
  totalCaptures: number;
  /** Months holding captures, out of every month in the span. 0-1. */
  coverage: number;
  /** Months holding captures. */
  monthsWithCaptures: number;
  /** Total months between the first and last capture, inclusive. */
  monthsInSpan: number;
  /** Busiest month on record, useful as a "peak archiving" highlight. */
  busiestMonth: { year: number; month: number; captures: number } | null;
}

/** One point on a timeline / one frame of an evolution playback. */
export interface EvolutionFrame {
  /** Wayback timestamp of the month bucket we're representing. */
  year: number;
  month: number;
  /** ISO date used to resolve the snapshot ("2005-06-15"). */
  date: string;
  /** Captures the Archive holds in this month (density signal). */
  captures: number;
  /** Short label, e.g. "Jun 2005". */
  label: string;
  /** Resolved snapshot — populated lazily; null until looked up. */
  snapshot?: Snapshot | null;
}

/** A curated collection of domains grouped by theme. */
export interface Collection {
  slug: string;
  title: string;
  /** One-line summary used on cards and in meta descriptions. */
  description: string;
  emoji: string;
  /** Longer intro rendered on the collection page. */
  intro: string;
  sites: Array<{
    domain: string;
    name: string;
    /** A representative year worth linking to. */
    year: number;
    /** Why this site belongs in the collection. */
    note: string;
  }>;
}

/* ────────────────────────── Page (markup) analysis ───────────────────────── */

/** One estimated colour from a page's declared palette. */
export interface ColorSample {
  /** Lowercase #rrggbb. */
  hex: string;
  /** How strongly the colour was declared. Relative, not a pixel count. */
  weight: number;
}

/**
 * A structural fingerprint of one archived page, derived from its HTML source.
 *
 * Every field describes the *markup*, never the rendered result — see
 * @services/page-analysis for why that distinction is load-bearing.
 */
export interface PageFingerprint {
  domain: string;
  /** Wayback timestamp of the capture that was analysed. */
  timestamp: string;
  /** ISO date of that capture. */
  date: string;
  /** False when the page could not be fetched or parsed. */
  ok: boolean;
  /** Why, when `ok` is false. */
  message: string | null;
  /** Bytes of HTML analysed (capped). */
  bytes: number;

  title: string | null;
  description: string | null;
  generator: string | null;

  headings: number;
  images: number;
  links: number;
  scripts: number;
  stylesheets: number;
  inlineStyleBlocks: number;
  tables: number;
  divs: number;
  forms: number;
  /** Count of header/nav/main/footer/section/article/aside elements. */
  semanticTags: number;

  usesFrames: boolean;
  usesFlash: boolean;
  hasViewportMeta: boolean;
  /** Declares a viewport meta or width-based media queries. */
  isResponsive: boolean;
  /** Many tables and no semantic elements — the pre-CSS layout signature. */
  usesTableLayout: boolean;

  /** Text of the first navigation links found. */
  navLinks: string[];
  /** Estimated declared palette, most-declared first. */
  colors: ColorSample[];
  /** Logo *candidates*, best guess first — not a confirmed logo. */
  logos: Array<{ url: string; alt: string | null; score: number }>;
}

/** One observed difference between two page fingerprints. */
export interface PageChange {
  kind:
    | 'layout'
    | 'structure'
    | 'navigation'
    | 'logo'
    | 'color'
    | 'media'
    | 'mobile'
    | 'size'
    | 'content';
  /** Contribution to the overall change score. */
  weight: number;
  summary: string;
  detail: string;
}

/** One frame of a design-evolution sequence. */
export interface DesignFrame {
  year: number;
  date: string;
  label: string;
  ok: boolean;
  message: string | null;
  title: string | null;
  colors: ColorSample[];
  logo: { url: string; alt: string | null } | null;
  usesTableLayout: boolean;
  usesFlash: boolean;
  isResponsive: boolean;
  /** Markup-distance score against the previous frame, 0-100. */
  changeScore: number | null;
  /** Observations behind `changeScore`. */
  changes: PageChange[];
}

/** A mobile-vs-desktop capture pairing for one domain. */
export interface DeviceComparison {
  domain: string;
  /** The mobile host that has captures, e.g. "m.facebook.com", or null. */
  mobileHost: string | null;
  hasMobileCaptures: boolean;
  mobileFirstYear: number | null;
  mobileLastYear: number | null;
  mobileCaptures: number;
  desktopFirstYear: number | null;
  desktopLastYear: number | null;
  desktopCaptures: number;
  /** Years both a desktop and a mobile capture exist. */
  overlappingYears: number[];
  message: string | null;
}

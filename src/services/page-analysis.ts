/**
 * Page analysis — what actually changed between two archived snapshots.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT THIS IS, PRECISELY
 *
 * This module analyses the archived **HTML source**, not rendered pixels.
 *
 * That distinction is the whole design. Comparing screenshots would need a
 * rendering service; none is configured (see @services/screenshot — the default
 * provider embeds an <iframe>, which produces no pixels we can read, and a
 * cross-origin frame can never be read into a canvas). Rather than ship a
 * "visual diff" that silently isn't one, we analyse what we can genuinely
 * obtain: the original markup, which the Wayback Machine serves verbatim via
 * the `id_` modifier.
 *
 * Markup turns out to answer most of the interesting questions honestly:
 * layout technique (tables vs. semantic elements), navigation, logo images,
 * declared colours, whether the page was built for mobile, and how much of the
 * document's structure was replaced between two dates. What it cannot tell you
 * is how something *looked* — a site can change its entire visual identity in a
 * stylesheet without touching the HTML. Every label this module feeds the UI is
 * written to claim only the former.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * PARSING APPROACH
 *
 * The Workers runtime has no DOM and we add no dependencies, so extraction is
 * done with targeted regular expressions over the source. That is not a general
 * HTML parser and would be the wrong tool for one — but for counting tags and
 * pulling attribute values out of archived pages it's accurate enough, and it
 * cannot be made to throw on malformed 1998 markup the way a strict parser can.
 * Every extractor is written to degrade to zero/empty rather than fail.
 */

import type { PageFingerprint, PageChange, ColorSample } from '@lib/types';
import { dedupe } from './cache';
import { getSnapshot } from './wayback';
import { normalizeDomain } from '@utils/domain';

const USER_AGENT =
  'WebsiteHistoryViewer/1.0 (+https://websitehistoryviewer.com)';

/**
 * Archived pages can be slow to reconstruct. Measured against real captures,
 * 15s was tight enough to time out on legitimately slow ones, so this is
 * deliberately generous — the call is never on a page's render path.
 */
const REQUEST_TIMEOUT_MS = 22000;

/**
 * One retry, for transient failures only.
 *
 * A 5xx or a dropped connection from the Archive under load usually succeeds
 * on a second attempt moments later. A *timeout* is not retried: it has already
 * cost the full budget, and retrying would double the worst case for every
 * frame in a design-evolution run.
 */
const RETRY_DELAY_MS = 600;

/**
 * Only the first slice of a document is analysed. Everything this module looks
 * for — head metadata, layout technique, navigation, logo, declared colours —
 * lives near the top, and some archived pages are many megabytes of inlined
 * data that would be pointless to scan and expensive to hold in a Worker.
 */
const MAX_BYTES = 600_000;

/** Analyses are immutable once a capture exists: hold them for a day. */
const SUCCESS_TTL_MS = 24 * 60 * 60 * 1000;
const FAILURE_TTL_MS = 5 * 60 * 1000;

/** Count non-overlapping matches without materialising them. */
function count(html: string, re: RegExp): number {
  const matches = html.match(re);
  return matches ? matches.length : 0;
}

/** First capture group of the first match, trimmed, or null. */
function first(html: string, re: RegExp): string | null {
  const m = html.match(re);
  const value = m?.[1]?.trim();
  return value ? value : null;
}

/**
 * Turn an `id_` archived URL into the base a relative asset path resolves
 * against, so extracted logo/image sources can be rewritten to archived URLs
 * that actually load.
 */
function archivedAssetUrl(
  src: string,
  timestamp: string,
  originalUrl: string
): string | null {
  const value = src.trim();
  if (!value || value.startsWith('data:') || value.startsWith('#')) return null;

  try {
    // `im_` asks the Wayback Machine for the archived *image* at that time.
    const absolute = new URL(value, originalUrl).href;
    return `https://web.archive.org/web/${timestamp}im_/${absolute}`;
  } catch {
    return null;
  }
}

/* ────────────────────────────── Colour extraction ────────────────────────── */

/** Expand #abc to #aabbcc so shorthand and longhand colours can be compared. */
function expandHex(hex: string): string {
  const value = hex.toLowerCase();
  if (value.length === 4) {
    return `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`;
  }
  return value.slice(0, 7);
}

/** Relative luminance, used to keep near-white/near-black noise out of a palette. */
function luminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** How far apart two colours are in plain RGB space. Good enough for grouping. */
function colorDistance(a: string, b: string): number {
  const dr = parseInt(a.slice(1, 3), 16) - parseInt(b.slice(1, 3), 16);
  const dg = parseInt(a.slice(3, 5), 16) - parseInt(b.slice(3, 5), 16);
  const db = parseInt(a.slice(5, 7), 16) - parseInt(b.slice(5, 7), 16);
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

/** Named colours common in early HTML, mapped so they join the tally. */
const NAMED_COLORS: Record<string, string> = {
  white: '#ffffff',
  black: '#000000',
  red: '#ff0000',
  green: '#008000',
  blue: '#0000ff',
  yellow: '#ffff00',
  navy: '#000080',
  teal: '#008080',
  silver: '#c0c0c0',
  gray: '#808080',
  grey: '#808080',
  maroon: '#800000',
  purple: '#800080',
  olive: '#808000',
  lime: '#00ff00',
  aqua: '#00ffff',
  fuchsia: '#ff00ff',
  orange: '#ffa500',
};

/**
 * Estimate a page's declared palette.
 *
 * These are the colours the document *asks for* — in hex literals, rgb()
 * values, and the old presentational attributes (bgcolor, text, link). It is an
 * approximation of the page's palette, not a measurement of the rendered
 * result: colours in external stylesheets aren't seen, and a colour declared
 * once can dominate the screen while one declared fifty times is never visible.
 *
 * Near-identical shades are merged so a palette isn't six versions of the same
 * blue, and pure white/black are dropped unless nothing else survives — they're
 * the default of almost every page and say nothing about its identity.
 */
export function extractColors(html: string, limit = 6): ColorSample[] {
  const tally = new Map<string, number>();

  const add = (hex: string, weight = 1) => {
    if (!/^#[0-9a-f]{6}$/.test(hex)) return;
    tally.set(hex, (tally.get(hex) ?? 0) + weight);
  };

  for (const m of html.matchAll(/#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/g)) {
    add(expandHex(`#${m[1]}`));
  }

  for (const m of html.matchAll(
    /rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/g
  )) {
    const hex =
      '#' +
      [m[1], m[2], m[3]]
        .map((v) => Math.min(255, Number(v)).toString(16).padStart(2, '0'))
        .join('');
    add(hex);
  }

  // Presentational attributes carried a page's whole palette before CSS, so
  // they're weighted heavily — on a 1998 page they *are* the design.
  for (const m of html.matchAll(
    /\b(?:bgcolor|text|link|vlink|alink|bordercolor)\s*=\s*["']?([#\w]+)["']?/gi
  )) {
    const raw = m[1].toLowerCase();
    const hex = raw.startsWith('#') ? expandHex(raw) : NAMED_COLORS[raw];
    if (hex) add(hex, 8);
  }

  if (tally.size === 0) return [];

  const sorted = [...tally.entries()]
    .map(([hex, weight]) => ({ hex, weight }))
    .sort((a, b) => b.weight - a.weight);

  // Drop the near-monochrome extremes, but only while something else remains.
  const interesting = sorted.filter((c) => {
    const l = luminance(c.hex);
    return l > 0.04 && l < 0.97;
  });
  const pool = interesting.length >= 2 ? interesting : sorted;

  // Merge visually similar shades into their most-declared representative.
  const palette: ColorSample[] = [];
  for (const candidate of pool) {
    const near = palette.find((p) => colorDistance(p.hex, candidate.hex) < 48);
    if (near) {
      near.weight += candidate.weight;
      continue;
    }
    palette.push({ hex: candidate.hex, weight: candidate.weight });
    if (palette.length >= limit) break;
  }

  return palette;
}

/* ────────────────────────────── Logo extraction ──────────────────────────── */

/**
 * Find the images most likely to be the site's logo.
 *
 * This is a heuristic over `src`, `alt`, `id` and `class`, scored by how
 * logo-ish each looks and how early it appears (a logo is nearly always the
 * first meaningful image in the document). It is frequently right on sites that
 * name their assets sensibly and frequently wrong on sites that don't, so the
 * UI must present these as candidates and fall back to the full snapshot rather
 * than assert "this was the logo".
 */
export function extractLogoCandidates(
  html: string,
  timestamp: string,
  originalUrl: string,
  limit = 3
): Array<{ url: string; alt: string | null; score: number }> {
  const candidates: Array<{ url: string; alt: string | null; score: number }> =
    [];

  const imgTags = [...html.matchAll(/<img\b[^>]*>/gi)].slice(0, 40);

  imgTags.forEach((match, index) => {
    const tag = match[0];
    const src = first(tag, /\bsrc\s*=\s*["']([^"']+)["']/i);
    if (!src) return;

    const url = archivedAssetUrl(src, timestamp, originalUrl);
    if (!url) return;

    const alt = first(tag, /\balt\s*=\s*["']([^"']*)["']/i);
    const idAttr = first(tag, /\bid\s*=\s*["']([^"']*)["']/i) ?? '';
    const classAttr = first(tag, /\bclass\s*=\s*["']([^"']*)["']/i) ?? '';
    const haystack = `${src} ${alt ?? ''} ${idAttr} ${classAttr}`.toLowerCase();

    let score = 0;
    if (/\blogo\b|logo[-_.]|[-_.]logo/.test(haystack)) score += 10;
    if (/\bbrand\b|wordmark|masthead/.test(haystack)) score += 6;
    if (/\bheader\b|\bbanner\b/.test(haystack)) score += 3;
    if (/\bhome\b/.test(haystack)) score += 1;
    // Spacers, tracking pixels and bullets are never the logo.
    if (
      /spacer|pixel|clear\.gif|blank\.gif|dot\.gif|1x1|bullet|arrow/.test(
        haystack
      )
    )
      score -= 12;
    if (/\bad\b|advert|banner-ad|doubleclick/.test(haystack)) score -= 8;

    // Position matters: the first images in a document are the chrome.
    score += Math.max(0, 5 - index);

    // A declared size that looks like a logo (wide-ish, not tiny, not a banner).
    const width = Number(first(tag, /\bwidth\s*=\s*["']?(\d+)/i) ?? 0);
    const height = Number(first(tag, /\bheight\s*=\s*["']?(\d+)/i) ?? 0);
    if (width && height) {
      if (width < 20 || height < 20)
        score -= 10; // spacer-sized
      else if (width <= 400 && height <= 150) score += 3;
    }

    if (score > 0) candidates.push({ url, alt, score });
  });

  return candidates.sort((a, b) => b.score - a.score).slice(0, limit);
}

/* ───────────────────────────── Fingerprinting ────────────────────────────── */

/** Build the structural fingerprint of one archived page. */
export function fingerprintHtml(
  html: string,
  meta: { domain: string; timestamp: string; date: string; originalUrl: string }
): PageFingerprint {
  const head = html.slice(0, 40_000);

  const tables = count(html, /<table\b/gi);
  const divs = count(html, /<div\b/gi);
  const semanticTags = count(
    html,
    /<(?:header|nav|main|footer|section|article|aside)\b/gi
  );

  /* Navigation labels: the text of the first links inside a nav-ish container,
     falling back to the document's first links. Enough to notice when a site's
     top-level navigation was rebuilt. */
  const navRegion =
    first(html, /<nav\b[^>]*>([\s\S]{0,4000}?)<\/nav>/i) ??
    first(
      html,
      /<(?:ul|div)\b[^>]*(?:id|class)\s*=\s*["'][^"']*nav[^"']*["'][^>]*>([\s\S]{0,4000}?)<\/(?:ul|div)>/i
    ) ??
    html.slice(0, 8000);

  const navLinks = [...navRegion.matchAll(/<a\b[^>]*>([\s\S]{0,80}?)<\/a>/gi)]
    .map((m) =>
      m[1]
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    )
    .filter((text) => text.length > 0 && text.length < 40)
    .slice(0, 12);

  return {
    domain: meta.domain,
    timestamp: meta.timestamp,
    date: meta.date,
    ok: true,
    message: null,
    bytes: html.length,

    title: first(html, /<title\b[^>]*>([\s\S]{0,300}?)<\/title>/i),
    description: first(
      head,
      /<meta\b[^>]*\bname\s*=\s*["']description["'][^>]*\bcontent\s*=\s*["']([^"']*)["']/i
    ),
    generator: first(
      head,
      /<meta\b[^>]*\bname\s*=\s*["']generator["'][^>]*\bcontent\s*=\s*["']([^"']*)["']/i
    ),

    headings: count(html, /<h[1-6]\b/gi),
    images: count(html, /<img\b/gi),
    links: count(html, /<a\b[^>]*\bhref\b/gi),
    scripts: count(html, /<script\b/gi),
    stylesheets: count(html, /<link\b[^>]*\brel\s*=\s*["']?stylesheet/gi),
    inlineStyleBlocks: count(html, /<style\b/gi),
    tables,
    divs,
    forms: count(html, /<form\b/gi),
    semanticTags,

    // Era markers. Each is a plain fact about the markup.
    usesFrames: /<frameset\b|<frame\b/i.test(html),
    usesFlash: /\.swf\b|application\/x-shockwave-flash|<embed\b/i.test(html),
    hasViewportMeta: /<meta\b[^>]*\bname\s*=\s*["']viewport["']/i.test(head),
    isResponsive:
      /<meta\b[^>]*\bname\s*=\s*["']viewport["']/i.test(head) ||
      /@media\b[^{]*\b(?:max|min)-width/i.test(html),
    /* Table-driven layout: lots of tables and few semantic elements is the
       signature of a pre-CSS page. Nested tables make it near-certain. */
    usesTableLayout: tables >= 3 && semanticTags === 0,

    navLinks,
    colors: extractColors(html),
    logos: extractLogoCandidates(html, meta.timestamp, meta.originalUrl),
  };
}

/** An unusable fingerprint, carrying the reason. */
function failedFingerprint(
  domain: string,
  date: string,
  message: string
): PageFingerprint {
  return {
    domain,
    timestamp: '',
    date,
    ok: false,
    message,
    bytes: 0,
    title: null,
    description: null,
    generator: null,
    headings: 0,
    images: 0,
    links: 0,
    scripts: 0,
    stylesheets: 0,
    inlineStyleBlocks: 0,
    tables: 0,
    divs: 0,
    forms: 0,
    semanticTags: 0,
    usesFrames: false,
    usesFlash: false,
    hasViewportMeta: false,
    isResponsive: false,
    usesTableLayout: false,
    navLinks: [],
    colors: [],
    logos: [],
  };
}

/**
 * Fetch and fingerprint the archived page closest to `date`.
 *
 * Always resolves; inspect `ok`. Results are memoized per (domain, date) and
 * concurrent identical requests share one fetch.
 */
export async function analyzeSnapshot(
  input: string,
  date: string
): Promise<PageFingerprint> {
  const domain = normalizeDomain(input);
  if (!domain) {
    return failedFingerprint(domain, date, 'Please enter a valid website.');
  }

  return dedupe<PageFingerprint>(
    `fingerprint:${domain}:${date}`,
    async () => {
      const snapshot = await getSnapshot(domain, date);
      if (!snapshot.available || !snapshot.archivedUrl || !snapshot.timestamp) {
        return failedFingerprint(
          domain,
          date,
          snapshot.message ??
            'The Wayback Machine has no capture near that date.'
        );
      }

      /* `id_` returns the *original* archived response — no Wayback banner, no
         rewritten URLs — which is what makes the markup analysable at all. */
      const rawUrl = snapshot.archivedUrl.replace(
        /\/web\/(\d{1,14})(\w{0,3}_)?\//,
        '/web/$1id_/'
      );

      /** One fetch attempt. Throws on a transient failure worth retrying. */
      async function attempt(): Promise<Response> {
        const res = await fetch(rawUrl, {
          headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,*/*' },
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
        // 5xx and 429 are the Archive under load, not a missing page.
        if (res.status >= 500 || res.status === 429) {
          throw new Error(`transient HTTP ${res.status}`);
        }
        return res;
      }

      try {
        let res: Response;
        try {
          res = await attempt();
        } catch (err) {
          // Never retry a timeout — see RETRY_DELAY_MS.
          if (err instanceof Error && err.name === 'TimeoutError') throw err;
          await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
          res = await attempt();
        }

        if (!res.ok) {
          return failedFingerprint(
            domain,
            date,
            `The archived page could not be read (HTTP ${res.status}).`
          );
        }

        const type = res.headers.get('content-type') ?? '';
        if (type && !/text\/html|application\/xhtml/i.test(type)) {
          return failedFingerprint(
            domain,
            date,
            'That capture is not an HTML page, so there is nothing to analyse.'
          );
        }

        const html = (await res.text()).slice(0, MAX_BYTES);
        if (html.trim().length === 0) {
          return failedFingerprint(domain, date, 'That capture is empty.');
        }

        // The original URL the archive recorded, for resolving relative assets.
        const originalUrl =
          snapshot.archivedUrl.replace(
            /^https:\/\/web\.archive\.org\/web\/\d{1,14}\w{0,3}_?\//,
            ''
          ) || `http://${domain}/`;

        return fingerprintHtml(html, {
          domain,
          timestamp: snapshot.timestamp,
          date: snapshot.capturedAt ?? date,
          originalUrl,
        });
      } catch (err) {
        const timedOut = err instanceof Error && err.name === 'TimeoutError';
        return failedFingerprint(
          domain,
          date,
          timedOut
            ? 'Reading that archived page timed out.'
            : 'We could not read that archived page.'
        );
      }
    },
    (fp) => (fp.ok ? SUCCESS_TTL_MS : FAILURE_TTL_MS)
  );
}

/* ─────────────────────────────── Comparison ──────────────────────────────── */

/** Relative change between two counts, 0-1. */
function relativeChange(a: number, b: number): number {
  const max = Math.max(a, b);
  if (max === 0) return 0;
  return Math.abs(a - b) / max;
}

/** Overlap between two label lists, 0-1 (1 = identical sets). */
function overlap(a: string[], b: string[]): number {
  if (a.length === 0 && b.length === 0) return 1;
  if (a.length === 0 || b.length === 0) return 0;
  const setA = new Set(a.map((s) => s.toLowerCase()));
  const setB = new Set(b.map((s) => s.toLowerCase()));
  let shared = 0;
  for (const value of setA) if (setB.has(value)) shared += 1;
  return shared / Math.max(setA.size, setB.size);
}

/** Did the dominant palette move meaningfully? Returns 0-1. */
function paletteShift(a: ColorSample[], b: ColorSample[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  // For each of A's top colours, how far is the nearest colour in B?
  const distances = a.slice(0, 3).map((ca) => {
    const nearest = Math.min(...b.map((cb) => colorDistance(ca.hex, cb.hex)));
    return Math.min(1, nearest / 200);
  });
  return distances.reduce((s, d) => s + d, 0) / distances.length;
}

/**
 * Compare two fingerprints and describe what changed in the markup.
 *
 * Returns a list of observations plus an overall 0-100 change score. The score
 * is a weighted blend of the individual signals, tuned so that a genuine
 * rebuild (layout technique changed, navigation replaced, structure counts
 * transformed) scores high while routine content churn — a news site with
 * different headlines and images every day — stays low.
 */
export function compareFingerprints(
  a: PageFingerprint,
  b: PageFingerprint
): { score: number; changes: PageChange[] } {
  if (!a.ok || !b.ok) return { score: 0, changes: [] };

  const changes: PageChange[] = [];

  /* Layout technique — the strongest single signal there is. A site moving off
     table layout, or off frames, or onto semantic HTML, has been rebuilt. */
  if (a.usesTableLayout !== b.usesTableLayout) {
    changes.push({
      kind: 'layout',
      weight: 1,
      summary: a.usesTableLayout
        ? 'Moved away from a table-based layout'
        : 'Moved to a table-based layout',
      detail:
        'The page changed the HTML technique it uses for layout — the clearest markup evidence of a rebuild rather than a content update.',
    });
  }

  if (a.usesFrames !== b.usesFrames) {
    changes.push({
      kind: 'layout',
      weight: 1,
      summary: a.usesFrames ? 'Stopped using frames' : 'Started using frames',
      detail: 'Framesets were a whole era of page architecture.',
    });
  }

  if (a.semanticTags === 0 && b.semanticTags > 0) {
    changes.push({
      kind: 'structure',
      weight: 0.8,
      summary: 'Adopted semantic HTML5 elements',
      detail: `The later page uses ${b.semanticTags} semantic elements (header, nav, main, footer…) where the earlier one used none.`,
    });
  }

  if (a.usesFlash !== b.usesFlash) {
    changes.push({
      kind: 'media',
      weight: 0.6,
      summary: a.usesFlash ? 'Dropped Flash content' : 'Added Flash content',
      detail: 'Flash embeds date a page precisely.',
    });
  }

  if (a.isResponsive !== b.isResponsive) {
    changes.push({
      kind: 'mobile',
      weight: 0.9,
      summary: b.isResponsive
        ? 'Became mobile-ready'
        : 'Lost its mobile-ready markup',
      detail: b.isResponsive
        ? 'The later page declares a viewport or media queries — the markup signature of a responsive redesign.'
        : 'The earlier page declared responsive markup that the later one does not.',
    });
  }

  /* Navigation. */
  const navOverlap = overlap(a.navLinks, b.navLinks);
  if (a.navLinks.length > 0 && b.navLinks.length > 0 && navOverlap < 0.4) {
    changes.push({
      kind: 'navigation',
      weight: 0.8 * (1 - navOverlap),
      summary: 'Navigation labels largely replaced',
      detail: `Only ${Math.round(navOverlap * 100)}% of the top navigation labels are shared between the two captures.`,
    });
  }

  /* Logo. */
  const logoA = a.logos[0]?.url.split('/').pop() ?? '';
  const logoB = b.logos[0]?.url.split('/').pop() ?? '';
  if (logoA && logoB && logoA !== logoB) {
    changes.push({
      kind: 'logo',
      weight: 0.5,
      summary: 'The main logo image file changed',
      detail: `The most logo-like image went from "${logoA}" to "${logoB}". A renamed file is not proof the logo was redrawn.`,
    });
  }

  /* Colour. */
  const shift = paletteShift(a.colors, b.colors);
  if (shift > 0.45) {
    changes.push({
      kind: 'color',
      weight: 0.7 * shift,
      summary: 'The declared colour palette shifted substantially',
      detail:
        'The colours written into the markup moved a long way. Colours set in external stylesheets are not visible to this comparison.',
    });
  }

  /* Structure counts. */
  const structural =
    (relativeChange(a.headings, b.headings) +
      relativeChange(a.links, b.links) +
      relativeChange(a.images, b.images) +
      relativeChange(a.divs, b.divs) +
      relativeChange(a.forms, b.forms)) /
    5;

  if (structural > 0.55) {
    changes.push({
      kind: 'structure',
      weight: 0.6 * structural,
      summary: 'Document structure changed substantially',
      detail: `Headings ${a.headings}→${b.headings}, links ${a.links}→${b.links}, images ${a.images}→${b.images}, containers ${a.divs}→${b.divs}.`,
    });
  }

  /* Page weight — a proxy for how much was rebuilt. */
  const weightChange = relativeChange(a.bytes, b.bytes);
  if (weightChange > 0.7) {
    changes.push({
      kind: 'size',
      weight: 0.3 * weightChange,
      summary: 'Page size changed dramatically',
      detail: `The HTML went from ${Math.round(a.bytes / 1024)} KB to ${Math.round(b.bytes / 1024)} KB.`,
    });
  }

  if (a.title && b.title && a.title !== b.title) {
    changes.push({
      kind: 'content',
      weight: 0.2,
      summary: 'The page title changed',
      detail: `"${a.title}" → "${b.title}"`,
    });
  }

  /* The overall score. Saturating rather than linear: three strong signals
     should already read as "heavily rebuilt", and a long tail of small ones
     shouldn't be able to push a content update to the top of the scale. */
  const total = changes.reduce((sum, c) => sum + c.weight, 0);
  const score = Math.round(100 * (1 - Math.exp(-total / 1.6)));

  return {
    score,
    changes: changes.sort((x, y) => y.weight - x.weight),
  };
}

/**
 * Verdict wording for a change score. Deliberately hedged: the score measures
 * markup distance, which correlates with redesigns but does not establish one.
 */
export function describeScore(score: number): {
  label: string;
  detail: string;
} {
  if (score >= 70) {
    return {
      label: 'Heavily rebuilt',
      detail:
        'The markup differs so much between these captures that the page was almost certainly rebuilt, not just re-edited.',
    };
  }
  if (score >= 40) {
    return {
      label: 'Substantially changed',
      detail:
        'Several structural parts of the page differ. That often accompanies a redesign, though a large content change can look similar in the markup.',
    };
  }
  if (score >= 15) {
    return {
      label: 'Moderately changed',
      detail:
        'The pages share their overall structure but differ in the details — typical of an evolving site between redesigns.',
    };
  }
  return {
    label: 'Structurally similar',
    detail:
      'The markup is broadly the same shape. Note that a site can change its entire appearance in a stylesheet without changing its HTML, and this comparison would not see it.',
  };
}

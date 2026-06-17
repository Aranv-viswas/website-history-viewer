/**
 * Screenshot service — provider abstraction.
 *
 * The goal is a single stable entry point, `getWebsiteScreenshot()`, behind
 * which we can swap rendering strategies without touching the UI:
 *
 *   - placeholder (default): no image rendering; the UI embeds the archived
 *     page in a sandboxed <iframe>, with a generated SVG poster as a fallback.
 *   - wayback-thumbnail: derive a preview from the archive (if/when available).
 *   - playwright / puppeteer: render the archived URL to a real PNG (future).
 *   - cache: serve a previously rendered PNG from /public/cache (future).
 *
 * Switch providers with the SCREENSHOT_PROVIDER env var. The `placeholder`
 * (iframe) and `api` (external rendering service) providers are wired up; the
 * others are stubs documenting the seam.
 */

import type { Screenshot, ScreenshotProviderName } from '@lib/types';

export interface ScreenshotOptions {
  /** Width hint for layout stability and provider sizing. */
  width?: number;
  /** Height hint. */
  height?: number;
  /** Accessible description of what's being shown. */
  alt?: string;
}

const DEFAULTS: Required<ScreenshotOptions> = {
  width: 1200,
  height: 800,
  alt: 'Archived website screenshot',
};

/**
 * Read a config value, preferring runtime `process.env` (so a secret API key
 * can be set in the Vercel dashboard and rotated without a rebuild, and isn't
 * inlined into the bundle) and falling back to Vite's `import.meta.env` for
 * local dev. Returns undefined when unset/empty.
 */
function env(name: string): string | undefined {
  const fromProcess =
    typeof process !== 'undefined' ? process.env?.[name] : undefined;
  const value = fromProcess ?? (import.meta.env as Record<string, unknown>)[name];
  return value ? String(value) : undefined;
}

/**
 * Turn a standard archived URL into an embeddable, toolbar-free variant by
 * inserting the Wayback `if_` modifier after the timestamp. Example:
 *   .../web/20100101000000/http://google.com/
 *   .../web/20100101000000if_/http://google.com/
 * The `if_` form omits the Wayback header/banner, which looks far better inside
 * an <iframe> and avoids most layout breakage.
 */
export function toEmbeddableUrl(archivedUrl: string): string {
  return archivedUrl.replace(/\/web\/(\d{1,14})(\w{0,3}_)?\//, '/web/$1if_/');
}

/**
 * Generate a lightweight inline SVG "poster" so cards never render empty while
 * an iframe loads (or if it's blocked). Encoded as a data URI — zero requests.
 */
export function placeholderPoster(
  label: string,
  width = DEFAULTS.width,
  height = DEFAULTS.height
): string {
  const safe = label.replace(/[<>&]/g, '').slice(0, 40);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#1e3a8a"/>
        <stop offset="1" stop-color="#172554"/>
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <text x="50%" y="48%" fill="#bfdbfe" font-family="system-ui,sans-serif" font-size="${Math.round(
      width / 22
    )}" font-weight="700" text-anchor="middle">${safe}</text>
    <text x="50%" y="58%" fill="#60a5fa" font-family="system-ui,sans-serif" font-size="${Math.round(
      width / 40
    )}" text-anchor="middle">Wayback Machine snapshot</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Build a URL to an external screenshot service that renders the given target
 * URL to an image. Configured entirely by env so any provider can be plugged in
 * without code changes:
 *
 *   SCREENSHOT_API_URL   Template for the request. Supports {url}, {width},
 *                        {height}, and {key} placeholders. If it contains no
 *                        {url}, the encoded target is appended as a query param
 *                        (name from SCREENSHOT_API_PARAM, default "url").
 *   SCREENSHOT_API_KEY   Optional; substituted for {key}.
 *   SCREENSHOT_API_PARAM Optional query-param name when the template has no {url}.
 *
 * Returns null when no service is configured, so callers can fall back.
 *
 * Examples:
 *   SCREENSHOT_API_URL="https://api.example.com/take?url={url}&w={width}&token={key}"
 *   SCREENSHOT_API_URL="https://images.weserv.nl/?url={url}"          (param style)
 *   SCREENSHOT_API_URL="https://shot.example.com/"  + SCREENSHOT_API_PARAM="target"
 */
export function screenshotApiUrl(
  targetUrl: string,
  opts: Required<ScreenshotOptions> = DEFAULTS
): string | null {
  const template = env('SCREENSHOT_API_URL');
  if (!template) return null;

  const key = env('SCREENSHOT_API_KEY') ?? '';
  const encoded = encodeURIComponent(targetUrl);

  if (template.includes('{url}')) {
    return template
      .replace('{url}', encoded)
      .replace('{width}', String(opts.width))
      .replace('{height}', String(opts.height))
      .replace('{key}', encodeURIComponent(key));
  }

  // No placeholder: append the target as a query parameter.
  const param = env('SCREENSHOT_API_PARAM') ?? 'url';
  const sep = template.includes('?') ? '&' : '?';
  const keyPart = key ? `&key=${encodeURIComponent(key)}` : '';
  return `${template}${sep}${param}=${encoded}${keyPart}`;
}

interface ScreenshotProvider {
  name: ScreenshotProviderName;
  capture(
    snapshotUrl: string,
    opts: Required<ScreenshotOptions>
  ): Promise<Screenshot> | Screenshot;
}

/** Default provider: iframe embed of the live archived page. */
const placeholderProvider: ScreenshotProvider = {
  name: 'placeholder',
  capture(snapshotUrl, opts) {
    return {
      provider: 'placeholder',
      imageUrl: null,
      useIframe: true,
      iframeUrl: toEmbeddableUrl(snapshotUrl),
      width: opts.width,
      height: opts.height,
      alt: opts.alt,
    };
  },
};

/**
 * External screenshot-API provider: renders the toolbar-free archived page to a
 * real image via a configured service. Falls back to the iframe behavior if the
 * service isn't configured, so the app keeps working either way.
 */
const apiProvider: ScreenshotProvider = {
  name: 'api',
  capture(snapshotUrl, opts) {
    const embeddable = toEmbeddableUrl(snapshotUrl);
    const imageUrl = screenshotApiUrl(embeddable, opts);
    if (!imageUrl) return placeholderProvider.capture(snapshotUrl, opts);
    return {
      provider: 'api',
      imageUrl,
      useIframe: false,
      // Keep the embeddable URL so the UI can fall back to an iframe if the
      // rendered image fails to load.
      iframeUrl: embeddable,
      width: opts.width,
      height: opts.height,
      alt: opts.alt,
    };
  },
};

/**
 * Future providers slot in here. Each should resolve to a Screenshot with
 * `imageUrl` set (and `useIframe: false`) once real rendering is implemented.
 * They intentionally fall back to the placeholder behavior for now so the app
 * keeps working end-to-end.
 */
const providers: Record<ScreenshotProviderName, ScreenshotProvider> = {
  placeholder: placeholderProvider,
  api: apiProvider,
  'wayback-thumbnail': { ...placeholderProvider, name: 'wayback-thumbnail' },
  playwright: { ...placeholderProvider, name: 'playwright' },
  puppeteer: { ...placeholderProvider, name: 'puppeteer' },
  cache: { ...placeholderProvider, name: 'cache' },
};

function selectProvider(): ScreenshotProvider {
  // Explicit choice wins; otherwise default to `api` when a service URL is
  // configured, falling back to the iframe placeholder.
  const configured = env('SCREENSHOT_PROVIDER') as
    | ScreenshotProviderName
    | undefined;
  if (configured) return providers[configured] ?? placeholderProvider;
  if (env('SCREENSHOT_API_URL')) return apiProvider;
  return placeholderProvider;
}

/**
 * Resolve the best available screenshot/preview for an archived snapshot URL.
 * Stable public API — the UI only ever calls this.
 */
export async function getWebsiteScreenshot(
  snapshotUrl: string | null,
  opts: ScreenshotOptions = {}
): Promise<Screenshot> {
  const merged = { ...DEFAULTS, ...opts };

  // No archived URL -> nothing to show; signal an empty/fallback state.
  if (!snapshotUrl) {
    return {
      provider: 'placeholder',
      imageUrl: null,
      useIframe: false,
      iframeUrl: null,
      width: merged.width,
      height: merged.height,
      alt: merged.alt,
    };
  }

  return selectProvider().capture(snapshotUrl, merged);
}

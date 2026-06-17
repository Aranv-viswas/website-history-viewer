import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  screenshotApiUrl,
  toEmbeddableUrl,
  getWebsiteScreenshot,
} from './screenshot';

afterEach(() => {
  vi.unstubAllEnvs();
});

const ARCHIVED =
  'https://web.archive.org/web/20100101000000/http://google.com/';

describe('toEmbeddableUrl', () => {
  it('inserts the toolbar-free if_ modifier', () => {
    expect(toEmbeddableUrl(ARCHIVED)).toBe(
      'https://web.archive.org/web/20100101000000if_/http://google.com/'
    );
  });

  it('replaces an existing modifier rather than stacking it', () => {
    const withMod =
      'https://web.archive.org/web/20100101000000im_/http://google.com/';
    expect(toEmbeddableUrl(withMod)).toContain('20100101000000if_/');
  });
});

describe('screenshotApiUrl', () => {
  it('returns null when no service is configured', () => {
    vi.stubEnv('SCREENSHOT_API_URL', '');
    expect(screenshotApiUrl(ARCHIVED)).toBeNull();
  });

  it('substitutes {url}, {width}, {height}, {key} placeholders', () => {
    vi.stubEnv(
      'SCREENSHOT_API_URL',
      'https://api.example.com/s?url={url}&w={width}&h={height}&token={key}'
    );
    vi.stubEnv('SCREENSHOT_API_KEY', 'secret');

    const out = screenshotApiUrl(ARCHIVED, {
      width: 800,
      height: 600,
      alt: '',
    });
    expect(out).toContain('url=' + encodeURIComponent(ARCHIVED));
    expect(out).toContain('w=800');
    expect(out).toContain('h=600');
    expect(out).toContain('token=secret');
  });

  it('appends a query param when the template has no {url}', () => {
    vi.stubEnv('SCREENSHOT_API_URL', 'https://images.weserv.nl/');
    expect(screenshotApiUrl(ARCHIVED)).toBe(
      `https://images.weserv.nl/?url=${encodeURIComponent(ARCHIVED)}`
    );
  });

  it('honors a custom query-param name and joins with & when needed', () => {
    vi.stubEnv('SCREENSHOT_API_URL', 'https://shot.example.com/?fmt=png');
    vi.stubEnv('SCREENSHOT_API_PARAM', 'target');
    expect(screenshotApiUrl(ARCHIVED)).toBe(
      `https://shot.example.com/?fmt=png&target=${encodeURIComponent(ARCHIVED)}`
    );
  });
});

describe('getWebsiteScreenshot (api provider)', () => {
  it('produces a real image url when configured', async () => {
    vi.stubEnv('SCREENSHOT_PROVIDER', 'api');
    vi.stubEnv('SCREENSHOT_API_URL', 'https://api.example.com/s?url={url}');

    const shot = await getWebsiteScreenshot(ARCHIVED);
    expect(shot.provider).toBe('api');
    expect(shot.useIframe).toBe(false);
    expect(shot.imageUrl).toContain('https://api.example.com/s?url=');
    // Image is rendered from the toolbar-free embeddable URL.
    expect(shot.imageUrl).toContain(encodeURIComponent('20100101000000if_'));
  });

  it('falls back to the iframe when the api is selected but unconfigured', async () => {
    vi.stubEnv('SCREENSHOT_PROVIDER', 'api');
    vi.stubEnv('SCREENSHOT_API_URL', '');

    const shot = await getWebsiteScreenshot(ARCHIVED);
    expect(shot.imageUrl).toBeNull();
    expect(shot.useIframe).toBe(true);
    expect(shot.iframeUrl).toContain('if_/');
  });

  it('returns an empty state for a null snapshot url', async () => {
    const shot = await getWebsiteScreenshot(null);
    expect(shot.imageUrl).toBeNull();
    expect(shot.useIframe).toBe(false);
  });
});

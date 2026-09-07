import { describe, it, expect } from 'vitest';
import {
  getLangFromUrl,
  getLang,
  stripLocale,
  localizePath,
  localizeHref,
  isLocalizable,
  routePath,
  useTranslations,
  getAlternateLinks,
  LOCALES,
} from './utils';
import { ui } from './ui';

const url = (path: string) => new URL(path, 'https://example.com');

describe('getLangFromUrl', () => {
  it('returns the default locale for the root and un-prefixed paths', () => {
    expect(getLangFromUrl(url('/'))).toBe('en');
    expect(getLangFromUrl(url('/about'))).toBe('en');
  });

  it('reads a leading non-default locale segment', () => {
    expect(getLangFromUrl(url('/es/about'))).toBe('es');
    expect(getLangFromUrl(url('/hi'))).toBe('hi');
  });

  it('ignores an unknown first segment', () => {
    expect(getLangFromUrl(url('/xx/about'))).toBe('en');
  });
});

describe('getLang', () => {
  it('prefers Astro.currentLocale (correct on rewrite fallback pages)', () => {
    // On a /de fallback page, currentLocale is "de" even though url is the
    // source English route.
    expect(getLang({ currentLocale: 'de', url: url('/histories') })).toBe('de');
  });

  it('falls back to URL parsing when currentLocale is missing or invalid', () => {
    expect(getLang({ currentLocale: undefined, url: url('/fr/about') })).toBe(
      'fr'
    );
    expect(getLang({ currentLocale: 'xx', url: url('/') })).toBe('en');
  });
});

describe('stripLocale', () => {
  it('removes a leading locale prefix', () => {
    expect(stripLocale('/es/about')).toBe('/about');
    expect(stripLocale('/es')).toBe('/');
  });

  it('leaves un-prefixed paths untouched', () => {
    expect(stripLocale('/about')).toBe('/about');
    expect(stripLocale('/')).toBe('/');
  });
});

describe('localizePath', () => {
  it('leaves the default locale un-prefixed', () => {
    expect(localizePath('/about', 'en')).toBe('/about/');
    expect(localizePath('/', 'en')).toBe('/');
  });

  it('prefixes non-default locales', () => {
    expect(localizePath('/about', 'es')).toBe('/es/about/');
    expect(localizePath('/', 'fr')).toBe('/fr/');
  });

  it('re-localizes an already-localized path', () => {
    expect(localizePath('/es/about', 'fr')).toBe('/fr/about/');
    expect(localizePath('/de/about', 'en')).toBe('/about/');
  });
});

describe('routePath', () => {
  it('adds a trailing slash to prerendered pages', () => {
    expect(routePath('/about')).toBe('/about/');
    expect(routePath('/es/google-history')).toBe('/es/google-history/');
  });

  it('leaves the root alone', () => {
    expect(routePath('/')).toBe('/');
  });

  it('is idempotent', () => {
    expect(routePath(routePath('/about'))).toBe('/about/');
    expect(routePath('/about//')).toBe('/about/');
  });

  it('keeps on-demand tool routes slash-less — the Worker serves them bare', () => {
    expect(routePath('/compare')).toBe('/compare');
    expect(routePath('/compare/')).toBe('/compare');
    expect(routePath('/timeline/google.com/')).toBe('/timeline/google.com');
    expect(routePath('/site/google.com/2005-01-01')).toBe(
      '/site/google.com/2005-01-01'
    );
  });

  it('preserves query strings and fragments', () => {
    expect(routePath('/#examples')).toBe('/#examples');
    expect(routePath('/es#facts')).toBe('/es/#facts');
    expect(routePath('/compare?domain=a.com&a=1999-01-01')).toBe(
      '/compare?domain=a.com&a=1999-01-01'
    );
  });

  it('passes through absolute URLs untouched', () => {
    expect(routePath('https://example.com/about')).toBe(
      'https://example.com/about'
    );
  });
});

describe('isLocalizable', () => {
  it('treats content pages as localizable', () => {
    expect(isLocalizable('/about')).toBe(true);
    expect(isLocalizable('/google-history')).toBe(true);
    expect(isLocalizable('/')).toBe(true);
  });

  it('treats on-demand tool routes as non-localizable', () => {
    expect(isLocalizable('/compare')).toBe(false);
    expect(isLocalizable('/timeline/google.com')).toBe(false);
    expect(isLocalizable('/site/google.com/2005-01-01')).toBe(false);
    expect(isLocalizable('/es/compare')).toBe(false);
  });
});

describe('localizeHref', () => {
  it('localizes content links', () => {
    expect(localizeHref('/about', 'es')).toBe('/es/about/');
  });

  it('keeps a fragment attached to the localized home link', () => {
    expect(localizeHref('/#examples', 'de')).toBe('/de/#examples');
    expect(localizeHref('/#examples', 'en')).toBe('/#examples');
  });

  it('keeps tool routes at their canonical English URL in every locale', () => {
    expect(localizeHref('/compare', 'es')).toBe('/compare');
    expect(localizeHref('/timeline/google.com', 'de')).toBe(
      '/timeline/google.com'
    );
  });
});

describe('useTranslations', () => {
  it('returns the translated string for each locale', () => {
    expect(useTranslations('en')('nav.compare')).toBe('Compare');
    expect(useTranslations('es')('nav.compare')).toBe('Comparar');
    expect(useTranslations('fr')('nav.compare')).toBe('Comparer');
    expect(useTranslations('de')('nav.compare')).toBe('Vergleichen');
    expect(useTranslations('hi')('nav.compare')).toBe('तुलना करें');
  });

  it('never renders an empty string — missing keys fall back to English', () => {
    const keys = Object.keys(ui.en) as Array<keyof typeof ui.en>;
    for (const lang of LOCALES) {
      const t = useTranslations(lang);
      for (const key of keys) expect(t(key)).toBeTruthy();
    }
  });
});

describe('getAlternateLinks', () => {
  it('emits one absolute link per locale plus x-default', () => {
    const links = getAlternateLinks('/about', 'https://example.com');
    const byLang = Object.fromEntries(links.map((l) => [l.hreflang, l.href]));

    expect(byLang.en).toBe('https://example.com/about/');
    expect(byLang.es).toBe('https://example.com/es/about/');
    expect(byLang['x-default']).toBe('https://example.com/about/');
    expect(links).toHaveLength(6); // 5 locales + x-default
  });

  it('normalizes an already-localized input path', () => {
    const links = getAlternateLinks('/fr/about', 'https://example.com');
    const fr = links.find((l) => l.hreflang === 'fr');
    expect(fr?.href).toBe('https://example.com/fr/about/');
  });
});

describe('route classification matches prerender status', () => {
  /**
   * `routePath` emits a trailing slash for prerendered pages (Astro writes them
   * as <path>/index.html, and Cloudflare 307-redirects the slash-less form) and
   * no slash for on-demand routes the Worker matches directly. Getting a route
   * on the wrong side makes every canonical tag, hreflang alternate and sitemap
   * entry for it a redirect, which is what files pages under "Page with
   * redirect" in Search Console instead of indexing them.
   */
  const ON_DEMAND = [
    '/compare',
    '/compare/google.com/2000-01-01/2020-01-01',
    '/timeline/google.com',
    '/evolution/google.com',
    '/site/google.com/2005-01-01',
    '/search',
    '/on-this-day',
    '/random',
    '/api/history',
  ];

  const PRERENDERED = [
    '/',
    '/about',
    '/compare-nothing-like-the-tool-route',
    '/explore',
    '/collections',
    '/collection/early-internet',
    '/google-history',
  ];

  it.each(ON_DEMAND)(
    '%s is on-demand: no trailing slash, no locale',
    (path) => {
      expect(isLocalizable(path)).toBe(false);
      expect(routePath(path).endsWith('/')).toBe(false);
      // `localizeHref` is the link builder and must leave tool routes alone.
      // (`localizePath` force-prefixes by design and is not the one to use here.)
      expect(localizeHref(path, 'de')).not.toContain('/de/');
    }
  );

  it.each(PRERENDERED)(
    '%s is prerendered: trailing slash + locales',
    (path) => {
      expect(isLocalizable(path)).toBe(true);
      expect(routePath(path).endsWith('/')).toBe(true);
      expect(localizePath(path, 'de').startsWith('/de')).toBe(true);
      expect(localizeHref(path, 'de').startsWith('/de')).toBe(true);
    }
  );

  it('keeps query strings and fragments intact either way', () => {
    expect(routePath('/on-this-day?month=12&day=25')).toBe(
      '/on-this-day?month=12&day=25'
    );
    expect(routePath('/collections#top')).toBe('/collections/#top');
  });
});

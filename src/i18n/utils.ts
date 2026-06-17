/**
 * Internationalization helpers: locale detection, path localization, and the
 * translation lookup used across components.
 *
 * The locale is derived purely from the URL path (the first segment), which
 * makes these helpers work identically for prerendered pages, on-demand routes
 * and Astro's `fallbackType: 'rewrite'` pages — none of them have to thread a
 * `lang` prop around.
 */

import { ui, LOCALES, DEFAULT_LANG, type Lang, type UIKey } from './ui';

/** Type guard: is `value` one of our supported locale codes? */
export function isLang(value: string): value is Lang {
  return (LOCALES as readonly string[]).includes(value);
}

/**
 * Determine the active locale from a URL. The default locale lives at the root
 * (no prefix), so only a leading non-default locale segment counts.
 */
export function getLangFromUrl(url: URL): Lang {
  const [, first] = url.pathname.split('/');
  if (isLang(first) && first !== DEFAULT_LANG) return first;
  return DEFAULT_LANG;
}

/**
 * Resolve the active locale for a page. Prefer Astro's `currentLocale`, which is
 * correct even on `fallbackType: 'rewrite'` pages where `Astro.url` still points
 * at the source (English) route. Falls back to URL parsing, then the default.
 *
 * Pass the `Astro` global directly: `getLang(Astro)`.
 */
export function getLang(astro: {
  currentLocale?: string | undefined;
  url: URL;
}): Lang {
  const current = astro.currentLocale;
  if (current && isLang(current)) return current;
  return getLangFromUrl(astro.url);
}

/**
 * Strip a leading locale prefix from a pathname, returning the locale-agnostic
 * path. `/es/about` -> `/about`, `/es` -> `/`, `/about` -> `/about`.
 */
export function stripLocale(pathname: string): string {
  const [, first, ...rest] = pathname.split('/');
  if (isLang(first) && first !== DEFAULT_LANG) {
    return '/' + rest.join('/');
  }
  return pathname;
}

/**
 * Rewrite a pathname so it points at the given locale's version of the page.
 * Default locale -> no prefix; every other locale -> `/<lang>` prefix. Existing
 * locale prefixes are normalized away first, so it's safe to re-localize an
 * already-localized path (used by the language switcher).
 */
export function localizePath(pathname: string, lang: Lang): string {
  const base = stripLocale(pathname) || '/';
  if (lang === DEFAULT_LANG) return base;
  return base === '/' ? `/${lang}` : `/${lang}${base}`;
}

/**
 * On-demand (SSR) route prefixes. These render at request time and are NOT
 * generated per-locale by Astro's static i18n fallback, so a `/es/compare` URL
 * would 404. They are interactive tools rather than indexable content, so they
 * stay at their canonical (un-prefixed) URLs in every locale. Keep this in sync
 * with the `prerender = false` routes under src/pages.
 */
export const NON_LOCALIZED_PREFIXES = [
  '/compare',
  '/timeline',
  '/site',
  '/search',
  '/api',
] as const;

/** Is `path` an on-demand tool route that isn't generated per-locale? */
export function isLocalizable(path: string): boolean {
  const pathOnly = stripLocale(path).split(/[?#]/)[0];
  return !NON_LOCALIZED_PREFIXES.some(
    (p) => pathOnly === p || pathOnly.startsWith(`${p}/`)
  );
}

/**
 * Localize an internal link href. Content pages get a locale prefix; on-demand
 * tool routes (see {@link NON_LOCALIZED_PREFIXES}) keep their canonical English
 * URL so they never resolve to a non-existent localized route. Use this for any
 * navigation link; use {@link localizePath} only when you know the target is a
 * localizable content page.
 */
export function localizeHref(path: string, lang: Lang): string {
  if (!isLocalizable(path)) return stripLocale(path) || '/';
  return localizePath(path, lang);
}

/**
 * Build the translation function for a locale. Missing keys transparently fall
 * back to the English string, so partially-translated locales still render.
 */
export function useTranslations(lang: Lang) {
  const dict = ui[lang] as Partial<Record<UIKey, string>>;
  // `ui.en` is the complete source dictionary and the guaranteed fallback.
  return function t(key: UIKey): string {
    return dict[key] ?? ui.en[key];
  };
}

/**
 * The `hreflang` alternates for a given (locale-agnostic) pathname: one entry
 * per locale plus an `x-default` pointing at the English version. Hrefs are
 * absolute, as required for `<link rel="alternate" hreflang>` and sitemaps.
 */
export function getAlternateLinks(
  pathname: string,
  siteUrl: string
): Array<{ hreflang: string; href: string }> {
  const base = stripLocale(pathname);
  const abs = (lang: Lang) =>
    new URL(localizePath(base, lang), siteUrl).href;

  const links: Array<{ hreflang: string; href: string }> = LOCALES.map(
    (lang) => ({ hreflang: lang, href: abs(lang) })
  );
  // x-default sends unmatched languages to the English (root) version.
  links.push({ hreflang: 'x-default', href: abs(DEFAULT_LANG) });
  return links;
}

export { LOCALES, DEFAULT_LANG, LANGUAGES, type Lang, type UIKey } from './ui';

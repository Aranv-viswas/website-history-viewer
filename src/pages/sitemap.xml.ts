/**
 * GET /sitemap.xml — a complete sitemap of every indexable page.
 *
 * Built by hand (rather than via @astrojs/sitemap) so we can include the
 * on-demand /timeline/[domain] pages for our curated popular sites, which an
 * automatic build-time crawl of static routes would otherwise miss.
 *
 * Excludes: /404, the arbitrary on-demand /site/[domain]/[date] snapshot pages,
 * and anything disallowed in robots.txt.
 */
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { SITE, POPULAR_SITES } from '@lib/constants';
import { domainToSlug } from '@utils/domain';
import { LOCALES, DEFAULT_LANG, localizePath, isLocalizable } from '@i18n/utils';

export const prerender = true;

type Entry = { path: string; changefreq?: string; priority?: number };

export const GET: APIRoute = async ({ site }) => {
  // Prefer the build-time `site` config; fall back to the constant.
  const base = (site?.href ?? SITE.url).replace(/\/$/, '');
  const lastmod = new Date().toISOString().slice(0, 10);

  const loc = (path: string) => `${base}${path}`;

  /** The `<xhtml:link rel="alternate" hreflang>` block shared by a page's
   *  locale variants — every page lists all its language alternates. */
  const alternatesXml = (path: string) =>
    [
      ...LOCALES.map(
        (lang) =>
          `    <xhtml:link rel="alternate" hreflang="${lang}" href="${loc(localizePath(path, lang))}" />`
      ),
      `    <xhtml:link rel="alternate" hreflang="x-default" href="${loc(localizePath(path, DEFAULT_LANG))}" />`,
    ].join('\n');

  const entries: Entry[] = [
    { path: '/', changefreq: 'weekly', priority: 1.0 },
    { path: '/compare', changefreq: 'weekly', priority: 0.8 },
    { path: '/histories', changefreq: 'weekly', priority: 0.8 },
    { path: '/about', changefreq: 'yearly', priority: 0.3 },
    { path: '/contact', changefreq: 'yearly', priority: 0.3 },
    { path: '/privacy-policy', changefreq: 'yearly', priority: 0.2 },
    { path: '/terms', changefreq: 'yearly', priority: 0.2 },
  ];

  // Featured "design evolution" pages (e.g. /google-history).
  const histories = await getCollection('histories');
  for (const entry of histories) {
    entries.push({
      path: `/${entry.id}-history`,
      changefreq: 'weekly',
      priority: 0.7,
    });
  }

  // Curated popular-site timelines (/timeline/google.com, …).
  for (const sitePreset of POPULAR_SITES) {
    entries.push({
      path: `/timeline/${domainToSlug(sitePreset.domain)}`,
      changefreq: 'weekly',
      priority: 0.6,
    });
  }

  const urlBlock = (path: string, changefreq?: string, priority?: number) =>
    [
      '  <url>',
      `    <loc>${loc(path)}</loc>`,
      `    <lastmod>${lastmod}</lastmod>`,
      changefreq ? `    <changefreq>${changefreq}</changefreq>` : null,
      priority != null ? `    <priority>${priority.toFixed(1)}</priority>` : null,
      // Only content pages exist per-locale; on-demand tool routes are
      // English-only, so they carry no hreflang alternates.
      isLocalizable(path) ? alternatesXml(path) : null,
      '  </url>',
    ]
      .filter(Boolean)
      .join('\n');

  // Content pages emit one <url> per locale (each with the full hreflang set);
  // on-demand tool routes emit a single English <url>.
  const urls = entries
    .flatMap(({ path, changefreq, priority }) =>
      isLocalizable(path)
        ? LOCALES.map((lang) =>
            urlBlock(localizePath(path, lang), changefreq, priority)
          )
        : [urlBlock(path, changefreq, priority)]
    )
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls}
</urlset>
`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};

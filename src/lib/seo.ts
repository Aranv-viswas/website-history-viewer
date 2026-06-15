/**
 * SEO helpers: titles, canonical URLs, and JSON-LD structured data.
 *
 * The <SEO> component (src/components/SEO.astro) renders the actual tags; this
 * module centralizes the string-building so titles and schema stay consistent.
 */

import { SITE } from './constants';

/** Append the brand to a page title (unless it's the homepage). */
export function buildTitle(pageTitle?: string): string {
  if (!pageTitle || pageTitle === SITE.name) return SITE.name;
  return `${pageTitle} | ${SITE.name}`;
}

/** Absolute canonical URL for a path. */
export function canonicalURL(path: string, base: string = SITE.url): string {
  try {
    return new URL(path, base).href;
  } catch {
    return base;
  }
}

/** Absolute URL for an Open Graph image (handles relative or absolute input). */
export function absoluteImageURL(image: string, base: string = SITE.url): string {
  if (/^https?:\/\//.test(image)) return image;
  return canonicalURL(image, base);
}

/** JSON-LD for the site as a whole (rendered once, on the homepage). */
export function websiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE.name,
    url: SITE.url,
    description: SITE.description,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE.url}/site/{domain}/{date}`,
      },
      'query-input': 'required name=domain',
    },
  };
}

/** JSON-LD breadcrumb trail. */
export function breadcrumbJsonLd(
  items: Array<{ name: string; path: string }>
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: canonicalURL(item.path),
    })),
  };
}

/** JSON-LD for a featured-evolution article page. */
export function articleJsonLd(opts: {
  title: string;
  description: string;
  path: string;
  image?: string;
  datePublished?: string;
  dateModified?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: opts.title,
    description: opts.description,
    mainEntityOfPage: canonicalURL(opts.path),
    image: opts.image ? absoluteImageURL(opts.image) : undefined,
    datePublished: opts.datePublished,
    dateModified: opts.dateModified ?? opts.datePublished,
    author: { '@type': 'Organization', name: SITE.name, url: SITE.url },
    publisher: { '@type': 'Organization', name: SITE.name, url: SITE.url },
  };
}

/** JSON-LD FAQ block — great for rich results on history pages. */
export function faqJsonLd(faqs: Array<{ question: string; answer: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  };
}

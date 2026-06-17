/**
 * GET /robots.txt — generated so it always references the correct host and
 * sitemap, regardless of deploy environment. Prerendered to a static file.
 */
import type { APIRoute } from 'astro';
import { SITE } from '@lib/constants';

export const prerender = true;

export const GET: APIRoute = ({ site }) => {
  const base = (site ?? new URL(SITE.url)).href.replace(/\/$/, '');
  const body = `# Website History Viewer
User-agent: *
Allow: /

# Don't crawl the cache directory
Disallow: /cache/

# Arbitrary on-demand snapshot pages — not worth crawling at scale.
Disallow: /site/

Sitemap: ${base}/sitemap.xml
`;
  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};

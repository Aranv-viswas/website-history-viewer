/**
 * GET /api/snapshot?domain=&date= — JSON snapshot lookup.
 *
 * A thin, cacheable wrapper over the Wayback service for programmatic use and
 * potential client-side enhancements. On-demand rendered.
 *
 * Example: /api/snapshot?domain=google.com&date=2010-01-01
 */
import type { APIRoute } from 'astro';
import { getSnapshot } from '@services/wayback';
import { normalizeDomain, isValidDomain } from '@utils/domain';
import { isValidArchiveDate, todayISO } from '@utils/date';

export const prerender = false;

function json(data: unknown, status = 200, cache = false): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...(cache
        ? { 'Cache-Control': 'public, max-age=3600, s-maxage=86400' }
        : {}),
    },
  });
}

export const GET: APIRoute = async ({ url }) => {
  const domain = normalizeDomain(url.searchParams.get('domain') ?? '');
  const dateParam = url.searchParams.get('date') ?? '';

  if (!isValidDomain(domain)) {
    return json(
      { error: 'invalid_domain', message: 'Provide a valid ?domain=, e.g. google.com' },
      400
    );
  }

  const date = isValidArchiveDate(dateParam) ? dateParam : todayISO();
  const snapshot = await getSnapshot(domain, date);

  return json(snapshot, 200, snapshot.available);
};

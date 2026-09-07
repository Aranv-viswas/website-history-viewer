/**
 * GET /api/stats?url=<domain>
 *
 * The light sibling of /api/history: the headline numbers only, with none of
 * the per-month density payload. This is what the search box calls on every
 * (debounced) keystroke, so it stays small — a few hundred bytes rather than
 * the tens of kilobytes a full history can be.
 *
 * Example: /api/stats?url=google.com
 */
import type { APIRoute } from 'astro';
import { getArchiveOverview } from '@services/archive-overview';
import {
  normalizeDomain,
  isValidDomain,
  domainDisplayName,
} from '@utils/domain';
import { computeStats, monthToISO } from '@lib/history';
import { json, apiError, cacheForStatus } from '@lib/api';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const raw =
    url.searchParams.get('url') ?? url.searchParams.get('domain') ?? '';
  const domain = normalizeDomain(raw);

  if (!isValidDomain(domain)) {
    return apiError(
      'invalid_domain',
      'Provide a valid ?url=, for example ?url=google.com',
      { status: 400 }
    );
  }

  const overview = await getArchiveOverview(domain);
  const stats = computeStats(overview);

  /* A representative "preview" date for the caller to render a thumbnail from.
     The middle of the archived span shows a site in its recognisable era far
     more often than either extreme — the first capture is often a placeholder
     and the latest is just the site as it is now. */
  const previewDate =
    overview.status === 'ok' && overview.months.length > 0
      ? (() => {
          const middle =
            overview.months[Math.floor(overview.months.length / 2)];
          return monthToISO(middle.year, middle.month);
        })()
      : null;

  return json(
    {
      domain,
      name: domainDisplayName(domain),
      status: overview.status,
      message: overview.message,
      firstYear: stats.firstYear,
      lastYear: stats.lastYear,
      firstArchivedDate: stats.firstArchivedDate,
      lastArchivedDate: stats.lastArchivedDate,
      yearsSpanned: stats.yearsSpanned,
      totalCaptures: stats.totalCaptures,
      coverage: stats.coverage,
      previewDate,
      links: {
        timeline: `/timeline/${encodeURIComponent(domain)}`,
        evolution: `/evolution/${encodeURIComponent(domain)}`,
        snapshot: previewDate
          ? `/site/${encodeURIComponent(domain)}/${previewDate}`
          : null,
      },
    },
    { cache: cacheForStatus(overview.status) }
  );
};

/**
 * GET /api/history?url=<domain>&frames=<n>
 *
 * The aggregate endpoint behind the interactive timeline, the statistics panel
 * and the evolution player: one request returns the whole archived history of a
 * domain — per-month capture density, derived statistics, a representative
 * frame list, and the years where archiving activity spiked.
 *
 * It deliberately does NOT resolve a snapshot per frame. A 24-frame history
 * would mean 24 upstream availability calls on a cold cache; instead frames
 * carry the date to look up and the client resolves them lazily, in view order,
 * through the existing /api/snapshot endpoint.
 *
 * Example: /api/history?url=google.com&frames=24
 */
import type { APIRoute } from 'astro';
import { getArchiveOverview } from '@services/archive-overview';
import {
  normalizeDomain,
  isValidDomain,
  domainDisplayName,
} from '@utils/domain';
import {
  computeStats,
  groupByYear,
  buildFrames,
  detectArchivingSpikes,
} from '@lib/history';
import { json, apiError, cacheForStatus, clampParam } from '@lib/api';

export const prerender = false;

/** Frame-count bounds. Above ~60 the timeline stops being readable. */
const DEFAULT_FRAMES = 24;
const MIN_FRAMES = 2;
const MAX_FRAMES = 60;

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

  const frameCount = clampParam(
    url.searchParams.get('frames'),
    DEFAULT_FRAMES,
    MIN_FRAMES,
    MAX_FRAMES
  );

  const overview = await getArchiveOverview(domain);

  // Not-ok outcomes still return 200 with a described status: the request was
  // valid and the answer ("this domain is excluded from the archive") is
  // meaningful data the UI renders as an empty state, not an HTTP failure.
  if (overview.status !== 'ok') {
    return json(
      {
        domain,
        name: domainDisplayName(domain),
        status: overview.status,
        message: overview.message,
        stats: computeStats(overview),
        years: [],
        frames: [],
        spikes: [],
      },
      { cache: cacheForStatus(overview.status) }
    );
  }

  return json(
    {
      domain,
      name: domainDisplayName(domain),
      status: 'ok',
      message: null,
      stats: computeStats(overview),
      // Per-year totals drive the timeline's density bars. Month detail rides
      // along so the client can zoom into a year without a second request.
      years: groupByYear(overview.months).map((y) => ({
        year: y.year,
        captures: y.captures,
        months: y.months.map((m) => ({
          month: m.month,
          captures: m.captures,
          statusClass: m.statusClass,
        })),
      })),
      frames: buildFrames(overview, frameCount),
      spikes: detectArchivingSpikes(overview),
    },
    { cache: cacheForStatus('ok') }
  );
};

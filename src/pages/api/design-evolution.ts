/**
 * GET /api/design-evolution?url=<domain>&frames=<n>&threshold=<n>
 *
 * A domain's design history: palette, logo candidate and era markers per frame,
 * plus the transitions that look like redesigns.
 *
 * This is the application's most expensive endpoint — one archived HTML fetch
 * per frame. It is bounded (8 frames by default, 12 maximum), runs three
 * fetches at a time, and is cached for a day both in memory and at the edge, so
 * the cost is paid once per domain rather than once per visitor.
 *
 * Example: /api/design-evolution?url=apple.com&frames=8
 */
import type { APIRoute } from 'astro';
import {
  getDesignEvolution,
  findLikelyRedesigns,
  DEFAULT_DESIGN_FRAMES,
  MAX_DESIGN_FRAMES,
  DEFAULT_REDESIGN_THRESHOLD,
} from '@services/design-evolution';
import {
  normalizeDomain,
  isValidDomain,
  domainDisplayName,
} from '@utils/domain';
import { json, apiError, cacheForStatus, clampParam } from '@lib/api';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const domain = normalizeDomain(
    url.searchParams.get('url') ?? url.searchParams.get('domain') ?? ''
  );

  if (!isValidDomain(domain)) {
    return apiError(
      'invalid_domain',
      'Provide a valid ?url=, e.g. google.com',
      {
        status: 400,
      }
    );
  }

  const frames = clampParam(
    url.searchParams.get('frames'),
    DEFAULT_DESIGN_FRAMES,
    2,
    MAX_DESIGN_FRAMES
  );

  // The redesign threshold is a product decision, not a constant, so callers
  // can tighten or loosen it without a deploy.
  const threshold = clampParam(
    url.searchParams.get('threshold'),
    DEFAULT_REDESIGN_THRESHOLD,
    10,
    95
  );

  const result = await getDesignEvolution(domain, frames);

  if (result.status !== 'ok') {
    return json(
      {
        domain,
        name: domainDisplayName(domain),
        status: result.status,
        message: result.message,
        frames: [],
        redesigns: [],
        analyzedCount: 0,
      },
      { cache: cacheForStatus(result.status) }
    );
  }

  const redesigns = findLikelyRedesigns(result.frames, threshold).map((r) => ({
    fromDate: r.from.date,
    fromLabel: r.from.label,
    toDate: r.to.date,
    toLabel: r.to.label,
    score: r.score,
    headline: r.headline,
  }));

  return json(
    {
      domain,
      name: domainDisplayName(domain),
      status: 'ok',
      message: null,
      method: 'html-source',
      methodNote:
        'Palettes, logo candidates and change scores are derived from the archived HTML source, not from rendered screenshots. Colours set in external stylesheets are not visible, and a "logo" is the most logo-like image in the markup rather than a confirmed one.',
      threshold,
      analyzedCount: result.analyzedCount,
      frames: result.frames,
      redesigns,
    },
    // If nothing could be analysed the Archive was probably struggling; don't
    // pin an empty result at the edge for a day.
    { cache: cacheForStatus(result.analyzedCount > 0 ? 'ok' : 'unavailable') }
  );
};

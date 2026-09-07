/**
 * GET /api/evolution?url=<domain>&frames=<n>
 *
 * Resolves a domain's representative frames all the way to playable snapshots —
 * the data the evolution player needs before it can start.
 *
 * This is the one endpoint that deliberately does fan out: N availability
 * lookups, bounded to 5 in flight by `getSnapshots`. That's a few seconds on a
 * cold cache, which is why the *page* never blocks on it — the player renders
 * its shell instantly and fetches this once, behind a progress state.
 *
 * The cost is paid once per domain: the result is cached hard at the edge and
 * in memory, and identical concurrent requests are collapsed by `dedupe`, so a
 * burst of visitors to a popular timeline produces one upstream fan-out, not N.
 *
 * Frames whose lookup found nothing are kept in the response with
 * `available: false` rather than dropped. The player skips them, but the
 * timeline still needs them to draw an honest gap.
 */
import type { APIRoute } from 'astro';
import type { Snapshot } from '@lib/types';
import { getArchiveOverview } from '@services/archive-overview';
import { getSnapshots } from '@services/wayback';
import { toEmbeddableUrl } from '@services/screenshot';
import { dedupe } from '@services/cache';
import {
  normalizeDomain,
  isValidDomain,
  domainDisplayName,
} from '@utils/domain';
import { buildFrames, computeStats } from '@lib/history';
import { json, apiError, cacheForStatus, clampParam } from '@lib/api';

export const prerender = false;

/**
 * Playback frame counts. The ceiling is lower than the timeline's because each
 * frame here costs an upstream lookup — 40 is already a 40-request fan-out.
 */
const DEFAULT_FRAMES = 16;
const MIN_FRAMES = 2;
const MAX_FRAMES = 40;

/** Resolved evolution results are immutable; hold them for a full day. */
const TTL_MS = 24 * 60 * 60 * 1000;

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

  if (overview.status !== 'ok') {
    return json(
      {
        domain,
        name: domainDisplayName(domain),
        status: overview.status,
        message: overview.message,
        frames: [],
        playableCount: 0,
      },
      { cache: cacheForStatus(overview.status) }
    );
  }

  const frames = buildFrames(overview, frameCount);

  // One cache entry for the whole resolved sequence, keyed by domain + count,
  // so re-requesting the same playback is free and concurrent requests share
  // a single fan-out.
  const resolved = await dedupe<Snapshot[]>(
    `evolution:${domain}:${frameCount}`,
    () =>
      getSnapshots(
        domain,
        frames.map((f) => f.date)
      ),
    TTL_MS
  );

  const stats = computeStats(overview);
  const playable = frames.map((frame, i) => {
    const snapshot = resolved[i];
    const available = Boolean(snapshot?.available && snapshot.archivedUrl);
    return {
      year: frame.year,
      month: frame.month,
      date: frame.date,
      label: frame.label,
      captures: frame.captures,
      available,
      // The capture the Archive actually returned can sit days or weeks from
      // the date we asked for; surface it so the player can label honestly.
      capturedAt: snapshot?.capturedAt ?? null,
      archivedUrl: snapshot?.archivedUrl ?? null,
      embedUrl:
        available && snapshot.archivedUrl
          ? toEmbeddableUrl(snapshot.archivedUrl)
          : null,
    };
  });

  const playableCount = playable.filter((f) => f.available).length;

  return json(
    {
      domain,
      name: domainDisplayName(domain),
      status: 'ok',
      message: null,
      firstYear: stats.firstYear,
      lastYear: stats.lastYear,
      frames: playable,
      playableCount,
    },
    // If nothing resolved, the Archive was probably struggling — don't pin an
    // empty playback at the edge for a day.
    {
      cache:
        playableCount > 0
          ? cacheForStatus('ok')
          : cacheForStatus('unavailable'),
    }
  );
};

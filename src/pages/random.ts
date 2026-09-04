/**
 * GET /random — "take me somewhere on the web".
 *
 * Picks a curated site and a year from its archived history and sends the
 * visitor straight there. Modes narrow the roll:
 *
 *   /random                  any curated site, any plausible year
 *   /random?mode=early       an early-internet site, 1996-2003
 *   /random?mode=timeline    that site's full timeline
 *   /random?mode=evolution   that site's evolution playback
 *   /random?mode=compare     a comparison across its history
 *
 * This is an endpoint rather than a page because it renders nothing — it only
 * ever redirects. It is explicitly uncacheable: a cached "random" response
 * would send everyone to the same place, which defeats the whole feature.
 */
import type { APIRoute } from 'astro';
import { allCollectionSites, getCollection } from '@lib/collections';
import { domainToSlug } from '@utils/domain';
import { currentYear } from '@utils/date';
import { ARCHIVE_START_YEAR } from '@lib/constants';

export const prerender = false;

/** The last year the early-internet mode will roll. */
const EARLY_CEILING = 2003;

export const GET: APIRoute = ({ url, redirect }) => {
  const mode = url.searchParams.get('mode') ?? 'snapshot';

  /* The early mode draws from the early-internet collection, which is curated
     precisely for sites whose oldest captures are worth seeing. */
  const earlyCollection = getCollection('early-internet');
  const pool =
    mode === 'early' && earlyCollection
      ? earlyCollection.sites.map((s) => ({
          ...s,
          collection: 'early-internet',
        }))
      : allCollectionSites();

  const site = pool[Math.floor(Math.random() * pool.length)];
  const slug = domainToSlug(site.domain);

  /* Year selection. The curated `year` is a known-good capture year, so it acts
     as the floor; the ceiling stops a year short of now so a roll lands on
     something historical rather than the site as it is today. */
  const latest = currentYear() - 1;
  const floor = Math.max(ARCHIVE_START_YEAR, site.year);
  const ceiling = mode === 'early' ? Math.min(EARLY_CEILING, latest) : latest;
  const span = Math.max(1, Math.max(floor, ceiling) - floor + 1);
  const year = floor + Math.floor(Math.random() * span);

  /* Aim at mid-year: the availability lookup returns the closest capture, and
     the middle of a year can reach in both directions, so it lands on a real
     capture far more often than January 1st of a sparsely-crawled year. */
  const date = `${year}-06-15`;

  const destination =
    mode === 'timeline'
      ? `/timeline/${slug}`
      : mode === 'evolution'
        ? `/evolution/${slug}`
        : mode === 'compare'
          ? `/compare/${slug}/${floor}-06-15/${latest}-06-15`
          : `/site/${slug}/${date}`;

  const response = redirect(destination, 302);
  // Never let a CDN or a browser cache this. Every visit must roll again.
  response.headers.set('Cache-Control', 'no-store, max-age=0');
  return response;
};

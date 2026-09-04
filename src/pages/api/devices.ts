/**
 * GET /api/devices?url=<domain>
 *
 * Whether the archive holds captures of a separate mobile site for a domain,
 * and how its coverage compares with the desktop host.
 *
 * Returns "no mobile captures" honestly rather than presenting a desktop
 * capture at a narrow viewport as a mobile one — the archive stores what was
 * actually served, and most sites went responsive instead of building a
 * dedicated mobile host.
 *
 * Example: /api/devices?url=facebook.com
 */
import type { APIRoute } from 'astro';
import { getDeviceComparison } from '@services/design-evolution';
import {
  normalizeDomain,
  isValidDomain,
  domainDisplayName,
} from '@utils/domain';
import { json, apiError, CACHE_SUCCESS } from '@lib/api';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const domain = normalizeDomain(
    url.searchParams.get('url') ?? url.searchParams.get('domain') ?? ''
  );

  if (!isValidDomain(domain)) {
    return apiError(
      'invalid_domain',
      'Provide a valid ?url=, for example ?url=facebook.com',
      { status: 400 }
    );
  }

  const comparison = await getDeviceComparison(domain);

  return json(
    { name: domainDisplayName(domain), ...comparison },
    { cache: CACHE_SUCCESS }
  );
};

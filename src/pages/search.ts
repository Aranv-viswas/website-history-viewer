/**
 * GET /search — the form dispatcher.
 *
 * The SearchForm submits here with ?domain=&date=&compare=&dateB=. We normalize
 * and validate, then 302-redirect to the canonical destination so the address
 * bar shows clean, shareable URLs (/site/... or /compare). Running on-demand
 * (prerender = false) keeps this a cheap serverless redirect.
 */
import type { APIRoute } from 'astro';
import { normalizeDomain, isValidDomain, domainToSlug } from '@utils/domain';
import { isValidArchiveDate, todayISO, currentYear } from '@utils/date';

export const prerender = false;

const FALLBACK_DATE = `${currentYear() - 18}-01-01`;

export const GET: APIRoute = ({ url, redirect }) => {
  const params = url.searchParams;
  const domain = normalizeDomain(params.get('domain') ?? '');
  const date = params.get('date') ?? '';
  const dateBRaw = params.get('dateB') ?? '';
  const compare =
    params.get('compare') === '1' || params.get('compare') === 'on';

  if (!isValidDomain(domain)) {
    return redirect('/?error=invalid-domain', 302);
  }

  const safeDate = isValidArchiveDate(date) ? date : FALLBACK_DATE;

  if (compare) {
    const safeDateB = isValidArchiveDate(dateBRaw) ? dateBRaw : todayISO();
    // Send people straight to the canonical, shareable comparison URL rather
    // than to the query-string form (which would only 301 here anyway).
    return redirect(
      `/compare/${domainToSlug(domain)}/${safeDate}/${safeDateB}`,
      302
    );
  }

  return redirect(`/site/${domainToSlug(domain)}/${safeDate}`, 302);
};

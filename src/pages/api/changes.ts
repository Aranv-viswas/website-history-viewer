/**
 * GET /api/changes?url=<domain>&a=<date>&b=<date>
 *
 * What changed in the markup between two archived captures.
 *
 * Powers the "What changed" panel on a comparison page. It fetches and analyses
 * two archived HTML documents, so it costs a couple of seconds cold — the page
 * never blocks on it and loads it after render.
 *
 * Example: /api/changes?url=apple.com&a=1998-06-15&b=2024-06-15
 */
import type { APIRoute } from 'astro';
import {
  analyzeSnapshot,
  compareFingerprints,
  describeScore,
} from '@services/page-analysis';
import {
  normalizeDomain,
  isValidDomain,
  domainDisplayName,
} from '@utils/domain';
import { isValidArchiveDate } from '@utils/date';
import { json, apiError, CACHE_SUCCESS, CACHE_TRANSIENT } from '@lib/api';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const domain = normalizeDomain(
    url.searchParams.get('url') ?? url.searchParams.get('domain') ?? ''
  );
  const a = url.searchParams.get('a') ?? '';
  const b = url.searchParams.get('b') ?? '';

  if (!isValidDomain(domain)) {
    return apiError(
      'invalid_domain',
      'Provide a valid ?url=, e.g. google.com',
      {
        status: 400,
      }
    );
  }
  if (!isValidArchiveDate(a) || !isValidArchiveDate(b)) {
    return apiError(
      'invalid_date',
      'Provide two dates as ?a=YYYY-MM-DD&b=YYYY-MM-DD within the archive range.',
      { status: 400 }
    );
  }

  // Both analyses in parallel — they're independent, and each is internally
  // de-duplicated and cached for a day.
  const [fpA, fpB] = await Promise.all([
    analyzeSnapshot(domain, a),
    analyzeSnapshot(domain, b),
  ]);

  if (!fpA.ok || !fpB.ok) {
    return json(
      {
        domain,
        name: domainDisplayName(domain),
        status: 'unavailable',
        message: !fpA.ok ? fpA.message : fpB.message,
        // Say which side failed, so the UI can be specific rather than vague.
        failed: !fpA.ok && !fpB.ok ? 'both' : !fpA.ok ? 'a' : 'b',
        score: null,
        changes: [],
      },
      { cache: CACHE_TRANSIENT }
    );
  }

  const { score, changes } = compareFingerprints(fpA, fpB);
  const verdict = describeScore(score);

  return json(
    {
      domain,
      name: domainDisplayName(domain),
      status: 'ok',
      message: null,
      /* The method is part of the payload, not just the prose: any consumer of
         this endpoint should know it is reading a markup comparison. */
      method: 'html-source',
      methodNote:
        'Derived from the archived HTML source, not from rendered screenshots. A site can change its entire appearance in a stylesheet without changing its markup, and that would not appear here.',
      score,
      verdict: verdict.label,
      verdictDetail: verdict.detail,
      changes,
      a: {
        date: fpA.date,
        title: fpA.title,
        colors: fpA.colors,
        logo: fpA.logos[0] ?? null,
        usesTableLayout: fpA.usesTableLayout,
        usesFlash: fpA.usesFlash,
        isResponsive: fpA.isResponsive,
        bytes: fpA.bytes,
      },
      b: {
        date: fpB.date,
        title: fpB.title,
        colors: fpB.colors,
        logo: fpB.logos[0] ?? null,
        usesTableLayout: fpB.usesTableLayout,
        usesFlash: fpB.usesFlash,
        isResponsive: fpB.isResponsive,
        bytes: fpB.bytes,
      },
    },
    { cache: CACHE_SUCCESS }
  );
};

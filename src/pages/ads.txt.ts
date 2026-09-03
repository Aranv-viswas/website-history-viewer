/**
 * GET /ads.txt — authorized digital sellers, per the IAB ads.txt spec.
 *
 * AdSense checks this file and flags the account ("Earnings at risk") when the
 * publisher ID is missing. Generated from SITE.adsenseClient rather than kept
 * as a static file so it stays in step with the Auto ads tag in BaseLayout.
 */
import type { APIRoute } from 'astro';
import { SITE } from '@lib/constants';

export const prerender = true;

export const GET: APIRoute = () => {
  // Fields: <domain>, <publisher id>, <relationship>, <certification authority>.
  // f08c47fec0942fa0 is Google's TAG ID and is the same for every publisher.
  const publisherId = SITE.adsenseClient.replace(/^ca-/, '');
  const body = `google.com, ${publisherId}, DIRECT, f08c47fec0942fa0\n`;
  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};

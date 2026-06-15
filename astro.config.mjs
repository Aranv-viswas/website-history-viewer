// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';
import vercel from '@astrojs/vercel';
import tailwindcss from '@tailwindcss/vite';

// The public canonical URL of the deployed site.
// Override locally / on Vercel with the PUBLIC_SITE_URL env var.
const SITE_URL = process.env.PUBLIC_SITE_URL ?? 'https://websitehistoryviewer.com';

// https://astro.build/config
export default defineConfig({
  site: SITE_URL,

  // Static by default for maximum performance & SEO. Individual dynamic
  // routes opt into on-demand rendering with `export const prerender = false`.
  output: 'static',

  // Vercel adapter enables on-demand (SSR) routes and serverless API endpoints.
  adapter: vercel({
    imageService: true,
    webAnalytics: { enabled: false },
  }),

  integrations: [
    sitemap({
      // Featured evolution pages and the homepage are the SEO money pages.
      changefreq: 'weekly',
      priority: 0.7,
    }),
    mdx(),
  ],

  image: {
    // Allow Astro's <Image /> to optimize archived assets when we have them.
    domains: ['web.archive.org', 'archive.org', 'images.weserv.nl'],
    remotePatterns: [{ protocol: 'https' }],
  },

  vite: {
    // Cast via JSDoc: Astro bundles its own Vite copy, so the plugin's Vite
    // types don't structurally match Astro's. Harmless at runtime.
    plugins: [/** @type {any} */ (tailwindcss())],
  },

  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'viewport',
  },
});

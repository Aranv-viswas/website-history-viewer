# Website History Viewer

> See what any website looked like in the past. Travel through internet history with archived screenshots from the Internet Archive Wayback Machine, and compare versions side by side.

A production-ready [Astro](https://astro.build) site built for SEO traffic around queries like _"what did youtube look like in 2008"_, _"old google homepage"_, and _"facebook first version"_.

---

## ✨ Features

- **Snapshot viewer** — enter any domain + date and see the closest Wayback capture (`/site/[domain]/[date]`).
- **Side-by-side & slider comparison** — compare two dates of the same site (`/compare`), with a CSS-only mode switch and a draggable before/after slider.
- **Generated timelines** — a year-by-year visual history of any domain (`/timeline/[domain]`).
- **Featured evolution pages** — long-form, SEO-optimized design histories (`/google-history`, `/youtube-history`, `/facebook-history`, `/amazon-history`, `/reddit-history`) powered by Content Collections.
- **Full SEO** — dynamic titles & descriptions, Open Graph + Twitter cards, canonical URLs, JSON-LD (WebSite, Article, BreadcrumbList, FAQ), generated sitemap and `robots.txt`.
- **Dark mode**, mobile-first responsive design, and **near-zero client JavaScript** (only a theme toggle, a copy-link button, the comparison slider, and a "recently viewed" reader).
- **JSON API** — `GET /api/snapshot?domain=…&date=…`.

## 🧱 Tech stack

| Concern        | Choice                                              |
| -------------- | --------------------------------------------------- |
| Framework      | Astro 5 (static output + on-demand routes)          |
| Styling        | Tailwind CSS v4 (CSS-first config via `@theme`)     |
| Language       | TypeScript (strict)                                 |
| Content        | Astro Content Collections (MDX, Content Layer API)  |
| Data source    | Internet Archive Wayback **Availability API**       |
| Deployment     | Vercel (`@astrojs/vercel` adapter)                  |

## 📁 Project structure

```text
src/
├─ components/      UI: Header, Footer, SEO, SearchForm, ScreenshotFrame,
│                   ComparisonView, Timeline, ExampleCard, ShareButtons
├─ content/
│  └─ histories/    MDX featured-evolution entries (google, youtube, …)
├─ layouts/         BaseLayout (HTML shell, head, theme script)
├─ lib/             types.ts, constants.ts, seo.ts
├─ pages/
│  ├─ index.astro                 Homepage
│  ├─ search.ts                   Form dispatcher (302 → canonical URL)
│  ├─ compare.astro               Side-by-side / slider comparison
│  ├─ histories.astro             Index of featured histories
│  ├─ [history].astro             /google-history etc. (static)
│  ├─ site/[domain]/[date].astro  Snapshot viewer (on-demand)
│  ├─ timeline/[domain].astro     Generated timeline (on-demand)
│  ├─ api/snapshot.ts             JSON API (on-demand)
│  ├─ robots.txt.ts               Generated robots.txt
│  └─ 404.astro
├─ services/        wayback.ts (API), screenshot.ts (provider abstraction),
│                   cache.ts (TTL memoization)
├─ styles/          global.css (Tailwind v4 + design tokens)
└─ utils/           domain.ts, date.ts
src/content.config.ts             Content collection schema
```

## 🚀 Getting started

**Prerequisites:** Node.js 18.20+ (Node 20+ recommended) and npm.

```bash
# 1. Install dependencies
npm install

# 2. (optional) configure your site URL
cp .env.example .env          # then edit PUBLIC_SITE_URL

# 3. Start the dev server
npm run dev                   # http://localhost:4321

# 4. Type-check and build for production
npm run build

# 5. Preview is via `vercel dev` (the Vercel adapter targets serverless)
```

### Scripts

| Script           | Description                                  |
| ---------------- | -------------------------------------------- |
| `npm run dev`    | Start the local dev server                   |
| `npm run build`  | `astro check` (type-check) then `astro build`|
| `npm run format` | Format with Prettier                         |

## 🔧 Environment variables

| Variable          | Required | Default                              | Purpose                                              |
| ----------------- | -------- | ------------------------------------ | ---------------------------------------------------- |
| `PUBLIC_SITE_URL` | No       | `https://websitehistoryviewer.com`   | Canonical URL for SEO, sitemap, OG tags, `robots.txt`|
| `SCREENSHOT_PROVIDER` | No   | `placeholder`                        | Which screenshot strategy to use (see below)         |

> ⚠️ Update `PUBLIC_SITE_URL` to your real domain before going live — it drives canonical/OG URLs.

## 🏛️ How it works

### Rendering model

The site uses `output: 'static'` so the homepage, `/histories`, and the five
featured `*-history` pages are **prerendered** for maximum performance and SEO.
Routes whose input space is effectively infinite are rendered **on-demand**
(`export const prerender = false`): the snapshot viewer, comparison, timeline,
the `/search` dispatcher, the API, plus everything served by the Vercel adapter.

### Wayback service — `src/services/wayback.ts`

```ts
getSnapshot(domain: string, date: string): Promise<Snapshot>
```

Queries the [Availability API](https://archive.org/wayback/available?url=google.com&timestamp=20100101),
normalizes the loose response into a typed `Snapshot`, and **gracefully handles**
missing snapshots, timeouts (8s), HTTP 429 rate limits, and network failures —
each returns a friendly `message` instead of throwing. Results are memoized via
`services/cache.ts` (in-memory TTL cache; swap in KV/Redis without touching call sites).

### Screenshot service — `src/services/screenshot.ts`

```ts
getWebsiteScreenshot(snapshotUrl: string | null): Promise<Screenshot>
```

A **provider abstraction**. Today the default `placeholder` provider embeds the
archived page in a sandboxed `<iframe>` (using Wayback's toolbar-free `if_`
variant) over a generated SVG poster, so previews never render empty and iframe
restrictions degrade gracefully (an "Open on Wayback" link is always shown).

To add **real PNG screenshots** later, implement one of the stubbed providers
(`playwright`, `puppeteer`, `cache`) in `screenshot.ts` — render `snapshotUrl`,
write the PNG to `public/cache/`, return `{ imageUrl, useIframe: false }` — then
set `SCREENSHOT_PROVIDER` accordingly. No UI changes are required; `ScreenshotFrame`
already prefers `imageUrl` when present. `services/cache.ts` exposes
`cacheInvalidate` / `cacheInvalidatePrefix` for cache invalidation.

### Content Collections

Featured histories live in `src/content/histories/*.mdx` and are validated by
the schema in `src/content.config.ts` (title, description, milestones, FAQs,
timeline range, …). The MDX body holds the long-form design-evolution analysis,
rendered as Tailwind `prose`. Add a new featured page by dropping in a new
`.mdx` file — it automatically gets a `/{id}-history` page, a sitemap entry, and
a homepage card.

## 🖼️ Open Graph image note

The default social card is shipped as a raster PNG at `public/og/default.png`
(1200×630), because X, Facebook, LinkedIn, Slack, and iMessage all reject SVG as
an `og:image`. `public/og/default.svg` is kept as the editable source — after
editing it, regenerate the PNG with:

```sh
node -e "const sharp=require('sharp'),fs=require('fs');sharp(fs.readFileSync('public/og/default.svg'),{density:200}).resize(1200,630).png().toFile('public/og/default.png')"
```

For per-snapshot social cards that show the actual archived page, configure a
screenshot service via `SCREENSHOT_API_URL` (see `.env.example`); the
`/site/[domain]/[date]` pages then set `og:image` to the rendered capture and
fall back to this default when unconfigured. For fully generated per-page cards,
[`astro-og-canvas`](https://github.com/delucis/astro-og-canvas) or
[`@vercel/og`](https://vercel.com/docs/og-image-generation) are good upgrades.

## ▲ Deploy to Vercel

This project targets Vercel out of the box via `@astrojs/vercel`.

### Option A — Git integration (recommended)

1. Push this repo to GitHub/GitLab/Bitbucket.
2. In the [Vercel dashboard](https://vercel.com/new), **Import** the repo.
3. Vercel auto-detects Astro — leave the defaults:
   - **Build command:** `npm run build`
   - **Output:** handled by the adapter (`.vercel/output`)
4. Add environment variable **`PUBLIC_SITE_URL`** = your production URL
   (e.g. `https://your-domain.com`).
5. **Deploy.** Every push to the default branch ships to production; PRs get
   preview deployments.

### Option B — Vercel CLI

```bash
npm i -g vercel
vercel            # first run links/creates the project (preview deploy)
vercel --prod     # promote to production
```

Set the env var once via the CLI:

```bash
vercel env add PUBLIC_SITE_URL production
```

> The adapter produces serverless functions for the on-demand routes
> (`/site/*`, `/compare`, `/timeline/*`, `/search`, `/api/*`) and static assets
> for everything else. No `vercel.json` is required.

## ⚡ Performance

- Static prerendering for money pages; minimal client JS (the theme toggle, copy
  button, slider, and recently-viewed reader are a single ~1 KB gzipped bundle).
- `loading="lazy"` previews, fixed aspect ratios to avoid layout shift (CLS),
  font `display=swap`, and `preconnect` to the archive hosts.
- `prefetch` enabled (viewport strategy) for instant navigations.

## 🙏 Credits

Snapshot data courtesy of the [Internet Archive](https://archive.org) Wayback
Machine. This is an independent project and is not affiliated with the Internet
Archive.

## 📄 License

MIT — see below. Provided as a starting point; review the Internet Archive's
[terms of use](https://archive.org/about/terms.php) before heavy automated use.

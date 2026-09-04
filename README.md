# Website History Viewer

> See what any website looked like in the past. Travel through internet history with archived screenshots from the Internet Archive Wayback Machine, and compare versions side by side.

A production-ready [Astro](https://astro.build) site built for SEO traffic around queries like _"what did youtube look like in 2008"_, _"old google homepage"_, and _"facebook first version"_.

---

## ✨ Features

The product is built around three flagship experiences — **see the history, see what changed, watch it transform** — with everything else supporting them.

### Timeline — see the history

- **Interactive timeline** (`/timeline/[domain]`) — a proportional horizontal axis of every month the Internet Archive holds captures for, with log-scaled density bars, zoom, keyboard navigation, and gaps left visibly as gaps.
- **History statistics** — first and latest archived snapshot, years spanned, capture count, archive coverage, busiest month.
- **Lazy snapshot thumbnails** — previews resolve and mount only as they scroll into view, under hard budgets on live iframes and in-flight lookups.

### Compare — see what changed

- **Shareable comparison URLs** — `/compare/[domain]/[a]/[b]` (a bare year works too: `/compare/google.com/2000/2026`).
- **Before/after slider** — a real slider: Pointer Events for mouse, touch and pen, pointer capture, `role="slider"` with full keyboard support.
- **"What changed" analysis** — a markup-level comparison of the two captures: layout technique, navigation, structure, declared colours, logo image, mobile-readiness.

### Evolution — watch it transform

- **Playback** (`/evolution/[domain]`) — play, pause, step, scrub, four speeds and looping, over representative snapshots spread across the whole history. Frames the archive has no capture for are skipped, not hidden.

### Discovery

- **Explore** (`/explore`) — debounced live domain lookup plus a filterable curated roster.
- **Collections** (`/collections`, `/collection/[slug]`) — six hand-curated themes.
- **On This Day** (`/on-this-day`) — the same calendar date across earlier years, deterministic per date so a shared link shows the same thing.
- **Random** (`/random`) — with `?mode=early|timeline|evolution|compare`.

### Analysis

- **Design history** (`/design/[domain]`) — logo candidates, colour palettes, era markers and likely-redesign detection.
- **Mobile vs desktop** — detects whether a dedicated mobile host (`m.`, `mobile.`, `touch.`, `wap.`) was actually archived.
- **Printable report** (`/report/[domain]`) — a complete report that prints to PDF via the browser, plus a JSON download.

### Foundations

- **Full SEO** — dynamic titles & descriptions, Open Graph + Twitter cards, canonical URLs, JSON-LD (WebSite, Article, BreadcrumbList, FAQ, ItemList), generated sitemap and `robots.txt`.
- **Five locales** (en, es, fr, de, hi) with hreflang alternates.
- **Dark mode**, mobile-first responsive design, and minimal client JavaScript.
- **JSON API** — see below.

## 📡 JSON API

All endpoints are on-demand, edge-cached, CORS-open, and return `200` with a described `status` for "valid question, no data" cases (a blocked or unarchived domain is an answer, not an HTTP failure). Only a malformed request returns `400`.

| Endpoint                                            | Purpose                                                       |
| --------------------------------------------------- | ------------------------------------------------------------- |
| `GET /api/snapshot?domain=&date=`                   | One resolved capture.                                         |
| `GET /api/stats?url=`                               | Headline numbers only — small enough for a search box.        |
| `GET /api/history?url=&frames=`                     | Full history: stats, per-year density, representative frames. |
| `GET /api/evolution?url=&frames=`                   | Representative frames resolved to playable snapshots.         |
| `GET /api/changes?url=&a=&b=`                       | Markup comparison of two captures.                            |
| `GET /api/design-evolution?url=&frames=&threshold=` | Palette, logo and redesign detection over time.               |
| `GET /api/devices?url=`                             | Whether a separate mobile site was archived.                  |

## ⚠️ What the analysis can and cannot claim

This matters enough to state plainly, because the interface would otherwise imply more than the method delivers.

**There is no screenshot renderer.** Previews are live, sandboxed `<iframe>` embeds of the Wayback Machine, and a browser will never let a page read pixels from another origin. So there is no pixel-level visual diff, no image export, and no GIF/video export. (The `screenshot.ts` provider seam exists for a rendering service to be plugged in later — set `SCREENSHOT_API_URL` and the previews, social cards and thumbnails all upgrade to real images automatically.)

**What is analysed instead is the archived HTML source**, which the Wayback Machine serves verbatim via its `id_` modifier. That answers most of the interesting questions honestly:

- **Colours** are the ones the markup _declares_ — hex literals, `rgb()`, and the old `bgcolor`/`text`/`link` attributes. A palette living entirely in an external stylesheet is invisible to it.
- **Logos** are the most logo-like image in the markup, scored on filename, alt text, declared size and position. A candidate, not a confirmed logo.
- **Redesigns** are large jumps in markup structure between two captures. A site can change its entire appearance in a stylesheet without touching its HTML, and this method would not see it. The threshold is configurable (`?threshold=`).
- **"Years worth a look"** on a timeline measure _crawl volume_, not the pages — the Archive crawls harder when a site is newsworthy, which often but not always coincides with a relaunch.

Every one of these caveats is surfaced in the UI, not just here.

**Statistics describe the archive's holdings, never the website's own history.** A site can be far older than its first capture. The wording throughout is "first archived snapshot found", never "launched".

## 🧱 Tech stack

| Concern     | Choice                                                    |
| ----------- | --------------------------------------------------------- |
| Framework   | Astro 5 (static output + on-demand routes)                |
| Styling     | Tailwind CSS v4 (CSS-first config via `@theme`)           |
| Language    | TypeScript (strict)                                       |
| Content     | Astro Content Collections (MDX, Content Layer API)        |
| Data source | Internet Archive (sparkline, availability, archived HTML) |
| Deployment  | Cloudflare Workers (`@astrojs/cloudflare` adapter)        |

## 📁 Project structure

```text
src/
├─ components/      UI: Header, Footer, SEO, SearchForm, ScreenshotFrame,
│                   ComparisonView, HistoryTimeline, HistoryStats,
│                   SnapshotThumb, EvolutionPlayer, ChangeAnalysis,
│                   FullscreenSupport, Analytics, ShareButtons, ExampleCard
├─ content/
│  └─ histories/    MDX featured-evolution entries (google, youtube, …)
├─ i18n/            ui.ts (chrome strings), content.*.ts (page copy), utils.ts
├─ layouts/         BaseLayout (HTML shell, head, theme script)
├─ lib/             types.ts, constants.ts, seo.ts, api.ts,
│                   history.ts (pure stats/sampling), collections.ts
├─ pages/
│  ├─ index.astro                     Homepage
│  ├─ search.ts                       Form dispatcher (302 → canonical URL)
│  ├─ explore.astro                   Search & discovery (static)
│  ├─ collections.astro               Collection index (static)
│  ├─ collection/[slug].astro         One collection (static, getStaticPaths)
│  ├─ on-this-day.astro               Same date, earlier years (on-demand)
│  ├─ random.ts                       Random explorer (redirect only)
│  ├─ compare.astro                   Landing + 301 to the canonical form
│  ├─ compare/[domain]/[a]/[b].astro  The comparison (on-demand)
│  ├─ site/[domain]/[date].astro      Snapshot viewer (on-demand)
│  ├─ timeline/[domain].astro         Interactive timeline (on-demand)
│  ├─ evolution/[domain].astro        Playback (on-demand)
│  ├─ design/[domain].astro           Design history (on-demand)
│  ├─ report/[domain].astro           Printable report (on-demand)
│  ├─ histories.astro                 Index of featured histories
│  ├─ [history].astro                 /google-history etc. (static)
│  ├─ api/                            snapshot, stats, history, evolution,
│  │                                  changes, design-evolution, devices
│  ├─ sitemap.xml.ts, robots.txt.ts, ads.txt.ts
│  └─ 404.astro, 500.astro
├─ services/        archive-overview.ts  fast per-month density + stats
│                   wayback.ts           availability API (one date → capture)
│                   page-analysis.ts     archived-HTML fingerprint + diff
│                   design-evolution.ts  palette/logo/redesign sequences
│                   screenshot.ts        preview provider abstraction
│                   cache.ts             TTL memoization + in-flight dedupe
├─ styles/          global.css (Tailwind v4 + design tokens)
└─ utils/           domain.ts, date.ts
src/content.config.ts                    Content collection schema
```

## 🗄️ Data sources and why

Three different Internet Archive endpoints do three different jobs. The split is
driven by measured latency, not preference:

| Source                           | Measured                                    | Role                                                                                                                                                                            |
| -------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `web.archive.org/__wb/sparkline` | ~0.7–5s, reliable                           | **Primary.** Per-month capture counts, exact first/last timestamps, and explicit `blocked` / `not archived` signals. Everything on a timeline is built from one of these calls. |
| `archive.org/wayback/available`  | fast, occasionally empty                    | Resolve one date to one capture.                                                                                                                                                |
| `web.archive.org/web/<ts>id_/…`  | ~2s                                         | The original archived HTML, for markup analysis.                                                                                                                                |
| `web.archive.org/cdx/search/cdx` | **20–45s, 403/503 under light concurrency** | Deliberately **unused**. It is the obvious choice for a capture index and it cannot be put on a render path.                                                                    |

The sparkline endpoint is what makes a rich timeline cheap: one sub-second call
returns the whole shape of a domain's history, so `/timeline/[domain]` costs one
upstream request no matter how long that history is.

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

| Script           | Description                                   |
| ---------------- | --------------------------------------------- |
| `npm run dev`    | Start the local dev server                    |
| `npm run build`  | `astro check` (type-check) then `astro build` |
| `npm run format` | Format with Prettier                          |

## 🔧 Environment variables

| Variable              | Required | Default                            | Purpose                                               |
| --------------------- | -------- | ---------------------------------- | ----------------------------------------------------- |
| `PUBLIC_SITE_URL`     | No       | `https://websitehistoryviewer.com` | Canonical URL for SEO, sitemap, OG tags, `robots.txt` |
| `SCREENSHOT_PROVIDER` | No       | `placeholder`                      | Which screenshot strategy to use (see below)          |

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

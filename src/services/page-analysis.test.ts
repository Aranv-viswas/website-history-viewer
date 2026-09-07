import { describe, it, expect } from 'vitest';
import {
  extractColors,
  extractLogoCandidates,
  fingerprintHtml,
  compareFingerprints,
  describeScore,
} from './page-analysis';

const META = {
  domain: 'example.com',
  timestamp: '20050615120000',
  date: '2005-06-15',
  originalUrl: 'http://www.example.com/',
};

/** A page written the way pages were written before CSS layout. */
const TABLE_ERA = `<html><head><title>Example Corp</title></head>
<body bgcolor="#003366" text="#FFFFFF" link="#FFCC00">
<table width="100%"><tr><td>
  <img src="/images/logo.gif" alt="Example Corp Logo" width="200" height="60">
  <img src="/images/spacer.gif" width="1" height="1">
</td></tr></table>
<table><tr><td>
  <div id="nav"><a href="/">Home</a><a href="/about">About</a><a href="/products">Products</a></div>
</td></tr></table>
<table><tr><td><font color="#003366">Welcome</font></td></tr></table>
<embed src="intro.swf">
</body></html>`;

/** The same site, rebuilt in the modern idiom. */
const MODERN_ERA = `<html><head>
<title>Example</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="Example, modernised.">
<link rel="stylesheet" href="/app.css">
</head>
<body>
<header><img src="/assets/logo.svg" alt="Example" width="140" height="40">
<nav><a href="/">Home</a><a href="/pricing">Pricing</a><a href="/docs">Docs</a><a href="/blog">Blog</a></nav>
</header>
<main>
<div class="hero"><h1>Hello</h1><p style="color:#0a7d55">Modern</p></div>
<div class="grid"><div><h2>One</h2></div><div><h2>Two</h2></div></div>
<form><input name="email"></form>
</main>
<footer><a href="/legal">Legal</a></footer>
<script src="/app.js"></script>
</body></html>`;

describe('extractColors', () => {
  it('reads presentational colour attributes from early markup', () => {
    const colors = extractColors(TABLE_ERA);
    const hexes = colors.map((c) => c.hex);
    expect(hexes).toContain('#003366');
  });

  it('expands three-digit hex shorthand so it can be compared', () => {
    const colors = extractColors('<p style="color:#0f0">hi</p>');
    expect(colors.map((c) => c.hex)).toContain('#00ff00');
  });

  it('reads rgb() values', () => {
    const colors = extractColors('<p style="color: rgb(10, 125, 85)">x</p>');
    expect(colors.map((c) => c.hex)).toContain('#0a7d55');
  });

  it('maps the named colours common in early HTML', () => {
    const colors = extractColors('<body bgcolor="navy" text="white">');
    expect(colors.map((c) => c.hex)).toContain('#000080');
  });

  it('merges near-identical shades instead of listing six of one blue', () => {
    const html = `<p style="color:#0070f3">a</p><p style="color:#0071f4">b</p>
      <p style="color:#0072f5">c</p><p style="color:#cc3300">d</p>`;
    const colors = extractColors(html);
    const blues = colors.filter((c) => c.hex.startsWith('#00'));
    expect(blues.length).toBeLessThanOrEqual(1);
  });

  it('returns an empty palette rather than throwing on colourless markup', () => {
    expect(extractColors('<p>plain</p>')).toEqual([]);
  });

  it('respects the requested limit', () => {
    const html = Array.from(
      { length: 30 },
      (_, i) =>
        `<p style="color:#${(i * 8).toString(16).padStart(2, '0')}00ff">x</p>`
    ).join('');
    expect(extractColors(html, 4).length).toBeLessThanOrEqual(4);
  });
});

describe('extractLogoCandidates', () => {
  it('prefers an image that looks like a logo', () => {
    const logos = extractLogoCandidates(
      TABLE_ERA,
      META.timestamp,
      META.originalUrl
    );
    expect(logos[0].url).toContain('logo.gif');
  });

  it('rewrites the source to an archived image URL', () => {
    const logos = extractLogoCandidates(
      TABLE_ERA,
      META.timestamp,
      META.originalUrl
    );
    expect(logos[0].url).toBe(
      'https://web.archive.org/web/20050615120000im_/http://www.example.com/images/logo.gif'
    );
  });

  it('rejects spacer GIFs even when they appear first', () => {
    const html =
      '<img src="/spacer.gif" width="1" height="1">' +
      '<img src="/brand-mark.png" alt="Brand" width="180" height="50">';
    const logos = extractLogoCandidates(html, META.timestamp, META.originalUrl);
    expect(logos[0].url).toContain('brand-mark.png');
    expect(logos.some((l) => l.url.includes('spacer'))).toBe(false);
  });

  it('ignores data URIs and empty sources', () => {
    const html = '<img src="data:image/gif;base64,AAA" alt="logo"><img src="">';
    expect(
      extractLogoCandidates(html, META.timestamp, META.originalUrl)
    ).toEqual([]);
  });

  it('returns nothing when the page has no images', () => {
    expect(
      extractLogoCandidates(
        '<p>no images</p>',
        META.timestamp,
        META.originalUrl
      )
    ).toEqual([]);
  });
});

describe('fingerprintHtml', () => {
  it('recognises the table-layout era', () => {
    const fp = fingerprintHtml(TABLE_ERA, META);
    expect(fp.usesTableLayout).toBe(true);
    expect(fp.semanticTags).toBe(0);
    expect(fp.usesFlash).toBe(true);
    expect(fp.isResponsive).toBe(false);
    expect(fp.title).toBe('Example Corp');
  });

  it('recognises modern, responsive, semantic markup', () => {
    const fp = fingerprintHtml(MODERN_ERA, META);
    expect(fp.usesTableLayout).toBe(false);
    expect(fp.semanticTags).toBeGreaterThan(0);
    expect(fp.hasViewportMeta).toBe(true);
    expect(fp.isResponsive).toBe(true);
    expect(fp.description).toBe('Example, modernised.');
  });

  it('extracts navigation labels', () => {
    const fp = fingerprintHtml(MODERN_ERA, META);
    expect(fp.navLinks).toContain('Home');
    expect(fp.navLinks).toContain('Pricing');
  });

  it('detects framesets', () => {
    const fp = fingerprintHtml(
      '<frameset rows="80,*"><frame src="top.html"></frameset>',
      META
    );
    expect(fp.usesFrames).toBe(true);
  });

  it('survives malformed markup without throwing', () => {
    expect(() =>
      fingerprintHtml('<html><body><p>unclosed <div <<>>', META)
    ).not.toThrow();
  });

  it('handles an empty document', () => {
    const fp = fingerprintHtml('', META);
    expect(fp.ok).toBe(true);
    expect(fp.links).toBe(0);
    expect(fp.colors).toEqual([]);
  });
});

describe('compareFingerprints', () => {
  const oldFp = fingerprintHtml(TABLE_ERA, META);
  const newFp = fingerprintHtml(MODERN_ERA, {
    ...META,
    timestamp: '20240615120000',
    date: '2024-06-15',
  });

  it('scores a full rebuild highly', () => {
    const { score, changes } = compareFingerprints(oldFp, newFp);
    expect(score).toBeGreaterThanOrEqual(70);
    expect(changes.length).toBeGreaterThan(0);
  });

  it('names the layout-technique change, the strongest signal there is', () => {
    const { changes } = compareFingerprints(oldFp, newFp);
    expect(changes.some((c) => c.kind === 'layout')).toBe(true);
  });

  it('notices the move to mobile-ready markup', () => {
    const { changes } = compareFingerprints(oldFp, newFp);
    const mobile = changes.find((c) => c.kind === 'mobile');
    expect(mobile?.summary).toContain('mobile-ready');
  });

  it('scores an identical page at zero', () => {
    const { score, changes } = compareFingerprints(oldFp, oldFp);
    expect(score).toBe(0);
    expect(changes).toEqual([]);
  });

  it('keeps routine content churn well below a rebuild', () => {
    // Same template, different headlines and one extra story — what a news
    // site looks like from one day to the next.
    const day1 = fingerprintHtml(
      `<html><head><title>Daily News</title>
       <meta name="viewport" content="width=device-width"></head><body>
       <header><nav><a href="/">Home</a><a href="/world">World</a><a href="/tech">Tech</a></nav></header>
       <main><h1>Markets rally</h1><h2>Storm warning</h2>
       <a href="/a">a</a><a href="/b">b</a><a href="/c">c</a>
       <div><div><div></div></div></div></main></body></html>`,
      META
    );
    const day2 = fingerprintHtml(
      `<html><head><title>Daily News</title>
       <meta name="viewport" content="width=device-width"></head><body>
       <header><nav><a href="/">Home</a><a href="/world">World</a><a href="/tech">Tech</a></nav></header>
       <main><h1>Talks collapse</h1><h2>Heatwave continues</h2>
       <a href="/d">d</a><a href="/e">e</a><a href="/f">f</a>
       <div><div><div></div></div></div></main></body></html>`,
      META
    );

    const { score } = compareFingerprints(day1, day2);
    expect(score).toBeLessThan(40);
  });

  it('returns a zero score when either side could not be analysed', () => {
    const broken = { ...oldFp, ok: false };
    expect(compareFingerprints(broken, newFp).score).toBe(0);
    expect(compareFingerprints(oldFp, broken).score).toBe(0);
  });

  it('never exceeds the 0-100 range', () => {
    const { score } = compareFingerprints(oldFp, newFp);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});

describe('describeScore', () => {
  it('escalates its wording with the score', () => {
    expect(describeScore(5).label).toBe('Structurally similar');
    expect(describeScore(25).label).toBe('Moderately changed');
    expect(describeScore(50).label).toBe('Substantially changed');
    expect(describeScore(85).label).toBe('Heavily rebuilt');
  });

  it('always hedges — a stylesheet change is invisible to this method', () => {
    for (const score of [0, 20, 50, 90]) {
      const { detail } = describeScore(score);
      expect(detail.length).toBeGreaterThan(20);
    }
    expect(describeScore(5).detail).toContain('stylesheet');
  });
});

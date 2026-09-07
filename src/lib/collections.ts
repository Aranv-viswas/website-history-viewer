/**
 * Curated collections of websites worth looking at across time.
 *
 * These are hand-picked rather than generated: the point is editorial — sites
 * whose archived history actually shows something (a visible redesign arc, a
 * vanished era of the web, a company that reinvented itself). A generated list
 * would mostly surface whatever is popular today, which is the opposite of
 * interesting here.
 *
 * Adding a collection is deliberately a one-object edit: append to
 * `COLLECTIONS` and it appears on /collections, gets its own /collection/<slug>
 * page, and enters the sitemap automatically. Every site listed must be a real
 * domain the Wayback Machine covers — the pages resolve captures live, so a
 * wrong domain shows as an empty state rather than failing loudly.
 */

import type { Collection } from './types';

export const COLLECTIONS: Collection[] = [
  {
    slug: 'early-internet',
    title: 'The Early Internet',
    description:
      'The sites that defined the web before broadband — tables, tiled backgrounds and all.',
    emoji: '🌐',
    intro:
      'Before CSS layouts, before mobile, before the web had settled on what a website even was. These sites were the internet for millions of people, and their earliest captures are a genuine time capsule of how the web looked when almost nobody knew what they were doing yet.',
    sites: [
      {
        domain: 'google.com',
        name: 'Google',
        year: 1998,
        note: 'A search box, two buttons, and a note that the site was still in beta.',
      },
      {
        domain: 'yahoo.com',
        name: 'Yahoo',
        year: 1996,
        note: 'A hand-curated directory of the web, back when that was still possible.',
      },
      {
        domain: 'amazon.com',
        name: 'Amazon',
        year: 1999,
        note: 'Still describing itself as an online bookstore.',
      },
      {
        domain: 'ebay.com',
        name: 'eBay',
        year: 1999,
        note: 'The auction site that convinced people to send money to strangers.',
      },
      {
        domain: 'geocities.com',
        name: 'GeoCities',
        year: 1999,
        note: 'Free homepages organised into themed "neighbourhoods". The web as a hobby.',
      },
      {
        domain: 'altavista.com',
        name: 'AltaVista',
        year: 1998,
        note: 'The search engine everyone used before Google, and a portal by the end.',
      },
      {
        domain: 'aol.com',
        name: 'AOL',
        year: 1998,
        note: 'For a lot of people, this page was the internet.',
      },
      {
        domain: 'netscape.com',
        name: 'Netscape',
        year: 1997,
        note: 'The browser company at the centre of the first browser war.',
      },
    ],
  },
  {
    slug: 'social-media-evolution',
    title: 'Social Media Evolution',
    description:
      'How the social web went from novelty to infrastructure, one redesign at a time.',
    emoji: '💬',
    intro:
      'Social platforms redesign more aggressively than almost any other category, and the archive caught most of it. Watching these back to back shows the whole arc: dense information-rich pages giving way to infinite feeds, then to video, then to whatever we are calling the current era.',
    sites: [
      {
        domain: 'facebook.com',
        name: 'Facebook',
        year: 2005,
        note: 'When it was still thefacebook and you needed a university email address.',
      },
      {
        domain: 'twitter.com',
        name: 'Twitter',
        year: 2007,
        note: 'Before the rebrand to X — and before anyone had worked out what it was for.',
      },
      {
        domain: 'myspace.com',
        name: 'MySpace',
        year: 2006,
        note: 'Customisable profiles, autoplaying music, and a top 8 that ruined friendships.',
      },
      {
        domain: 'instagram.com',
        name: 'Instagram',
        year: 2012,
        note: 'A square-photo app that spent years insisting it was not a website.',
      },
      {
        domain: 'youtube.com',
        name: 'YouTube',
        year: 2005,
        note: 'Launch-era YouTube, when the whole site fitted above the fold.',
      },
      {
        domain: 'linkedin.com',
        name: 'LinkedIn',
        year: 2004,
        note: 'The professional network, back when it was mostly a résumé you could not print.',
      },
      {
        domain: 'reddit.com',
        name: 'Reddit',
        year: 2006,
        note: 'Blue links on white. The design barely moved for a decade, then moved a lot.',
      },
      {
        domain: 'tumblr.com',
        name: 'Tumblr',
        year: 2008,
        note: 'Short-form blogging that became its own visual language.',
      },
    ],
  },
  {
    slug: 'technology-companies',
    title: 'Technology Companies',
    description:
      'The companies that build the web, and how they present themselves to it.',
    emoji: '⚙️',
    intro:
      'Tech company homepages are marketing documents, and they change whenever the strategy does. These histories track a specific thing: the moment each company stopped selling a product and started selling a platform — and, for several of them, the moment they changed their name.',
    sites: [
      {
        domain: 'apple.com',
        name: 'Apple',
        year: 1998,
        note: 'The candy-coloured iMac era, when Apple was a comeback story.',
      },
      {
        domain: 'microsoft.com',
        name: 'Microsoft',
        year: 1997,
        note: 'Dense, link-heavy, and unmistakably of the Windows 95 era.',
      },
      {
        domain: 'google.com',
        name: 'Google',
        year: 2000,
        note: 'The homepage that refused to become a portal.',
      },
      {
        domain: 'ibm.com',
        name: 'IBM',
        year: 1996,
        note: 'One of the very first corporate websites, and it looks it.',
      },
      {
        domain: 'adobe.com',
        name: 'Adobe',
        year: 1998,
        note: 'Boxed software, then a subscription. The site tells that story.',
      },
      {
        domain: 'nvidia.com',
        name: 'NVIDIA',
        year: 1999,
        note: 'A graphics-card company long before it was an AI company.',
      },
      {
        domain: 'netflix.com',
        name: 'Netflix',
        year: 1999,
        note: 'DVDs by post, with a queue you managed on the website.',
      },
      {
        domain: 'mozilla.org',
        name: 'Mozilla',
        year: 2002,
        note: 'The open-source project that grew out of Netscape.',
      },
    ],
  },
  {
    slug: 'web-design-evolution',
    title: 'Web Design Evolution',
    description:
      'Sites whose redesigns map neatly onto the eras of web design itself.',
    emoji: '🎨',
    intro:
      'Every era of web design left fingerprints: table layouts and visitor counters, then Flash intros, then gradients and rounded corners, then flat design, then whatever we have now. These sites survived long enough to wear all of them in sequence, which makes them unusually good for watching the medium change rather than just one company.',
    sites: [
      {
        domain: 'bbc.co.uk',
        name: 'BBC',
        year: 1998,
        note: 'A public broadcaster that has redesigned carefully and often.',
      },
      {
        domain: 'nytimes.com',
        name: 'The New York Times',
        year: 1996,
        note: 'Newspaper layout logic translated to the web, repeatedly.',
      },
      {
        domain: 'cnn.com',
        name: 'CNN',
        year: 1996,
        note: 'One of the oldest continuously-running news sites on the web.',
      },
      {
        domain: 'wikipedia.org',
        name: 'Wikipedia',
        year: 2001,
        note: 'Famously resistant to redesign, which makes the changes stand out.',
      },
      {
        domain: 'craigslist.org',
        name: 'Craigslist',
        year: 1998,
        note: 'The control group: a site that essentially never changed.',
      },
      {
        domain: 'espn.com',
        name: 'ESPN',
        year: 1999,
        note: 'Dense sports portals were an art form, and this was the flagship.',
      },
      {
        domain: 'imdb.com',
        name: 'IMDb',
        year: 1997,
        note: 'A film database that predates the web itself, still going.',
      },
      {
        domain: 'w3.org',
        name: 'W3C',
        year: 1997,
        note: 'The people who wrote the standards, styling their own site.',
      },
    ],
  },
  {
    slug: 'gone-but-archived',
    title: 'Gone, But Archived',
    description:
      'Sites that shut down, sold up, or quietly disappeared — preserved anyway.',
    emoji: '🪦',
    intro:
      'The Internet Archive is at its most valuable when the original is gone. These sites are dead, redirected, or unrecognisably repurposed, and the captures are the only remaining record of what they were. Coverage varies: some were crawled thoroughly for years, others barely at all.',
    sites: [
      {
        domain: 'geocities.com',
        name: 'GeoCities',
        year: 2001,
        note: 'Closed in 2009 in most of the world. Millions of homepages went with it.',
      },
      {
        domain: 'friendster.com',
        name: 'Friendster',
        year: 2003,
        note: 'The social network that got there first and could not hold on.',
      },
      {
        domain: 'digg.com',
        name: 'Digg',
        year: 2006,
        note: 'The front page of the internet, until a redesign emptied it overnight.',
      },
      {
        domain: 'altavista.com',
        name: 'AltaVista',
        year: 2002,
        note: 'Shut down in 2013 and redirected away.',
      },
      {
        domain: 'delicious.com',
        name: 'Delicious',
        year: 2005,
        note: 'Social bookmarking, and one of the defining sites of Web 2.0.',
      },
      {
        domain: 'vine.co',
        name: 'Vine',
        year: 2014,
        note: 'Six-second looping video. Its influence long outlived the site.',
      },
      {
        domain: 'netscape.com',
        name: 'Netscape',
        year: 2000,
        note: 'Absorbed into AOL, then wound down entirely.',
      },
      {
        domain: 'compuserve.com',
        name: 'CompuServe',
        year: 1997,
        note: 'An online service that predated the consumer web and outlasted it a while.',
      },
    ],
  },
  {
    slug: 'shopping-and-commerce',
    title: 'Shopping & Commerce',
    description:
      'How buying things online went from risky novelty to completely unremarkable.',
    emoji: '🛒',
    intro:
      'Early e-commerce sites had to do something modern ones never think about: convince people that typing a card number into a web page was safe. The reassurance is all over the early captures — padlock icons, security explainers, phone numbers — and watching it fade away is its own kind of history.',
    sites: [
      {
        domain: 'amazon.com',
        name: 'Amazon',
        year: 1997,
        note: "Earth's biggest bookstore, per the tagline of the day.",
      },
      {
        domain: 'ebay.com',
        name: 'eBay',
        year: 1998,
        note: 'Person-to-person auctions, complete with feedback scores.',
      },
      {
        domain: 'etsy.com',
        name: 'Etsy',
        year: 2006,
        note: 'Handmade goods, launched into a market dominated by giants.',
      },
      {
        domain: 'walmart.com',
        name: 'Walmart',
        year: 2000,
        note: 'A physical retailer working out what a website was for.',
      },
      {
        domain: 'target.com',
        name: 'Target',
        year: 1999,
        note: 'Big-box retail meets the browser.',
      },
      {
        domain: 'ikea.com',
        name: 'IKEA',
        year: 1997,
        note: 'A catalogue company with an unusually early web presence.',
      },
      {
        domain: 'zappos.com',
        name: 'Zappos',
        year: 2000,
        note: 'Selling shoes online when nobody thought that would work.',
      },
      {
        domain: 'newegg.com',
        name: 'Newegg',
        year: 2001,
        note: 'Where a generation of people bought computer parts.',
      },
    ],
  },
];

/** Look up one collection by slug. */
export function getCollection(slug: string): Collection | undefined {
  return COLLECTIONS.find((c) => c.slug === slug);
}

/**
 * Every domain that appears in any collection, de-duplicated.
 * Used by the random explorer and the "On This Day" picker so both draw from
 * the same curated pool rather than keeping their own lists in sync.
 */
export function allCollectionSites(): Array<{
  domain: string;
  name: string;
  year: number;
  note: string;
  collection: string;
}> {
  const seen = new Map<
    string,
    {
      domain: string;
      name: string;
      year: number;
      note: string;
      collection: string;
    }
  >();
  for (const collection of COLLECTIONS) {
    for (const site of collection.sites) {
      if (!seen.has(site.domain)) {
        seen.set(site.domain, { ...site, collection: collection.slug });
      }
    }
  }
  return [...seen.values()];
}

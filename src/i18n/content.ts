/**
 * Per-locale page content: the longer, page-specific copy that doesn't belong
 * in the small `ui` chrome dictionary (homepage sections + FAQ + long-form,
 * About, Contact, Histories, legal pages, error pages).
 *
 * Unlike `ui` (per-key fallback), content falls back as a whole object: a
 * locale either provides a complete `PageContent` or inherits English via
 * {@link getContent}. Body-heavy regions are stored as trusted HTML strings and
 * rendered with `set:html`, which preserves the original markup/classes and
 * keeps page files simple. `{{name}}` and `{{email}}` placeholders are replaced
 * with the values from SITE at render time (see {@link fillTokens}).
 */

import { SITE } from '@lib/constants';
import { DEFAULT_LANG, type Lang } from './ui';
import { es } from './content.es';
import { fr } from './content.fr';
import { de } from './content.de';
import { hi } from './content.hi';

export interface FaqItem {
  question: string;
  answer: string;
}

interface SectionHeading {
  eyebrow: string;
  heading: string;
  sub: string;
}

export interface PageContent {
  home: {
    metaTitle: string;
    recentHeading: string;
    examples: SectionHeading;
    comparisons: SectionHeading;
    trending: SectionHeading;
    facts: SectionHeading;
    /** CTA on the trending cards and the Histories index cards. */
    exploreEvolution: string;
    /** The long-form SEO section (h2/h3/p with their classes), as HTML. */
    longformHtml: string;
    faqHeading: string;
    faq: FaqItem[];
  };
  common: {
    viewSnapshot: string;
    backHome: string;
  };
  about: {
    metaTitle: string;
    metaDescription: string;
    eyebrow: string;
    heading: string;
    bodyHtml: string;
  };
  contact: {
    metaTitle: string;
    metaDescription: string;
    eyebrow: string;
    heading: string;
    sub: string;
    bodyHtml: string;
  };
  histories: {
    metaTitle: string;
    metaDescription: string;
    heading: string;
    sub: string;
  };
  notFound: {
    metaTitle: string;
    metaDescription: string;
    heading: string;
    body: string;
  };
  serverError: {
    metaTitle: string;
    metaDescription: string;
    heading: string;
    body: string;
  };
  privacy: {
    metaTitle: string;
    metaDescription: string;
    eyebrow: string;
    heading: string;
    lastUpdatedLabel: string;
    bodyHtml: string;
  };
  terms: {
    metaTitle: string;
    metaDescription: string;
    eyebrow: string;
    heading: string;
    lastUpdatedLabel: string;
    bodyHtml: string;
  };
}

const en: PageContent = {
  home: {
    metaTitle: "Website History Viewer – Check & See Any Website's History Free",
    recentHeading: 'Recently viewed',
    examples: {
      eyebrow: 'Examples',
      heading: 'Popular examples',
      sub: 'Jump straight into a classic snapshot.',
    },
    comparisons: {
      eyebrow: 'Then vs. now',
      heading: 'Popular comparisons',
      sub: 'See how the giants changed — then vs. today.',
    },
    trending: {
      eyebrow: 'Deep dives',
      heading: 'Trending website histories',
      sub: 'Deep-dive design evolutions of the web’s most iconic sites.',
    },
    facts: {
      eyebrow: 'Milestones',
      heading: 'Internet history facts',
      sub: 'A few milestones from the story of the web.',
    },
    exploreEvolution: 'Explore the evolution →',
    longformHtml: `<h2
        class="text-3xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100"
      >
        The free website history viewer for any site
      </h2>
      <p class="mt-4 text-pretty leading-relaxed">
        <strong>Website History Viewer</strong> is a free
        <strong>website history viewer</strong> that lets anyone
        <strong>check website history</strong> and
        <strong>see website history</strong> in seconds. Every page on the
        web changes over time — logos are redrawn, layouts are rebuilt and
        whole brands are reinvented. Our tool turns the public
        <strong>website history archive</strong> of the Internet Archive
        Wayback Machine into a fast, friendly way to
        <strong>view website history</strong> and watch how any site evolved,
        year by year.
      </p>
      <p class="mt-4 text-pretty leading-relaxed">
        Using the <strong>website history search</strong> box is simple. Type
        any domain, pick a year and the
        <strong>website history checker</strong> instantly loads an archived
        snapshot of that page. Behind the scenes the
        <strong>website history lookup</strong> queries decades of crawled
        captures, so a single <strong>website history check</strong> can
        surface the very first homepage a company ever published. There is
        nothing to install and no account to create — the
        <strong>website history tracker</strong> runs entirely in your browser.
      </p>
      <h3
        class="mt-10 text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100"
      >
        Look up the history of famous sites
      </h3>
      <p class="mt-4 text-pretty leading-relaxed">
        Want to explore <strong>Google website history</strong>? Search
        “google.com” and rewind to its bare 1998 search box. Curious about
        <strong>Apple website history</strong>? Pull up apple.com from the
        candy-coloured iMac era and trace every redesign since. From YouTube
        before HD to Amazon when it was still mostly a bookstore, you can
        <strong>view website history</strong> for millions of domains and
        compare any two dates side by side. It is the easiest way to
        <strong>see website history</strong> for the sites that shaped the
        modern web.
      </p>
      <h3
        class="mt-10 text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100"
      >
        How to see website history on iPhone, Mac and any device
      </h3>
      <p class="mt-4 text-pretty leading-relaxed">
        People often ask <strong>how to see website history</strong> on their
        phone. There are two meanings. If you want your own browsing history,
        the answer to <strong>how to see website history on iPhone</strong> is
        to open Safari, tap the bookmarks icon and choose the clock tab. But if
        you want the public history of a website — what the page itself looked
        like in the past — simply open this
        <strong>website history viewer</strong> in any browser, on iPhone,
        iPad, Android, Mac or PC, and run a
        <strong>website history lookup</strong>. Because the tool is fully
        responsive, you can <strong>check website history</strong> on the go
        without a single download.
      </p>
      <h3
        class="mt-10 text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100"
      >
        Why use a dedicated website history tool?
      </h3>
      <p class="mt-4 text-pretty leading-relaxed">
        Designers use it to research how layouts and branding trends evolved.
        Marketers and SEOs run a quick <strong>website history check</strong>
        to confirm when a competitor relaunched or rebranded. Writers,
        students and the simply curious use the
        <strong>website history archive</strong> to settle debates and
        rediscover the internet they grew up with. Whatever brought you here,
        the goal is the same: make it effortless to
        <strong>view website history</strong>, preserve digital memory and
        celebrate how far the web has come. Start your first
        <strong>website history search</strong> above and step back in time —
        every snapshot is a window into how a website used to be.
      </p>`,
    faqHeading: 'Website history FAQ',
    faq: [
      {
        question: 'How to see website history?',
        answer:
          'To see website history, type any domain into the search box above and choose a year. Our website history viewer instantly loads an archived snapshot from the Wayback Machine, so you can see exactly what that website looked like in the past — no account or download needed.',
      },
      {
        question: 'How to check website history?',
        answer:
          'To check website history, enter a domain and pick a date. The website history checker resolves the closest archived capture and shows it on screen. You can step forward or back through the years to check website history across the entire life of the site.',
      },
      {
        question: 'How to check website changes history?',
        answer:
          'To check a website’s changes history, open the site’s timeline to view year-by-year snapshots, or use the side-by-side compare view to put two dates next to each other. This makes design changes, redesigns and rebrands easy to spot at a glance.',
      },
      {
        question: 'How to view website history?',
        answer:
          'To view website history, search the domain in the website history viewer and select any year from when the site was first archived to today. Each archived screenshot is rendered in a large preview so you can view website history clearly on any device.',
      },
      {
        question: 'What is the history of the guge (Google) website?',
        answer:
          '“Guge” (谷歌) is the Chinese name for Google. You can explore Google website history right here: search “google.com” to view its famously bare 1998 search box and trace every homepage redesign through to today. Google launched in 1998 and the Wayback Machine has captured its homepage thousands of times since.',
      },
      {
        question: 'How do I find website history?',
        answer:
          'You find website history by running a website history lookup: enter the domain above, then browse by year or open the visual timeline. The tool searches decades of archived captures from the Internet Archive and surfaces the closest snapshot to the date you choose.',
      },
      {
        question: 'Can I view my own browsing history?',
        answer:
          'Yes, but that lives in your browser, not here. In Chrome press Ctrl+H (or ⌘+Y on Mac); in Safari open the sidebar and choose the History tab; on iPhone, open Safari, tap the book icon, then the clock tab. This website history viewer shows the public history of a website itself — what the page looked like over time — rather than your personal browsing history.',
      },
      {
        question: 'When was a website launched?',
        answer:
          'To find roughly when a website launched, search the domain and rewind to the earliest available year. The first archived snapshot in the website history archive is a good indicator of when the site first went live, since the Wayback Machine began crawling the web in 1996.',
      },
      {
        question: 'Did we have internet in 2005?',
        answer:
          'Yes — 2005 was a busy year for the web. Broadband was spreading fast, YouTube was founded, and sites like Google, Amazon and Facebook were already online. Search any domain and set the year to 2005 to see website history from that era for yourself.',
      },
      {
        question: 'What is a website history viewer?',
        answer:
          'A website history viewer is a free online tool that lets you check website history and see what any website looked like in the past. It pulls archived screenshots and snapshots from the Internet Archive Wayback Machine so you can view website history across years without installing anything.',
      },
      {
        question: 'Is this website history tracker free?',
        answer:
          'Yes. The website history viewer, lookup, timeline and comparison tools are completely free, powered by the public Wayback Machine website history archive. No account or download is needed to check website history.',
      },
      {
        question: 'How to see website history on iPhone?',
        answer:
          'To see website history on iPhone, open Safari, tap the book icon, then the clock tab to view your browsing history. To look up the public history of a website itself, open this website history viewer in Safari on your iPhone and search any domain — it works on Apple devices with no app required.',
      },
      {
        question: 'How do I view Apple or Google website history?',
        answer:
          'Search “apple.com” or “google.com” in the website history search box and choose a year. You can view Apple website history back to the candy-coloured iMac era and explore Google website history from its bare 1998 homepage onward.',
      },
      {
        question: 'How far back does the website history archive go?',
        answer:
          'The website history archive draws on the Internet Archive’s Wayback Machine, which began capturing pages in 1996. For most well-known sites you can view website history from the late 1990s right up to the present day, depending on when each page was first crawled.',
      },
      {
        question: 'Can I compare two versions of a website?',
        answer:
          'Yes. The compare view places any two dates side by side so you can check website changes history instantly — perfect for seeing a “then vs. now” redesign or confirming when a brand refreshed its look.',
      },
      {
        question: 'Does the website history checker work on Android, Mac and PC?',
        answer:
          'Yes. The website history viewer is fully responsive and runs in any modern browser, so you can check website history on Android, iPhone, iPad, Mac and Windows PC with nothing to install.',
      },
      {
        question: 'Why would I check a website’s history?',
        answer:
          'People check website history for many reasons: designers research how layouts evolved, marketers and SEOs confirm when a competitor relaunched or rebranded, and the simply curious enjoy revisiting the early internet. A quick website history check answers all of these.',
      },
      {
        question: 'Is this the same as the Wayback Machine?',
        answer:
          'We’re powered by the Internet Archive Wayback Machine but make it faster and friendlier. Instead of navigating raw archive URLs, you get a clean website history search, large previews, automatic timelines and easy side-by-side comparisons.',
      },
    ],
  },
  common: {
    viewSnapshot: 'View snapshot →',
    backHome: '← Back home',
  },
  about: {
    metaTitle: 'About Us',
    metaDescription:
      'Learn about Website History Viewer — a free tool for exploring how any website looked in the past using archived Wayback Machine screenshots.',
    eyebrow: 'About',
    heading: 'About {{name}}',
    bodyHtml: `<p>
        {{name}} is a free tool for travelling back through internet history.
        Type in any domain and we surface archived screenshots of how that
        website looked on a given date — letting you watch the web’s most iconic
        sites evolve year by year.
      </p>

      <h2>What we do</h2>
      <p>
        Every snapshot you see comes from the
        <a href="https://web.archive.org/" rel="noopener">Wayback Machine</a>,
        the public web archive run by the Internet Archive. We make it easy to:
      </p>
      <ul>
        <li>Look up what any website looked like on a specific date.</li>
        <li>Compare two points in a site’s history side by side.</li>
        <li>Build a visual timeline of how a site changed over the years.</li>
      </ul>

      <h2>How it works</h2>
      <p>
        When you request a website on a date, we ask the Wayback Machine for the
        closest available capture and render a screenshot of that archived page.
        We don’t store or host the original websites ourselves — we simply make
        the public archive easier to browse and explore visually.
      </p>

      <h2>An independent project</h2>
      <p>
        {{name}} is an independent project and is not affiliated with,
        endorsed by, or sponsored by the Internet Archive. All archived content
        belongs to its respective owners. We’re grateful for the Internet
        Archive’s mission to preserve the web — please consider
        <a href="https://archive.org/donate" rel="noopener">supporting them</a>.
      </p>

      <h2>Get in touch</h2>
      <p>
        Questions, feedback, or a feature request? We’d love to hear from you on
        our <a href="/contact">Contact page</a>.
      </p>`,
  },
  contact: {
    metaTitle: 'Contact Us',
    metaDescription:
      'Get in touch with the Website History Viewer team — questions, feedback, corrections, and feature requests are all welcome.',
    eyebrow: 'Contact',
    heading: 'Contact us',
    sub: 'Have a question, spotted a bug, or want to suggest a website to feature? We read every message.',
    bodyHtml: `<div class="card p-6">
        <h2 class="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          Email us
        </h2>
        <p class="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
          The fastest way to reach us. We typically reply within a few business
          days.
        </p>
        <a
          href="mailto:{{email}}"
          class="mt-4 inline-flex items-center gap-2 rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
        >
          ✉️ {{email}}
        </a>
      </div>

      <div class="card p-6">
        <h2 class="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          Before you write
        </h2>
        <ul class="mt-3 space-y-2.5 text-sm text-neutral-600 dark:text-neutral-400">
          <li>
            <strong class="font-medium text-neutral-800 dark:text-neutral-200"
              >Missing or wrong snapshot?</strong
            > Archived captures come from the Wayback Machine — some dates simply
            aren’t archived.
          </li>
          <li>
            <strong class="font-medium text-neutral-800 dark:text-neutral-200"
              >Takedown or content concern?</strong
            > We don’t host archived sites; please contact the
            <a
              href="https://archive.org/about/contact.php"
              rel="noopener"
              class="text-brand-600 hover:underline dark:text-brand-400"
              >Internet Archive</a
            > directly.
          </li>
          <li>
            <strong class="font-medium text-neutral-800 dark:text-neutral-200"
              >Feature idea?</strong
            > Tell us which site or comparison you’d like to see.
          </li>
        </ul>
      </div>`,
  },
  histories: {
    metaTitle: 'Website Histories: Design Evolutions of Iconic Sites',
    metaDescription:
      'Explore the design evolution of the web’s most iconic websites — Google, YouTube, Facebook, Amazon, Reddit and more — with archived screenshots and timelines.',
    heading: 'Website histories',
    sub: 'Deep-dive visual histories of the web’s most iconic sites — how their design, features, and UX evolved over the decades.',
  },
  notFound: {
    metaTitle: 'Page not found (404)',
    metaDescription:
      'The page you’re looking for doesn’t exist. Search for a website to see what it looked like in the past.',
    heading: 'Lost in the archives',
    body: 'We couldn’t find that page. Try searching for a website to see what it looked like in the past.',
  },
  serverError: {
    metaTitle: 'Something went wrong (500)',
    metaDescription:
      'We hit an unexpected error. Try searching for a website to see what it looked like in the past.',
    heading: 'The archive hiccuped',
    body: 'Something went wrong on our end while digging through the archives. It’s usually temporary — try again in a moment, or search for another website.',
  },
  privacy: {
    metaTitle: 'Privacy Policy',
    metaDescription:
      'How Website History Viewer handles your data, cookies, and privacy when you browse archived website history.',
    eyebrow: 'Legal',
    heading: 'Privacy Policy',
    lastUpdatedLabel: 'Last updated:',
    bodyHtml: `<p>
        This Privacy Policy explains how {{name}} (“we”, “us”, “our”) handles
        information when you use our website. We’ve tried to keep it short and
        plain. By using the site, you agree to the practices described here.
      </p>

      <h2>Information we collect</h2>
      <p>
        {{name}} does not require you to create an account, and we do not ask
        for personal information to use the core features. The information
        involved is limited to:
      </p>
      <ul>
        <li>
          <strong>Search queries.</strong> The domains and dates you look up are
          processed to fetch archived snapshots. We do not tie these to your
          identity.
        </li>
        <li>
          <strong>Standard technical data.</strong> Like most websites, our
          hosting provider may automatically log basic request data such as IP
          address, browser type, and pages visited, for security and to keep the
          service running.
        </li>
        <li>
          <strong>Local preferences.</strong> Settings such as your light/dark
          theme are stored in your browser’s local storage on your device — not
          on our servers.
        </li>
      </ul>

      <h2>Cookies and analytics</h2>
      <p>
        We use only the storage necessary to remember your preferences. If we
        use privacy-respecting analytics to understand aggregate, anonymous
        usage, it is configured not to identify individual visitors. We do not
        sell your data.
      </p>

      <h2>Third-party services</h2>
      <p>
        Archived screenshots and snapshot data are retrieved from the
        <a href="https://web.archive.org/" rel="noopener">Internet Archive’s
        Wayback Machine</a>. When archived content loads, your browser may
        contact those third-party services, which have their own privacy
        policies. We also rely on a hosting provider and may load web fonts from
        a content delivery network.
      </p>

      <h2>How we use information</h2>
      <p>
        We use the limited information described above only to operate, secure,
        and improve the service. We do not use it for advertising profiles and
        we do not sell or rent it.
      </p>

      <h2>Children’s privacy</h2>
      <p>
        {{name}} is not directed at children under 13, and we do not
        knowingly collect personal information from them.
      </p>

      <h2>Your choices</h2>
      <p>
        You can clear your browser’s local storage at any time to remove saved
        preferences, and you can block cookies through your browser settings.
      </p>

      <h2>Changes to this policy</h2>
      <p>
        We may update this policy from time to time. When we do, we’ll revise the
        “Last updated” date above.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about this policy? Email us at
        <a href="mailto:{{email}}">{{email}}</a> or visit our
        <a href="/contact">Contact page</a>.
      </p>`,
  },
  terms: {
    metaTitle: 'Terms & Conditions',
    metaDescription:
      'The terms and conditions governing your use of Website History Viewer.',
    eyebrow: 'Legal',
    heading: 'Terms & Conditions',
    lastUpdatedLabel: 'Last updated:',
    bodyHtml: `<p>
        These Terms &amp; Conditions (“Terms”) govern your use of {{name}}
        (the “Service”). By accessing or using the Service, you agree to be bound
        by these Terms. If you do not agree, please do not use the Service.
      </p>

      <h2>Use of the service</h2>
      <p>
        {{name}} provides a free way to view archived screenshots of websites
        sourced from the Internet Archive’s Wayback Machine. You agree to use the
        Service only for lawful purposes and not to:
      </p>
      <ul>
        <li>
          Use automated means to scrape, overload, or disrupt the Service or the
          third-party archives it relies on;
        </li>
        <li>Attempt to gain unauthorized access to our systems; or</li>
        <li>Use the Service in any way that infringes others’ rights.</li>
      </ul>

      <h2>Archived content and intellectual property</h2>
      <p>
        Archived snapshots are provided by the
        <a href="https://web.archive.org/" rel="noopener">Wayback Machine</a> and
        remain the property of their respective owners. We do not claim ownership
        of archived websites or their content. The {{name}} name, design, and
        original site content are our property and may not be copied without
        permission.
      </p>

      <h2>No affiliation</h2>
      <p>
        {{name}} is an independent project and is not affiliated with,
        endorsed by, or sponsored by the Internet Archive or any of the websites
        whose archives are displayed.
      </p>

      <h2>Accuracy and availability</h2>
      <p>
        Archived captures depend entirely on what the Wayback Machine has
        recorded. We cannot guarantee that a snapshot exists for a given date, or
        that it is complete or accurate. The Service is provided “as is” and may
        be unavailable or change at any time without notice.
      </p>

      <h2>Disclaimer of warranties</h2>
      <p>
        To the fullest extent permitted by law, the Service is provided without
        warranties of any kind, whether express or implied, including
        merchantability, fitness for a particular purpose, and non-infringement.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        To the fullest extent permitted by law, {{name}} and its operators
        shall not be liable for any indirect, incidental, or consequential
        damages arising out of your use of, or inability to use, the Service.
      </p>

      <h2>Changes to these terms</h2>
      <p>
        We may update these Terms from time to time. Continued use of the Service
        after changes take effect constitutes acceptance of the revised Terms.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about these Terms? Email us at
        <a href="mailto:{{email}}">{{email}}</a> or visit our
        <a href="/contact">Contact page</a>.
      </p>`,
  },
};

/**
 * Per-locale content. Each locale is a complete {@link PageContent}; locales
 * not yet present inherit English wholesale via {@link getContent}. Translations
 * are appended below as they land.
 */
const content: Partial<Record<Lang, PageContent>> = {
  en,
  es,
  fr,
  de,
  hi,
};

/** Replace `{{name}}` / `{{email}}` tokens in a content string with SITE values. */
export function fillTokens(html: string): string {
  return html.replaceAll('{{name}}', SITE.name).replaceAll('{{email}}', SITE.email);
}

/** The page content for a locale, falling back to English as a whole object. */
export function getContent(lang: Lang): PageContent {
  return content[lang] ?? content[DEFAULT_LANG] ?? en;
}

export { en as enContent };

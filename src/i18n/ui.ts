/**
 * Internationalization configuration and UI string dictionary.
 *
 * Keep `LOCALES`/`DEFAULT_LANG` in sync with the `i18n` block in
 * astro.config.mjs. English is the source language and lives at the site root
 * (no `/en` prefix); every other locale is served under its own path prefix.
 *
 * Strings are looked up with `useTranslations(lang)` (see ./utils). Any key
 * missing from a non-default locale automatically falls back to English, so a
 * locale can be translated incrementally — start it as `{}` and fill it in.
 */

/** All supported locales, default first. */
export const LOCALES = ['en', 'es', 'fr', 'de', 'hi'] as const;

export type Lang = (typeof LOCALES)[number];

/** The source language, served at the site root with no path prefix. */
export const DEFAULT_LANG: Lang = 'en';

/**
 * Display metadata for each locale, used by the language switcher and for the
 * `og:locale` / `hreflang` SEO tags.
 *
 * - `label`  — the language's endonym (shown to users in the switcher).
 * - `ogLocale` — the `language_TERRITORY` value for `<meta property="og:locale">`.
 * - `flag`   — a decorative regional indicator for the switcher.
 */
export const LANGUAGES: Record<
  Lang,
  { label: string; ogLocale: string; flag: string }
> = {
  en: { label: 'English', ogLocale: 'en_US', flag: '🇺🇸' },
  es: { label: 'Español', ogLocale: 'es_ES', flag: '🇪🇸' },
  fr: { label: 'Français', ogLocale: 'fr_FR', flag: '🇫🇷' },
  de: { label: 'Deutsch', ogLocale: 'de_DE', flag: '🇩🇪' },
  hi: { label: 'हिन्दी', ogLocale: 'hi_IN', flag: '🇮🇳' },
};

/**
 * UI string dictionary, keyed by a dotted namespace.
 *
 * English is complete and is the fallback for every other locale. The shared
 * chrome (navigation, hero, footer, switcher) is translated for every locale;
 * any key omitted from a locale falls back to English automatically, so the
 * dictionaries can be extended incrementally with no code changes. Long-form
 * body copy (FAQ, legal, About) still renders in English until translated.
 */
export const ui = {
  en: {
    'nav.compare': 'Compare',
    'nav.histories': 'Histories',
    'nav.internetHistory': 'Internet History',
    'nav.more': 'More',
    'nav.language': 'Language',
    'nav.toggleTheme': 'Toggle dark mode',

    'hero.badge': '🕰️ Powered by the Internet Archive Wayback Machine',
    'hero.title':
      'Website history viewer — see what any site looked like in the past.',
    'hero.subtitle':
      'Check website history for free and travel through internet history. Look up, track and view the website history of Google, YouTube, Facebook, Amazon and millions of other sites across time.',
    'hero.try': 'Try:',

    'footer.tagline':
      'Travel through internet history with archived screenshots from the Internet Archive Wayback Machine.',
    'footer.featured': 'Featured histories',
    'footer.explore': 'Explore',
    'footer.company': 'Company',
    'footer.compare': 'Compare two versions',
    'footer.timeline': 'Build a timeline',
    'footer.examples': 'Popular examples',
    'footer.rights': 'All rights reserved.',
    'footer.dataCredit': 'Data: Internet Archive Wayback Machine.',

    'search.domainLabel': 'Website or domain',
    'search.domainPlaceholder': 'e.g. youtube.com',
    'search.dateLabel': 'Date',
    'search.compareToggle': 'Compare two dates',
    'search.secondDateLabel': 'Second date (to compare against)',
    'search.submit': 'View Snapshot',
  },
  es: {
    'nav.compare': 'Comparar',
    'nav.histories': 'Historiales',
    'nav.internetHistory': 'Historia de Internet',
    'nav.more': 'Más',
    'nav.language': 'Idioma',
    'nav.toggleTheme': 'Cambiar modo oscuro',

    'hero.badge': '🕰️ Con la tecnología de Wayback Machine de Internet Archive',
    'hero.title':
      'Visor de historial de sitios web: descubre cómo era cualquier sitio en el pasado.',
    'hero.subtitle':
      'Consulta el historial de sitios web gratis y viaja por la historia de Internet. Busca, rastrea y consulta el historial de Google, YouTube, Facebook, Amazon y millones de sitios más a lo largo del tiempo.',
    'hero.try': 'Prueba:',

    'footer.tagline':
      'Viaja por la historia de Internet con capturas de pantalla archivadas de Wayback Machine de Internet Archive.',
    'footer.featured': 'Historiales destacados',
    'footer.explore': 'Explorar',
    'footer.company': 'Empresa',
    'footer.compare': 'Comparar dos versiones',
    'footer.timeline': 'Crear una línea de tiempo',
    'footer.examples': 'Ejemplos populares',
    'footer.rights': 'Todos los derechos reservados.',
    'footer.dataCredit': 'Datos: Wayback Machine de Internet Archive.',

    'search.domainLabel': 'Sitio web o dominio',
    'search.domainPlaceholder': 'p. ej. youtube.com',
    'search.dateLabel': 'Fecha',
    'search.compareToggle': 'Comparar dos fechas',
    'search.secondDateLabel': 'Segunda fecha (para comparar)',
    'search.submit': 'Ver captura',
  },
  fr: {
    'nav.compare': 'Comparer',
    'nav.histories': 'Historiques',
    'nav.internetHistory': "Histoire d'Internet",
    'nav.more': 'Plus',
    'nav.language': 'Langue',
    'nav.toggleTheme': 'Basculer le mode sombre',

    'hero.badge': "🕰️ Propulsé par la Wayback Machine d'Internet Archive",
    'hero.title':
      "Visionneuse d'historique de sites web — découvrez à quoi ressemblait n'importe quel site par le passé.",
    'hero.subtitle':
      "Consultez gratuitement l'historique des sites web et voyagez à travers l'histoire d'Internet. Recherchez, suivez et consultez l'historique de Google, YouTube, Facebook, Amazon et de millions d'autres sites au fil du temps.",
    'hero.try': 'Essayez :',

    'footer.tagline':
      "Voyagez à travers l'histoire d'Internet grâce aux captures d'écran archivées de la Wayback Machine d'Internet Archive.",
    'footer.featured': 'Historiques en vedette',
    'footer.explore': 'Explorer',
    'footer.company': 'Entreprise',
    'footer.compare': 'Comparer deux versions',
    'footer.timeline': 'Créer une chronologie',
    'footer.examples': 'Exemples populaires',
    'footer.rights': 'Tous droits réservés.',
    'footer.dataCredit': "Données : Wayback Machine d'Internet Archive.",

    'search.domainLabel': 'Site web ou domaine',
    'search.domainPlaceholder': 'p. ex. youtube.com',
    'search.dateLabel': 'Date',
    'search.compareToggle': 'Comparer deux dates',
    'search.secondDateLabel': 'Deuxième date (à comparer)',
    'search.submit': 'Voir la capture',
  },
  de: {
    'nav.compare': 'Vergleichen',
    'nav.histories': 'Verläufe',
    'nav.internetHistory': 'Internetgeschichte',
    'nav.more': 'Mehr',
    'nav.language': 'Sprache',
    'nav.toggleTheme': 'Dunkelmodus umschalten',

    'hero.badge':
      '🕰️ Unterstützt von der Wayback Machine des Internet Archive',
    'hero.title':
      'Website-Verlauf-Viewer – sehen Sie, wie jede Website früher aussah.',
    'hero.subtitle':
      'Prüfen Sie den Website-Verlauf kostenlos und reisen Sie durch die Internetgeschichte. Suchen, verfolgen und betrachten Sie den Verlauf von Google, YouTube, Facebook, Amazon und Millionen weiterer Websites im Lauf der Zeit.',
    'hero.try': 'Versuchen Sie:',

    'footer.tagline':
      'Reisen Sie durch die Internetgeschichte mit archivierten Screenshots der Wayback Machine des Internet Archive.',
    'footer.featured': 'Empfohlene Verläufe',
    'footer.explore': 'Entdecken',
    'footer.company': 'Unternehmen',
    'footer.compare': 'Zwei Versionen vergleichen',
    'footer.timeline': 'Zeitleiste erstellen',
    'footer.examples': 'Beliebte Beispiele',
    'footer.rights': 'Alle Rechte vorbehalten.',
    'footer.dataCredit': 'Daten: Wayback Machine des Internet Archive.',

    'search.domainLabel': 'Website oder Domain',
    'search.domainPlaceholder': 'z. B. youtube.com',
    'search.dateLabel': 'Datum',
    'search.compareToggle': 'Zwei Daten vergleichen',
    'search.secondDateLabel': 'Zweites Datum (zum Vergleich)',
    'search.submit': 'Snapshot ansehen',
  },
  hi: {
    'nav.compare': 'तुलना करें',
    'nav.histories': 'इतिहास',
    'nav.internetHistory': 'इंटरनेट का इतिहास',
    'nav.more': 'अधिक',
    'nav.language': 'भाषा',
    'nav.toggleTheme': 'डार्क मोड टॉगल करें',

    'hero.badge': '🕰️ इंटरनेट आर्काइव वेबैक मशीन द्वारा संचालित',
    'hero.title':
      'वेबसाइट इतिहास व्यूअर — देखें कि अतीत में कोई भी साइट कैसी दिखती थी।',
    'hero.subtitle':
      'मुफ़्त में वेबसाइट इतिहास देखें और इंटरनेट के इतिहास में सैर करें। समय के साथ Google, YouTube, Facebook, Amazon और लाखों अन्य साइटों का वेबसाइट इतिहास खोजें, ट्रैक करें और देखें।',
    'hero.try': 'आज़माएँ:',

    'footer.tagline':
      'इंटरनेट आर्काइव वेबैक मशीन के संग्रहित स्क्रीनशॉट के साथ इंटरनेट के इतिहास में सैर करें।',
    'footer.featured': 'विशेष इतिहास',
    'footer.explore': 'एक्सप्लोर करें',
    'footer.company': 'कंपनी',
    'footer.compare': 'दो संस्करणों की तुलना करें',
    'footer.timeline': 'टाइमलाइन बनाएं',
    'footer.examples': 'लोकप्रिय उदाहरण',
    'footer.rights': 'सर्वाधिकार सुरक्षित।',
    'footer.dataCredit': 'डेटा: इंटरनेट आर्काइव वेबैक मशीन।',

    'search.domainLabel': 'वेबसाइट या डोमेन',
    'search.domainPlaceholder': 'जैसे youtube.com',
    'search.dateLabel': 'तारीख',
    'search.compareToggle': 'दो तारीखों की तुलना करें',
    'search.secondDateLabel': 'दूसरी तारीख (तुलना के लिए)',
    'search.submit': 'स्नैपशॉट देखें',
  },
} as const satisfies Record<Lang, Partial<Record<string, string>>>;

/** The set of valid translation keys (derived from the complete English set). */
export type UIKey = keyof (typeof ui)['en'];

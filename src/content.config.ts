/**
 * Content collections (Astro 5 Content Layer API).
 *
 * The `histories` collection powers the featured evolution pages
 * (/google-history, /youtube-history, …). Each entry is an MDX file whose
 * frontmatter is validated against the schema below; the MDX body holds the
 * long-form "design evolution / UX changes" analysis rendered as prose.
 */
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const milestone = z.object({
  year: z.number(),
  title: z.string(),
  description: z.string(),
});

const faq = z.object({
  question: z.string(),
  answer: z.string(),
});

const histories = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/histories' }),
  schema: z.object({
    /** Marketing/SEO title, e.g. "The History of Google". */
    title: z.string(),
    /** Meta description used for SEO + social cards. */
    description: z.string(),
    /** Bare domain this history is about, e.g. "google.com". */
    domain: z.string(),
    /** Display name, e.g. "Google". */
    name: z.string(),
    /** Accent emoji shown in hero/cards. */
    emoji: z.string().default('🌐'),
    /** Year the site/company launched. */
    foundedYear: z.number(),
    /** A representative nostalgic year to feature in the hero. */
    heroYear: z.number(),
    /** Timeline generation controls (years are resolved against the Archive). */
    timelineFrom: z.number().default(1999),
    timelineStep: z.number().default(4),
    /** Hand-curated milestones. */
    milestones: z.array(milestone).default([]),
    /** FAQ entries -> FAQ rich results. */
    faqs: z.array(faq).default([]),
    /** Ordering weight for index listings (higher = first). */
    weight: z.number().default(0),
    /** Publication metadata for Article structured data. */
    publishDate: z.coerce.date().optional(),
    updatedDate: z.coerce.date().optional(),
  }),
});

export const collections = { histories };

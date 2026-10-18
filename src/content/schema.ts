import { z } from "zod";

const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slugs are kebab-case");
const link = z.object({ label: z.string().min(1), href: z.url() });

export const noteMetaSchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  order: z.number().int(),
  /** Short label shown in the Notes sidebar date column. */
  updated: z.iso.date(),
});

export const projectMetaSchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1).max(160),
  order: z.number().int(),
  status: z.enum(["shipped", "research", "in-progress"]),
  year: z.number().int().min(2018).max(2100),
  stack: z.array(z.string().min(1)).min(1),
  links: z.array(link).default([]),
});

export type NoteMeta = z.infer<typeof noteMetaSchema> & { slug: string };
export type ProjectMeta = z.infer<typeof projectMetaSchema> & { slug: string };

/** What the client gets: metadata only, never the MDX modules themselves. */
export interface ContentIndex {
  notes: NoteMeta[];
  projects: ProjectMeta[];
}

export { slug as slugSchema };

import "server-only";
import type { MDXContent } from "mdx/types";
import type { z } from "zod";
import {
  noteMetaSchema,
  projectMetaSchema,
  slugSchema,
  type ContentIndex,
  type NoteMeta,
  type ProjectMeta,
} from "./schema";
import type { NoteSlug, ProjectSlug } from "./slugs";

import * as aboutMe from "./notes/about-me.mdx";
import * as resume from "./notes/resume.mdx";

import * as darkside from "./projects/darkside-20k-surrogate.mdx";
import * as streamline from "./projects/streamline-etl.mdx";
import * as robotFleet from "./projects/robot-fleet-sensor-insights.mdx";
import * as cryptoBot from "./projects/crypto-signal-bot.mdx";
import * as leadEngine from "./projects/real-estate-lead-engine.mdx";
import * as mobilenet from "./projects/mobilenetv2-image-classifier.mdx";

/**
 * Explicit registry of every MDX document. Imports are static so the bundler
 * can see them and the server render stays synchronous. A unit test fails if a
 * file in notes/ or projects/ is missing from these lists.
 */
export const NOTE_FILES = { "about-me": aboutMe, resume } satisfies Record<NoteSlug, MdxModule>;
export const PROJECT_FILES = {
  "darkside-20k-surrogate": darkside,
  "streamline-etl": streamline,
  "robot-fleet-sensor-insights": robotFleet,
  "crypto-signal-bot": cryptoBot,
  "real-estate-lead-engine": leadEngine,
  "mobilenetv2-image-classifier": mobilenet,
} satisfies Record<ProjectSlug, MdxModule>;

interface MdxModule {
  default: MDXContent;
  frontmatter?: unknown;
}

export interface Doc<M> {
  meta: M;
  Body: MDXContent;
}

function load<S extends z.ZodType<{ order: number }>>(
  kind: string,
  files: Record<string, MdxModule>,
  schema: S,
): Doc<z.infer<S> & { slug: string }>[] {
  return Object.entries(files)
    .map(([slug, mod]) => {
      slugSchema.parse(slug);
      const parsed = schema.safeParse(mod.frontmatter);
      if (!parsed.success) {
        // Fails `next build` (and CI) with a readable message instead of shipping bad content.
        throw new Error(`Invalid frontmatter in ${kind}/${slug}.mdx:\n${parsed.error.message}`);
      }
      const meta = { ...(parsed.data as object), slug } as z.infer<S> & { slug: string };
      return { meta, Body: mod.default };
    })
    .sort((a, b) => a.meta.order - b.meta.order);
}

export const notes: Doc<NoteMeta>[] = load("notes", NOTE_FILES, noteMetaSchema);
export const projects: Doc<ProjectMeta>[] = load("projects", PROJECT_FILES, projectMetaSchema);

export const contentIndex: ContentIndex = {
  notes: notes.map((d) => d.meta),
  projects: projects.map((d) => d.meta),
};

export function findDoc(app: string, slug: string | null) {
  if (!slug) return undefined;
  if (app === "notes") return notes.find((d) => d.meta.slug === slug);
  if (app === "finder") return projects.find((d) => d.meta.slug === slug);
  return undefined;
}

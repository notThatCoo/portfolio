import { readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { NOTE_FILES, PROJECT_FILES, contentIndex, notes, projects } from "./index";
import { APP_SPECS } from "@/lib/wm/specs";

const mdxIn = (dir: string) =>
  readdirSync(join(__dirname, dir))
    .filter((f) => f.endsWith(".mdx"))
    .map((f) => f.replace(/\.mdx$/, ""))
    .sort();

describe("content registry", () => {
  it("registers every note file", () => {
    expect(Object.keys(NOTE_FILES).sort()).toEqual(mdxIn("notes"));
  });

  it("registers every project file", () => {
    expect(Object.keys(PROJECT_FILES).sort()).toEqual(mdxIn("projects"));
  });

  it("parses frontmatter for every document", () => {
    expect(notes).toHaveLength(mdxIn("notes").length);
    expect(projects).toHaveLength(mdxIn("projects").length);
    for (const doc of [...notes, ...projects]) {
      expect(typeof doc.Body).toBe("function");
    }
  });

  it("keeps sort orders unique so the UI order is deterministic", () => {
    for (const list of [contentIndex.notes, contentIndex.projects]) {
      const orders = list.map((m) => m.order);
      expect(new Set(orders).size).toBe(orders.length);
    }
  });

  it("the Notes default document exists", () => {
    expect(contentIndex.notes.map((n) => n.slug)).toContain(APP_SPECS.notes.defaultSlug);
  });
});

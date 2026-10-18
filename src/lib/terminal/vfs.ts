import type { ContentIndex } from "@/content/schema";
import { APP_SPECS, DOCK_APPS } from "@/lib/wm/specs";
import type { Route } from "@/lib/wm/types";

/**
 * A read-only virtual filesystem generated from the site's content, so the
 * terminal always agrees with Finder and Notes. Files either hold text or
 * point at a route (opening them opens a window).
 */
export interface VFile {
  kind: "file";
  name: string;
  /** Body key for MDX docs ("notes/about-me"), rendered by the UI on `cat`. */
  doc?: string;
  text?: string;
  route?: Route;
  summary?: string;
}

export interface VDir {
  kind: "dir";
  name: string;
  children: Map<string, VNode>;
  route?: Route;
}

export type VNode = VFile | VDir;

const dir = (name: string, nodes: VNode[], route?: Route): VDir => ({
  kind: "dir",
  name,
  route,
  children: new Map(nodes.map((n) => [n.name, n])),
});

export function buildFs(content: ContentIndex): VDir {
  return dir("", [
    dir(
      "notes",
      content.notes.map((n) => ({
        kind: "file",
        name: `${n.slug}.md`,
        doc: `notes/${n.slug}`,
        summary: n.summary,
        route: { app: "notes", slug: n.slug },
      })),
      { app: "notes", slug: null },
    ),
    dir(
      "projects",
      content.projects.map((p) => ({
        kind: "file",
        name: `${p.slug}.md`,
        doc: `projects/${p.slug}`,
        summary: p.summary,
        route: { app: "finder", slug: p.slug },
      })),
      { app: "finder", slug: null },
    ),
    dir(
      "apps",
      DOCK_APPS.map((app) => ({
        kind: "file",
        name: `${app}.app`,
        summary: APP_SPECS[app].blurb,
        route: { app, slug: null },
      })),
    ),
    {
      kind: "file",
      name: "README.txt",
      text: [
        "This desktop is a Next.js app with a hand-written window manager.",
        "Every window has a real URL, so links are shareable and Back works.",
        "",
        "Try:  ls projects    cat notes/about-me.md    open detector",
        "      simulate --rho 0.4 --phi 30 --z 0.2",
      ].join("\n"),
    },
  ]);
}

/** Resolve a path (absolute, relative, `~`, `.`, `..`) against `cwd`. Returns normalized segments. */
export function resolvePath(cwd: string[], path: string): string[] {
  const start = path.startsWith("/") || path.startsWith("~") ? [] : [...cwd];
  for (const part of path.replace(/^~/, "").split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") start.pop();
    else start.push(part);
  }
  return start;
}

export function lookup(root: VDir, segments: string[]): VNode | null {
  let node: VNode = root;
  for (const seg of segments) {
    if (node.kind !== "dir") return null;
    const next: VNode | undefined = node.children.get(seg);
    if (!next) return null;
    node = next;
  }
  return node;
}

export function formatPath(segments: string[]): string {
  return segments.length ? `~/${segments.join("/")}` : "~";
}

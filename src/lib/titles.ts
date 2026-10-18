import { site } from "@/config/site";
import type { ContentIndex } from "@/content/schema";
import { APP_SPECS } from "./wm/specs";
import type { Route } from "./wm/types";

/** Title of the document a route shows, e.g. "Résumé" or "streamline-etl". */
export function docTitle(route: Route, content: ContentIndex): string | null {
  if (!route.slug) return null;
  if (route.app === "notes") return content.notes.find((n) => n.slug === route.slug)?.title ?? null;
  if (route.app === "finder")
    return content.projects.find((p) => p.slug === route.slug)?.title ?? null;
  return null;
}

/** Shown in the window's title bar. */
export function windowTitle(route: Route, content: ContentIndex): string {
  const doc = docTitle(route, content);
  if (doc) return doc;
  return route.app === "finder" ? "Projects" : APP_SPECS[route.app].name;
}

/**
 * Browser tab title. Used by both generateMetadata (server) and the client
 * history sync, so a deep link and an in-app navigation produce the same title.
 */
export function pageTitle(route: Route | null, content: ContentIndex): string {
  if (!route) return `${site.name} · ${site.tagline}`;
  const doc = docTitle(route, content);
  const app = APP_SPECS[route.app].name;
  return doc ? `${doc} · ${app} · ${site.name}` : `${app} · ${site.name}`;
}

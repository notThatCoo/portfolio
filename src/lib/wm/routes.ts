import { isAppId, type Route } from "./types";

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * URL ↔ route. The URL always names the focused window:
 *   /                 → desktop, nothing focused
 *   /finder           → Finder at its root
 *   /notes/about-me   → Notes showing the "about-me" note
 * Anything else returns `null` and is left to the 404 page.
 */
export function parsePath(pathname: string): Route | null {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 0 || parts.length > 2) return null;
  const [app, slug] = parts;
  if (!isAppId(app)) return null;
  if (slug !== undefined && !SLUG.test(slug)) return null;
  return { app, slug: slug ?? null };
}

export function hrefFor(route: Route | null): string {
  if (!route) return "/";
  return route.slug ? `/${route.app}/${route.slug}` : `/${route.app}`;
}

export function sameRoute(a: Route | null, b: Route | null): boolean {
  return hrefFor(a) === hrefFor(b);
}

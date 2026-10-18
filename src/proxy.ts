import { NextResponse, type NextRequest } from "next/server";
import { NOTE_SLUGS, PROJECT_SLUGS } from "@/content/slugs";
import { parsePath } from "@/lib/wm/routes";

const DOCS: Record<string, readonly string[]> = { notes: NOTE_SLUGS, finder: PROJECT_SLUGS };

/** True if the URL names an app, or a document that exists. */
export function isKnownPath(pathname: string): boolean {
  if (pathname === "/") return true;
  const route = parsePath(pathname);
  if (!route) return false;
  if (!route.slug) return true;
  return DOCS[route.app]?.includes(route.slug) ?? false;
}

/**
 * With Cache Components, unknown params render on request and stream with a
 * 200 before the page can call notFound(). Rejecting them here, before
 * rendering, keeps the HTTP status honest for crawlers and link checkers.
 */
export function proxy(request: NextRequest) {
  if (isKnownPath(request.nextUrl.pathname)) return NextResponse.next();
  return NextResponse.rewrite(new URL("/missing", request.url));
}

export const config = {
  // Only page-like paths: skip Next internals, files with extensions, and metadata routes.
  matcher: ["/((?!_next/|missing$|.*\\..*).*)"],
};

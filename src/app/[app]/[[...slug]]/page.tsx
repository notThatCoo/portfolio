import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { contentIndex } from "@/content";
import { docTitle, pageTitle } from "@/lib/titles";
import { parsePath } from "@/lib/wm/routes";
import { APP_IDS } from "@/lib/wm/types";
import { APP_SPECS } from "@/lib/wm/specs";

/**
 * One static page per app and per document. The page itself renders nothing:
 * the persistent shell in the root layout reads the URL and opens the right
 * window. This route exists so every window has a real, crawlable,
 * shareable URL with its own title and description.
 */
export function generateStaticParams() {
  return APP_IDS.flatMap((app) => {
    const docs =
      app === "notes" ? contentIndex.notes : app === "finder" ? contentIndex.projects : [];
    return [{ app, slug: [] as string[] }, ...docs.map((d) => ({ app, slug: [d.slug] }))];
  });
}

// Cache Components replaces `dynamicParams = false`: unknown params render on
// request and `notFound()` below turns them into a 404.

async function routeFrom(params: PageProps<"/[app]/[[...slug]]">["params"]) {
  const { app, slug = [] } = await params;
  const route = parsePath(`/${app}/${slug.join("/")}`);
  if (!route || (route.slug && !docTitle(route, contentIndex))) notFound();
  return route;
}

export async function generateMetadata({
  params,
}: PageProps<"/[app]/[[...slug]]">): Promise<Metadata> {
  const route = await routeFrom(params);
  const doc =
    route.app === "notes"
      ? contentIndex.notes.find((n) => n.slug === route.slug)
      : contentIndex.projects.find((p) => p.slug === route.slug);
  const path = route.slug ? `/${route.app}/${route.slug}` : `/${route.app}`;
  return {
    title: { absolute: pageTitle(route, contentIndex) },
    description: (route.slug && doc?.summary) || APP_SPECS[route.app].blurb,
    alternates: { canonical: path },
    openGraph: { url: path, title: pageTitle(route, contentIndex) },
  };
}

export default async function AppPage({ params }: PageProps<"/[app]/[[...slug]]">) {
  await routeFrom(params);
  return null;
}

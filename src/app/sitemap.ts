import type { MetadataRoute } from "next";
import { site } from "@/config/site";
import { contentIndex } from "@/content";
import { APP_IDS } from "@/lib/wm/types";

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = [
    "/",
    ...APP_IDS.map((app) => `/${app}`),
    ...contentIndex.notes.map((n) => `/notes/${n.slug}`),
    ...contentIndex.projects.map((p) => `/finder/${p.slug}`),
  ];
  return paths.map((p) => ({ url: `${site.url}${p === "/" ? "" : p}` }));
}

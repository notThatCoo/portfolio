"use client";

import Link from "next/link";
import type { AppProps } from "@/apps";
import type { ProjectMeta } from "@/content/schema";
import { ChevronLeft, ChevronRight, ExternalGlyph, ProjectFolder } from "@/icons/Glyphs";
import { useContent, useDispatch } from "@/shell/DesktopContext";

const STATUS: Record<ProjectMeta["status"], { label: string; className: string }> = {
  shipped: {
    label: "Shipped",
    className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
  },
  research: {
    label: "Research",
    className: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-300",
  },
  "in-progress": {
    label: "In progress",
    className: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  },
};

export function StatusBadge({ status }: { status: ProjectMeta["status"] }) {
  const s = STATUS[status];
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${s.className}`}>
      {s.label}
    </span>
  );
}

/** Plain links with an in-app click handler: real hrefs keep middle-click and "copy link" working. */
function useGo() {
  const dispatch = useDispatch();
  return (slug: string | null) => (e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
    e.preventDefault();
    dispatch({ type: "navigate", app: "finder", slug });
  };
}

export default function FinderApp({ win }: AppProps) {
  const { projects, bodies } = useContent();
  const dispatch = useDispatch();
  const go = useGo();
  const project = projects.find((p) => p.slug === win.slug);

  return (
    <div className="flex h-full">
      <nav
        aria-label="Finder sidebar"
        className="w-44 shrink-0 border-r border-line bg-sidebar p-3 text-[13px] max-[700px]:hidden"
      >
        <p className="mb-1 px-2 text-[11px] font-semibold text-faint">Favorites</p>
        <ul className="space-y-0.5">
          <li>
            <Link
              prefetch={false}
              href={"/finder"}
              onClick={go(null)}
              aria-current={!project ? "page" : undefined}
              className="block rounded-md px-2 py-1 hover:bg-hover aria-[current=page]:bg-selected"
            >
              Projects
            </Link>
          </li>
          <li>
            <button
              type="button"
              className="block w-full rounded-md px-2 py-1 text-left hover:bg-hover"
              onClick={() => dispatch({ type: "open", app: "notes", slug: "about-me" })}
            >
              About me
            </button>
          </li>
          <li>
            <button
              type="button"
              className="block w-full rounded-md px-2 py-1 text-left hover:bg-hover"
              onClick={() => dispatch({ type: "open", app: "notes", slug: "resume" })}
            >
              Résumé
            </button>
          </li>
        </ul>
      </nav>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-10 shrink-0 items-center gap-1 border-b border-line px-3 text-[13px]">
          <Link
            prefetch={false}
            href={"/finder"}
            onClick={go(null)}
            aria-label="Back to Projects"
            aria-disabled={!project}
            className="grid size-7 place-items-center rounded-md hover:bg-hover aria-disabled:pointer-events-none aria-disabled:opacity-30"
            tabIndex={project ? 0 : -1}
          >
            <ChevronLeft className="size-4" />
          </Link>
          <nav aria-label="Breadcrumb">
            <ol className="flex items-center gap-1 text-muted">
              <li>
                <Link
                  prefetch={false}
                  href={"/finder"}
                  onClick={go(null)}
                  className={project ? "hover:text-text" : "font-semibold text-text"}
                >
                  Projects
                </Link>
              </li>
              {project && (
                <>
                  <li aria-hidden="true">
                    <ChevronRight className="size-3" />
                  </li>
                  <li aria-current="page" className="truncate font-semibold text-text">
                    {project.title}
                  </li>
                </>
              )}
            </ol>
          </nav>
          <span className="ml-auto text-xs text-faint">
            {project ? project.year : `${projects.length} items`}
          </span>
        </div>

        {project ? (
          <article
            key={project.slug}
            className="min-h-0 flex-1 overflow-y-auto px-8 py-7 max-[700px]:px-5"
          >
            <header className="mb-6 max-w-[68ch]">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <StatusBadge status={project.status} />
                <span className="text-xs text-muted">{project.year}</span>
              </div>
              <h1 className="text-[1.9em] leading-tight font-bold tracking-tight">
                {project.title}
              </h1>
              <p className="mt-2 text-[15px] text-muted">{project.summary}</p>
              <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Tech stack">
                {project.stack.map((t) => (
                  <li
                    key={t}
                    className="rounded-md border border-line px-2 py-0.5 font-mono text-[11px] text-muted"
                  >
                    {t}
                  </li>
                ))}
              </ul>
              {project.links.length > 0 && (
                <ul className="mt-4 flex flex-wrap gap-2">
                  {project.links.map((l) => (
                    <li key={l.href}>
                      <a
                        href={l.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="button button-quiet"
                      >
                        {l.label} <ExternalGlyph className="size-3.5" />
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </header>
            <div className="prose">{bodies[`projects/${project.slug}`]}</div>
          </article>
        ) : (
          <ul
            aria-label="Projects"
            className="grid min-h-0 flex-1 auto-rows-min grid-cols-[repeat(auto-fill,minmax(132px,1fr))] gap-2 overflow-y-auto p-5"
          >
            {projects.map((p) => (
              <li key={p.slug}>
                <Link
                  prefetch={false}
                  href={`/finder/${p.slug}`}
                  onClick={go(p.slug)}
                  className="group flex flex-col items-center gap-2 rounded-xl p-3 text-center hover:bg-hover focus-visible:bg-selected"
                >
                  <ProjectFolder className="w-16 transition-transform group-hover:-translate-y-0.5" />
                  <span className="line-clamp-2 text-[12px] leading-snug font-medium">
                    {p.title}
                  </span>
                  {p.status === "in-progress" && <StatusBadge status={p.status} />}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

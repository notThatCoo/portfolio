"use client";

import Link from "next/link";
import type { AppProps } from "@/apps";
import { useContent, useDispatch } from "@/shell/DesktopContext";

const dateFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

export default function NotesApp({ win }: AppProps) {
  const { notes, bodies } = useContent();
  const dispatch = useDispatch();
  const current = notes.find((n) => n.slug === win.slug) ?? notes[0];

  return (
    <div className="flex h-full max-[700px]:flex-col">
      <nav
        aria-label="Notes"
        className="w-60 shrink-0 overflow-y-auto border-r border-line bg-sidebar p-2 max-[700px]:w-full max-[700px]:border-r-0 max-[700px]:border-b max-[700px]:p-1.5"
      >
        <ul className="max-[700px]:flex max-[700px]:gap-1.5">
          {notes.map((n) => {
            const selected = n.slug === current?.slug;
            return (
              <li key={n.slug} className="max-[700px]:flex-1">
                <Link
                  prefetch={false}
                  href={`/notes/${n.slug}`}
                  aria-current={selected ? "page" : undefined}
                  onClick={(e) => {
                    if (e.metaKey || e.ctrlKey || e.shiftKey) return; // let new-tab clicks through
                    e.preventDefault();
                    dispatch({ type: "navigate", app: "notes", slug: n.slug });
                  }}
                  className="block rounded-lg px-3 py-2 hover:bg-hover aria-[current=page]:bg-selected max-[700px]:text-center"
                >
                  <span className="block truncate text-[13px] font-semibold">{n.title}</span>
                  <span className="block truncate text-xs text-muted max-[700px]:hidden">
                    <span className="text-faint">{dateFmt.format(new Date(n.updated))}</span> ·{" "}
                    {n.summary}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <article
        key={current?.slug}
        className="prose min-w-0 flex-1 overflow-y-auto px-8 py-7 max-[700px]:max-w-none max-[700px]:px-5"
      >
        {current ? bodies[`notes/${current.slug}`] : <p>No notes yet.</p>}
      </article>
    </div>
  );
}

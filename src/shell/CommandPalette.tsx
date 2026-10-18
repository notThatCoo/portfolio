"use client";

import { Fragment, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { site } from "@/config/site";
import { AppIcon } from "@/icons/AppIcons";
import { BoltGlyph, FolderGlyph, NoteGlyph, SearchGlyph } from "@/icons/Glyphs";
import { rank, type Searchable } from "@/lib/search";
import { APP_SPECS, DOCK_APPS } from "@/lib/wm/specs";
import { useContent, useDispatch, useUi } from "./DesktopContext";

interface Item extends Searchable {
  id: string;
  group: "Apps" | "Notes" | "Projects" | "Actions";
  subtitle?: string;
  icon: ReactNode;
  run: () => void;
}

function Highlight({ text, indices }: { text: string; indices: number[] }) {
  if (!indices.length) return <>{text}</>;
  const set = new Set(indices);
  return (
    <>
      {[...text].map((ch, i) =>
        set.has(i) ? (
          <mark key={i} className="bg-transparent font-semibold text-accent">
            {ch}
          </mark>
        ) : (
          <Fragment key={i}>{ch}</Fragment>
        ),
      )}
    </>
  );
}

/**
 * ⌘K / Ctrl+K launcher. Native <dialog> gives us the modal focus trap, Esc,
 * and an inert background for free; the input + list follow the ARIA
 * combobox pattern (focus stays in the input, aria-activedescendant moves).
 */
export function CommandPalette({
  open,
  initialQuery,
  onClose,
}: {
  open: boolean;
  initialQuery: string;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [query, setQuery] = useState(initialQuery);
  const [active, setActive] = useState(0);
  const listId = useId();
  const dispatch = useDispatch();
  const ui = useUi();
  const { notes, projects } = useContent();

  const items = useMemo<Item[]>(
    () => [
      ...DOCK_APPS.map<Item>((app) => ({
        id: `app:${app}`,
        group: "Apps",
        title: APP_SPECS[app].name,
        subtitle: APP_SPECS[app].blurb,
        keywords: [APP_SPECS[app].blurb],
        icon: <AppIcon app={app} className="size-5" />,
        run: () => dispatch({ type: "open", app }),
      })),
      ...notes.map<Item>((n) => ({
        id: `note:${n.slug}`,
        group: "Notes",
        title: n.title,
        subtitle: n.summary,
        keywords: [n.slug],
        icon: <NoteGlyph className="size-4" />,
        run: () => dispatch({ type: "open", app: "notes", slug: n.slug }),
      })),
      ...projects.map<Item>((p) => ({
        id: `project:${p.slug}`,
        group: "Projects",
        title: p.title,
        subtitle: p.summary,
        keywords: [p.slug, ...p.stack],
        icon: <FolderGlyph className="size-4" />,
        run: () => dispatch({ type: "open", app: "finder", slug: p.slug }),
      })),
      {
        id: "action:theme",
        group: "Actions",
        title: "Toggle light / dark theme",
        keywords: ["appearance", "mode"],
        icon: <BoltGlyph className="size-4" />,
        run: ui.toggleTheme,
      },
      {
        id: "action:shortcuts",
        group: "Actions",
        title: "Keyboard shortcuts",
        keywords: ["help", "keys"],
        icon: <BoltGlyph className="size-4" />,
        run: ui.openShortcuts,
      },
      {
        id: "action:github",
        group: "Actions",
        title: "Open GitHub profile",
        subtitle: site.github.replace("https://", ""),
        keywords: [site.githubHandle, "code"],
        icon: <BoltGlyph className="size-4" />,
        run: () => window.open(site.github, "_blank", "noopener"),
      },
    ],
    [dispatch, notes, projects, ui],
  );

  const results = useMemo(() => rank(items, query), [items, query]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setQuery(initialQuery);
      setActive(0);
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open, initialQuery]);

  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const choose = (i: number) => {
    const r = results[i];
    if (!r) return;
    // Close synchronously first: <dialog> restores focus to whatever had it
    // before (e.g. the Terminal input), which would otherwise re-focus that
    // window on top of the one we're about to open.
    dialogRef.current?.close();
    onClose();
    r.item.run();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const n = results.length;
    if (e.key === "ArrowDown" || (e.ctrlKey && e.key === "n")) {
      e.preventDefault();
      setActive((a) => (a + 1) % Math.max(n, 1));
    } else if (e.key === "ArrowUp" || (e.ctrlKey && e.key === "p")) {
      e.preventDefault();
      setActive((a) => (a - 1 + n) % Math.max(n, 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      choose(active);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      className="sheet glass w-[min(640px,calc(100vw-24px))]"
      aria-label="Command palette"
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {open && (
        <div onKeyDown={onKeyDown}>
          <div className="flex items-center gap-3 border-b border-line px-4">
            <SearchGlyph className="size-4 shrink-0 text-muted" />
            <input
              autoFocus
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
              placeholder="Search apps, notes, projects…"
              aria-label="Search"
              role="combobox"
              aria-expanded="true"
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={results[active] ? `${listId}-${active}` : undefined}
              className="h-12 w-full bg-transparent text-[15px] outline-none placeholder:text-faint"
              spellCheck={false}
              autoComplete="off"
            />
            <kbd className="kbd shrink-0 text-faint">esc</kbd>
          </div>
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            aria-label="Results"
            className="max-h-[min(420px,60vh)] overflow-y-auto p-2"
          >
            {results.length === 0 && (
              <li className="px-3 py-6 text-center text-sm text-muted" role="presentation">
                Nothing matches “{query}”. Try “terminal” or “etl”.
              </li>
            )}
            {results.map(({ item, match }, i) => {
              const header =
                !query.trim() && item.group !== results[i - 1]?.item.group ? item.group : null;
              return (
                <Fragment key={item.id}>
                  {header && (
                    <li
                      role="presentation"
                      className="px-3 pt-2 pb-1 text-[11px] font-semibold tracking-wide text-faint uppercase"
                    >
                      {header}
                    </li>
                  )}
                  <li
                    id={`${listId}-${i}`}
                    data-index={i}
                    role="option"
                    aria-selected={i === active}
                    className="flex cursor-default items-center gap-3 rounded-lg px-3 py-2 aria-selected:bg-selected"
                    onPointerMove={() => setActive(i)}
                    onClick={() => choose(i)}
                  >
                    <span className="grid size-6 shrink-0 place-items-center text-muted">
                      {item.icon}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm">
                        <Highlight text={item.title} indices={match.indices} />
                      </span>
                      {item.subtitle && (
                        <span className="block truncate text-xs text-muted">{item.subtitle}</span>
                      )}
                    </span>
                    {query.trim() && <span className="text-[11px] text-faint">{item.group}</span>}
                  </li>
                </Fragment>
              );
            })}
          </ul>
        </div>
      )}
    </dialog>
  );
}

"use client";

import { site } from "@/config/site";
import { AppIcon } from "@/icons/AppIcons";
import { SearchGlyph } from "@/icons/Glyphs";
import { APP_SPECS, DOCK_APPS } from "@/lib/wm/specs";
import type { AppId } from "@/lib/wm/types";
import { Clock } from "./Clock";
import { useDispatch, useUi } from "./DesktopContext";

/** Apps pinned to the bottom dock on the phone layout. */
const PHONE_DOCK: AppId[] = ["finder", "notes", "terminal", "music"];

/**
 * Phone layout: an iOS-style springboard. Rendered on every page but only
 * displayed under the compact breakpoint (pure CSS), so there is no
 * server/client mismatch and no flash when the layout switches.
 */
export function HomeScreen() {
  const dispatch = useDispatch();
  const ui = useUi();
  const launch = (app: AppId) => dispatch({ type: "open", app });

  return (
    <div className="hidden h-full flex-col px-5 pt-[max(env(safe-area-inset-top),12px)] pb-[max(env(safe-area-inset-bottom),12px)] max-[700px]:flex">
      <div
        className="flex items-center justify-between px-2 text-sm font-semibold"
        aria-hidden="true"
      >
        <Clock showDate={false} />
        <span className="text-xs opacity-70">{site.shortName}</span>
      </div>

      <div className="mt-8 mb-6 px-1">
        <p className="text-[13px] font-medium text-muted">{site.tagline}</p>
        <h1 className="text-[28px] leading-tight font-bold tracking-tight">{site.name}</h1>
      </div>

      <ul className="grid grid-cols-4 gap-x-4 gap-y-6" aria-label="Apps">
        {DOCK_APPS.map((app) => (
          <li key={app}>
            <button
              type="button"
              onClick={() => launch(app)}
              className="flex w-full flex-col items-center gap-1.5"
            >
              <AppIcon app={app} className="aspect-square w-full max-w-[64px] drop-shadow-md" />
              <span className="w-full truncate text-center text-[11px] font-medium">
                {APP_SPECS[app].name}
              </span>
            </button>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() => ui.openPalette()}
        className="glass mx-auto mt-auto mb-4 flex items-center gap-1.5 rounded-full bg-[var(--dock)] px-4 py-1.5 text-xs font-medium"
      >
        <SearchGlyph className="size-3" /> Search
      </button>

      <nav aria-label="Phone dock" className="glass rounded-[28px] bg-[var(--dock)] p-3">
        <ul className="grid grid-cols-4 gap-4">
          {PHONE_DOCK.map((app) => (
            <li key={app}>
              <button
                type="button"
                onClick={() => launch(app)}
                aria-label={APP_SPECS[app].name}
                className="block w-full"
              >
                <AppIcon app={app} className="aspect-square w-full max-w-[64px]" />
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

"use client";

import { site } from "@/config/site";
import { LogoMark, MoonGlyph, SearchGlyph, SunGlyph } from "@/icons/Glyphs";
import { APP_SPECS } from "@/lib/wm/specs";
import type { AppId } from "@/lib/wm/types";
import { Clock } from "./Clock";
import { useDispatch, useUi, useWm } from "./DesktopContext";
import { MenuButton, type MenuEntry } from "./MenuButton";
import { useModifierLabels } from "./shortcuts";
import type { WindowCommands } from "./WindowLayer";

export function MenuBar({ commands }: { commands: WindowCommands }) {
  const focused = useWm((s) => s.focused);
  const hasWindows = useWm((s) => s.windows.some((w) => !w.minimized));
  const dispatch = useDispatch();
  const ui = useUi();
  const { mod, alt } = useModifierLabels();
  const open = (app: AppId, slug?: string | null) => dispatch({ type: "open", app, slug });

  const siteMenu: MenuEntry[] = [
    { label: `About ${site.shortName}`, onSelect: () => open("notes", "about-me") },
    { label: "Résumé", onSelect: () => open("notes", "resume") },
    {
      label: "GitHub",
      external: true,
      onSelect: () => window.open(site.github, "_blank", "noopener"),
    },
    "separator",
    { label: "Command Palette…", shortcut: `${mod}K`, onSelect: () => ui.openPalette() },
    { label: "Toggle Light / Dark", onSelect: ui.toggleTheme },
    "separator",
    {
      label: "View Source",
      external: true,
      onSelect: () => window.open(site.repo, "_blank", "noopener"),
    },
  ];

  const windowMenu: MenuEntry[] = [
    {
      label: "Minimize",
      shortcut: `${alt}M`,
      disabled: !focused,
      onSelect: () => focused && commands.minimize(focused),
    },
    {
      label: "Zoom",
      shortcut: `${alt}F`,
      disabled: !focused,
      onSelect: () => focused && dispatch({ type: "toggleMaximize", app: focused }),
    },
    {
      label: "Close Window",
      shortcut: `${alt}W`,
      disabled: !focused,
      onSelect: () => focused && commands.close(focused),
    },
    "separator",
    {
      label: "Cycle Windows",
      shortcut: "⌃`",
      disabled: !hasWindows,
      onSelect: () => dispatch({ type: "cycle", direction: 1 }),
    },
  ];

  const helpMenu: MenuEntry[] = [
    { label: "Keyboard Shortcuts", shortcut: "?", onSelect: ui.openShortcuts },
    { label: "Open Terminal", onSelect: () => open("terminal") },
  ];

  return (
    <header className="glass fixed inset-x-0 top-0 z-[10000] flex h-[30px] items-center justify-between bg-[var(--menubar)] px-2 text-[13px] text-text max-[700px]:hidden">
      <nav aria-label="Menu bar" className="flex items-center gap-0.5">
        <MenuButton label="Site menu" items={siteMenu}>
          <LogoMark className="size-4" />
        </MenuButton>
        <span className="px-2 font-semibold" aria-live="polite">
          {focused ? APP_SPECS[focused].name : "Desktop"}
        </span>
        <MenuButton label="Window" items={windowMenu} className="max-sm:hidden">
          Window
        </MenuButton>
        <MenuButton label="Help" items={helpMenu} className="max-sm:hidden">
          Help
        </MenuButton>
      </nav>
      <div className="flex items-center gap-1">
        <button
          type="button"
          className="flex h-6 items-center rounded-[5px] px-2 hover:bg-hover"
          aria-label={`Search apps and projects (${mod}K)`}
          onClick={() => ui.openPalette()}
        >
          <SearchGlyph className="size-3.5" />
        </button>
        <button
          type="button"
          className="flex h-6 items-center rounded-[5px] px-2 hover:bg-hover"
          aria-label="Toggle light and dark theme"
          onClick={ui.toggleTheme}
        >
          {/* Both glyphs render; CSS shows the right one so SSR never guesses the theme. */}
          <SunGlyph className="size-3.5 [[data-theme=light]_&]:hidden" />
          <MoonGlyph className="hidden size-3.5 [[data-theme=light]_&]:block" />
        </button>
        <span className="px-2">
          <Clock />
        </span>
      </div>
    </header>
  );
}

"use client";

import { useSyncExternalStore } from "react";

/**
 * Global keyboard shortcuts. Browsers reserve Cmd/Ctrl+W, Cmd+`, Cmd+M etc.,
 * so window commands use Alt/Option, matched on `event.code` because Option
 * changes `event.key` on macOS (Option+W types "∑").
 */
export type ShortcutCommand =
  "palette" | "cycleForward" | "cycleBack" | "close" | "minimize" | "maximize" | "help";

interface KeyLike {
  key: string;
  code: string;
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
}

export function isEditable(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
}

export function matchShortcut(e: KeyLike, editable: boolean): ShortcutCommand | null {
  const mod = e.metaKey || e.ctrlKey;
  if (mod && !e.altKey && e.code === "KeyK") return "palette";
  if (e.ctrlKey && !e.metaKey && e.code === "Backquote")
    return e.shiftKey ? "cycleBack" : "cycleForward";
  if (e.altKey && !mod && !e.shiftKey) {
    if (e.code === "KeyW") return "close";
    if (e.code === "KeyM") return "minimize";
    if (e.code === "KeyF") return "maximize";
  }
  if (!editable && !mod && !e.altKey && e.key === "?") return "help";
  return null;
}

export const SHORTCUTS: { keys: (mod: string, alt: string) => string; label: string }[] = [
  { keys: (mod) => `${mod} K`, label: "Command palette: open any app or project" },
  { keys: () => "Ctrl `", label: "Cycle windows (add Shift to go back)" },
  { keys: (_, alt) => `${alt} W`, label: "Close the focused window" },
  { keys: (_, alt) => `${alt} M`, label: "Minimize the focused window" },
  { keys: (_, alt) => `${alt} F`, label: "Maximize / restore the focused window" },
  { keys: (_, alt) => `${alt} ← ↑ → ↓`, label: "Move the focused window (hold Shift to resize)" },
  { keys: () => "← →", label: "Move between dock icons" },
  { keys: () => "Esc", label: "Close menus and dialogs" },
  { keys: () => "?", label: "Show this list" },
];

const isMacSnapshot = () => /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

/** "⌘"/"⌥" on Apple platforms, "Ctrl"/"Alt" elsewhere. Server render assumes Apple. */
export function useModifierLabels() {
  const mac = useSyncExternalStore(
    () => () => {},
    isMacSnapshot,
    () => true,
  );
  return mac ? { mod: "⌘", alt: "⌥" } : { mod: "Ctrl", alt: "Alt" };
}

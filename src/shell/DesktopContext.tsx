"use client";

import { createContext, use, type ReactNode } from "react";
import { useStore } from "zustand";
import type { ContentIndex } from "@/content/schema";
import type { WmAction } from "@/lib/wm/reducer";
import type { WmStoreApi } from "@/lib/wm/store";
import type { WmState } from "@/lib/wm/types";
import type { WindowCommands } from "./WindowLayer";

/** Server-rendered MDX bodies keyed by "notes/<slug>" or "projects/<slug>". */
export type Bodies = Record<string, ReactNode>;

export interface DesktopUi {
  openPalette: (query?: string) => void;
  openShortcuts: () => void;
  toggleTheme: () => void;
}

interface DesktopContextValue {
  store: WmStoreApi;
  content: ContentIndex;
  bodies: Bodies;
  ui: DesktopUi;
  commands: WindowCommands;
}

const DesktopContext = createContext<DesktopContextValue | null>(null);

export function DesktopProvider({
  value,
  children,
}: {
  value: DesktopContextValue;
  children: ReactNode;
}) {
  return <DesktopContext value={value}>{children}</DesktopContext>;
}

function useDesktop() {
  const ctx = use(DesktopContext);
  if (!ctx) throw new Error("Desktop hooks must be used inside <DesktopProvider>");
  return ctx;
}

/** Subscribe to a slice of window-manager state. Re-renders only when the slice changes. */
export function useWm<T>(selector: (state: WmState) => T): T {
  const { store } = useDesktop();
  return useStore(store, (s) => selector(s.state));
}

export function useDispatch(): (action: WmAction) => void {
  return useStore(useDesktop().store, (s) => s.dispatch);
}

export function useWmStore(): WmStoreApi {
  return useDesktop().store;
}

export function useContent() {
  const { content, bodies } = useDesktop();
  return { ...content, bodies };
}

export function useUi(): DesktopUi {
  return useDesktop().ui;
}

export function useWindowCommands(): WindowCommands {
  return useDesktop().commands;
}

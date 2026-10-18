import { createStore } from "zustand/vanilla";
import { getWindow, reduce, routeOf, type WmAction } from "./reducer";
import { hrefFor } from "./routes";
import type { Route, WmState } from "./types";

export type HistoryMode = "push" | "replace";

/**
 * Decide how a state change should be reflected in browser history.
 * - Opening a new window, or showing a different document → push (Back undoes it).
 * - Focus, minimize, close → replace (the URL tracks focus without spamming history).
 * - `route` actions came *from* history, so they never write back to it.
 */
export function historyModeFor(prev: WmState, next: WmState, action: WmAction): HistoryMode | null {
  if (action.type === "route") return null;
  if (hrefFor(routeOf(prev)) === hrefFor(routeOf(next))) return null;
  if (action.type === "navigate") return "push";
  if (action.type === "open") {
    const before = getWindow(prev, action.app);
    const after = getWindow(next, action.app);
    if (!before || before.slug !== after?.slug) return "push";
  }
  return "replace";
}

export interface WmStore {
  state: WmState;
  dispatch: (action: WmAction) => void;
}

export interface WmStoreOptions {
  /** Called when the focused route changes because of something the user did in the UI. */
  onRouteChange?: (route: Route | null, mode: HistoryMode) => void;
}

/**
 * One store per mounted desktop (not a module singleton), so server renders
 * of different URLs never share window state.
 */
export function createWmStore(initial: WmState, options: WmStoreOptions = {}) {
  return createStore<WmStore>()((set, get) => ({
    state: initial,
    dispatch(action) {
      const prev = get().state;
      const next = reduce(prev, action);
      if (next === prev) return;
      set({ state: next });
      const mode = historyModeFor(prev, next, action);
      if (mode) options.onRouteChange?.(routeOf(next), mode);
    },
  }));
}

export type WmStoreApi = ReturnType<typeof createWmStore>;

import { cascadePlacement, clampPosition, clampResize, fitSize, workArea } from "./geometry";
import { APP_SPECS } from "./specs";
import type { AppId, Bounds, Route, Size, WindowState, WmState } from "./types";

/**
 * The window manager is a pure reducer: (state, action) → state.
 * Everything about z-order, focus, and bounds lives here so it can be tested
 * without a DOM. React components only dispatch actions and render state.
 */
export type WmAction =
  /** Open an app, or focus it if already open. `slug: undefined` keeps the current document. */
  | { type: "open"; app: AppId; slug?: string | null }
  | { type: "close"; app: AppId }
  | { type: "focus"; app: AppId }
  | { type: "blur" }
  | { type: "minimize"; app: AppId }
  | { type: "toggleMaximize"; app: AppId }
  | { type: "move"; app: AppId; x: number; y: number }
  | { type: "resize"; app: AppId; bounds: Bounds }
  | { type: "navigate"; app: AppId; slug: string | null }
  | { type: "setViewport"; viewport: Size }
  | { type: "cycle"; direction: 1 | -1 }
  /** The URL changed underneath us (back/forward). `null` = the desktop root. */
  | { type: "route"; route: Route | null };

export const DEFAULT_VIEWPORT: Size = { w: 1440, h: 900 };

export function initialState(route: Route | null, viewport: Size = DEFAULT_VIEWPORT): WmState {
  const empty: WmState = { windows: [], focused: null, viewport };
  return route ? reduce(empty, { type: "open", app: route.app, slug: route.slug }) : empty;
}

/** Topmost window that isn't minimized. */
export function topVisible(windows: WindowState[]): AppId | null {
  for (let i = windows.length - 1; i >= 0; i--) {
    if (!windows[i].minimized) return windows[i].app;
  }
  return null;
}

export function getWindow(state: WmState, app: AppId) {
  return state.windows.find((w) => w.app === app);
}

/** The route the URL should show for this state. */
export function routeOf(state: WmState): Route | null {
  const win = state.focused ? getWindow(state, state.focused) : undefined;
  return win ? { app: win.app, slug: win.slug } : null;
}

function bringToFront(windows: WindowState[], app: AppId, patch: Partial<WindowState> = {}) {
  const target = windows.find((w) => w.app === app);
  if (!target) return windows;
  return [...windows.filter((w) => w.app !== app), { ...target, ...patch }];
}

function update(state: WmState, app: AppId, fn: (w: WindowState) => WindowState): WmState {
  if (!getWindow(state, app)) return state;
  return { ...state, windows: state.windows.map((w) => (w.app === app ? fn(w) : w)) };
}

function createWindow(state: WmState, app: AppId, slug: string | null): WindowState {
  const spec = APP_SPECS[app];
  const size = fitSize(spec.defaultSize, spec.minSize, state.viewport);
  return {
    app,
    slug,
    bounds: cascadePlacement(size, state.windows.length, state.viewport),
    restore: null,
    minimized: false,
    maximized: false,
    userPlaced: false,
  };
}

export function reduce(state: WmState, action: WmAction): WmState {
  switch (action.type) {
    case "open": {
      const existing = getWindow(state, action.app);
      if (existing) {
        const slug = action.slug === undefined ? existing.slug : action.slug;
        return {
          ...state,
          windows: bringToFront(state.windows, action.app, { minimized: false, slug }),
          focused: action.app,
        };
      }
      const slug = action.slug === undefined ? APP_SPECS[action.app].defaultSlug : action.slug;
      return {
        ...state,
        windows: [...state.windows, createWindow(state, action.app, slug)],
        focused: action.app,
      };
    }

    case "close": {
      if (!getWindow(state, action.app)) return state;
      const windows = state.windows.filter((w) => w.app !== action.app);
      return { ...state, windows, focused: topVisible(windows) };
    }

    case "focus": {
      if (!getWindow(state, action.app)) return state;
      if (state.focused === action.app && topVisible(state.windows) === action.app) return state;
      return {
        ...state,
        windows: bringToFront(state.windows, action.app, { minimized: false }),
        focused: action.app,
      };
    }

    case "blur":
      return state.focused === null ? state : { ...state, focused: null };

    case "minimize": {
      const next = update(state, action.app, (w) => ({ ...w, minimized: true }));
      if (next === state) return state;
      return { ...next, focused: topVisible(next.windows) };
    }

    case "toggleMaximize":
      return update(state, action.app, (w) =>
        w.maximized
          ? { ...w, maximized: false, bounds: w.restore ?? w.bounds, restore: null }
          : { ...w, maximized: true, restore: w.bounds, bounds: workArea(state.viewport) },
      );

    case "move":
      return update(state, action.app, (w) => {
        // Dragging a maximized window un-maximizes it to its previous size.
        const size = w.maximized && w.restore ? w.restore : w.bounds;
        return {
          ...w,
          maximized: false,
          restore: null,
          userPlaced: true,
          bounds: clampPosition({ x: action.x, y: action.y, w: size.w, h: size.h }, state.viewport),
        };
      });

    case "resize":
      return update(state, action.app, (w) => ({
        ...w,
        maximized: false,
        restore: null,
        userPlaced: true,
        bounds: clampResize(action.bounds, APP_SPECS[w.app].minSize, state.viewport),
      }));

    case "navigate":
      return update(state, action.app, (w) =>
        w.slug === action.slug ? w : { ...w, slug: action.slug },
      );

    case "setViewport": {
      const viewport = action.viewport;
      if (viewport.w === state.viewport.w && viewport.h === state.viewport.h) return state;
      const windows = state.windows.map((w, i) => {
        if (w.maximized) return { ...w, bounds: workArea(viewport) };
        const spec = APP_SPECS[w.app];
        if (!w.userPlaced) {
          const size = fitSize(spec.defaultSize, spec.minSize, viewport);
          return { ...w, bounds: cascadePlacement(size, i, viewport) };
        }
        const size = fitSize(w.bounds, spec.minSize, viewport);
        return { ...w, bounds: clampPosition({ ...w.bounds, ...size }, viewport) };
      });
      return { ...state, viewport, windows };
    }

    case "cycle": {
      const visible = state.windows.filter((w) => !w.minimized);
      if (visible.length < 2) return state;
      if (action.direction === 1) {
        // Bring the bottom-most visible window to the front.
        return reduce(state, { type: "focus", app: visible[0].app });
      }
      // Send the front window to the back.
      const top = visible[visible.length - 1];
      const windows = [top, ...state.windows.filter((w) => w.app !== top.app)];
      return { ...state, windows, focused: topVisible(windows) };
    }

    case "route": {
      const { route } = action;
      if (!route) {
        // Going back to "/" exits the app you were in, like leaving an app on a phone.
        return state.focused ? reduce(state, { type: "close", app: state.focused }) : state;
      }
      const opened = reduce(state, { type: "open", app: route.app, slug: route.slug });
      return opened;
    }
  }
}

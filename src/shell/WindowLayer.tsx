"use client";

import { APP_COMPONENTS } from "@/apps";
import { windowTitle } from "@/lib/titles";
import type { AppId } from "@/lib/wm/types";
import { useContent, useDispatch, useWm } from "./DesktopContext";
import { Window, type WindowHandle } from "./Window";

/** Animated window commands, for callers outside the window (menus, shortcuts, terminal). */
export interface WindowCommands {
  close(app: AppId): void;
  minimize(app: AppId): void;
}

export function createWindowCommands(
  handles: Map<AppId, WindowHandle>,
  fallback: (action: { type: "close" | "minimize"; app: AppId }) => void,
): WindowCommands {
  const run = (kind: "close" | "minimize", app: AppId) => {
    const handle = handles.get(app);
    if (handle) handle[kind]();
    else fallback({ type: kind, app });
  };
  return {
    close: (app) => run("close", app),
    minimize: (app) => run("minimize", app),
  };
}

/** z-index base so windows sit above the wallpaper/home screen and below the menu bar & dock. */
const Z_BASE = 10;

export function WindowLayer({
  handles,
  initialApps,
}: {
  handles: Map<AppId, WindowHandle>;
  initialApps: ReadonlySet<AppId>;
}) {
  const windows = useWm((s) => s.windows);
  const focused = useWm((s) => s.focused);
  const dispatch = useDispatch();
  const content = useContent();

  // Render in a stable (app-id) order and express z-order via z-index, so
  // focusing a window never re-parents DOM nodes (which would reset scroll,
  // restart iframes, and drop focus).
  const stable = [...windows].sort((a, b) => a.app.localeCompare(b.app));

  return (
    <div className="pointer-events-none fixed inset-0 max-[700px]:z-[11000]">
      {stable.map((win) => {
        const App = APP_COMPONENTS[win.app];
        return (
          <Window
            key={win.app}
            win={win}
            zIndex={Z_BASE + windows.indexOf(win)}
            focused={focused === win.app}
            title={windowTitle(win, content)}
            autoFocus={!initialApps.has(win.app)}
            dispatch={dispatch}
            handle={(h) => {
              if (h) handles.set(win.app, h);
              else handles.delete(win.app);
            }}
          >
            <App win={win} />
          </Window>
        );
      })}
    </div>
  );
}

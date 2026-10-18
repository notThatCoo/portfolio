"use client";

import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { ContentIndex } from "@/content/schema";
import { currentTheme, setTheme } from "@/lib/theme";
import { pageTitle } from "@/lib/titles";
import { initialState } from "@/lib/wm/reducer";
import { hrefFor, parsePath } from "@/lib/wm/routes";
import { createWmStore, type WmStoreApi } from "@/lib/wm/store";
import type { AppId } from "@/lib/wm/types";
import { CommandPalette } from "./CommandPalette";
import { DesktopProvider, type Bodies, type DesktopUi } from "./DesktopContext";
import { Dock } from "./Dock";
import { HomeScreen } from "./HomeScreen";
import { MenuBar } from "./MenuBar";
import { ShortcutsDialog } from "./ShortcutsDialog";
import { isEditable, matchShortcut } from "./shortcuts";
import type { WindowHandle } from "./Window";
import { WindowLayer, createWindowCommands } from "./WindowLayer";

interface DesktopProps {
  content: ContentIndex;
  bodies: Bodies;
  children?: ReactNode;
}

/**
 * Root of the shell. Owns the window-manager store and keeps it in sync with
 * the browser:
 *   UI action → store → history.pushState/replaceState (+ document.title)
 *   Back/forward (popstate) → store `route` action (never writes history back)
 * All content is already on the page, so switching windows needs no server
 * round trip; the real per-URL pages exist for deep links, SEO and previews.
 */
export function Desktop({ content, bodies, children }: DesktopProps) {
  const pathname = usePathname();

  const [store] = useState<WmStoreApi>(() =>
    createWmStore(initialState(parsePath(pathname)), {
      onRouteChange(route, mode) {
        const href = hrefFor(route);
        if (href !== window.location.pathname) {
          window.history[mode === "push" ? "pushState" : "replaceState"](null, "", href);
        }
        document.title = pageTitle(route, content);
      },
    }),
  );
  // Windows rendered on the server shouldn't grab focus on hydration.
  const [initialApps] = useState(
    () => new Set<AppId>(store.getState().state.windows.map((w) => w.app)),
  );
  // A stable mutable registry of window handles (not render state).
  const [handles] = useState(() => new Map<AppId, WindowHandle>());
  const dispatch = store.getState().dispatch;
  const commands = useMemo(() => createWindowCommands(handles, dispatch), [handles, dispatch]);

  const [palette, setPalette] = useState<{ open: boolean; query: string }>({
    open: false,
    query: "",
  });
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const ui = useMemo<DesktopUi>(
    () => ({
      openPalette: (query = "") => setPalette({ open: true, query }),
      openShortcuts: () => setShortcutsOpen(true),
      toggleTheme: () => setTheme(currentTheme() === "dark" ? "light" : "dark"),
    }),
    [],
  );

  // Marks the shell as interactive (used by e2e tests to wait for hydration).
  useEffect(() => {
    document.documentElement.dataset.ready = "true";
  }, []);

  // Back / forward.
  useEffect(() => {
    const onPop = () => {
      const route = parsePath(window.location.pathname);
      dispatch({ type: "route", route });
      document.title = pageTitle(route, content);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [dispatch, content]);

  // Track the viewport so windows stay reachable after resizes and rotations.
  useEffect(() => {
    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() =>
        dispatch({
          type: "setViewport",
          viewport: { w: window.innerWidth, h: window.innerHeight },
        }),
      );
    };
    measure();
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", measure);
    };
  }, [dispatch]);

  // Global shortcuts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const command = matchShortcut(e, isEditable(e.target));
      if (!command) return;
      const { focused } = store.getState().state;
      e.preventDefault();
      switch (command) {
        case "palette":
          setPalette((p) => ({ open: !p.open, query: "" }));
          break;
        case "help":
          setShortcutsOpen(true);
          break;
        case "cycleForward":
        case "cycleBack":
          dispatch({ type: "cycle", direction: command === "cycleForward" ? 1 : -1 });
          break;
        case "close":
          if (focused) commands.close(focused);
          break;
        case "minimize":
          if (focused) commands.minimize(focused);
          break;
        case "maximize":
          if (focused) dispatch({ type: "toggleMaximize", app: focused });
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [store, dispatch, commands]);

  return (
    <DesktopProvider value={{ store, content, bodies, ui, commands }}>
      <a href="#desktop" className="skip-link">
        Skip to desktop
      </a>
      <div className="wallpaper" aria-hidden="true" />
      <MenuBar commands={commands} />
      <main
        id="desktop"
        tabIndex={-1}
        aria-label="Desktop"
        className="fixed inset-0 outline-none"
        onPointerDown={(e) => e.target === e.currentTarget && dispatch({ type: "blur" })}
      >
        <h1 className="sr-only">Tolu Adeleye: portfolio desktop</h1>
        <HomeScreen />
        <WindowLayer handles={handles} initialApps={initialApps} />
        {children}
      </main>
      <Dock />
      <CommandPalette
        open={palette.open}
        initialQuery={palette.query}
        onClose={() => setPalette({ open: false, query: "" })}
      />
      <ShortcutsDialog open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </DesktopProvider>
  );
}

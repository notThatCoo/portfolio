"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import type { AppId, WindowState } from "@/lib/wm/types";
import FinderApp from "./finder/FinderApp";
import NotesApp from "./notes/NotesApp";

export interface AppProps {
  win: WindowState;
}

function Loading() {
  return <div className="grid h-full place-items-center text-sm text-muted">Loading…</div>;
}

/**
 * Notes and Finder are imported statically: they're the server-rendered
 * content pages. Everything else is split into its own chunk and only loaded
 * when its window opens, so the ONNX runtime never touches the first load.
 */
export const APP_COMPONENTS: Record<AppId, ComponentType<AppProps>> = {
  notes: NotesApp,
  finder: FinderApp,
  terminal: dynamic(() => import("./terminal/TerminalApp"), { loading: Loading }),
  detector: dynamic(() => import("./detector/DetectorApp"), { loading: Loading }),
  activity: dynamic(() => import("./activity/ActivityApp"), { loading: Loading }),
  music: dynamic(() => import("./music/MusicApp"), { loading: Loading }),
};

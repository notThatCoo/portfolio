import type { AppId, Size } from "./types";

/**
 * Plain-data description of each app. Kept free of React so the reducer and
 * server code can import it without pulling in components.
 */
export interface AppSpec {
  id: AppId;
  name: string;
  defaultSize: Size;
  minSize: Size;
  /** Slug to open when launched from the dock or palette with no document. */
  defaultSlug: string | null;
  /** Short line for the command palette and terminal `ls /apps`. */
  blurb: string;
}

export const APP_SPECS: Record<AppId, AppSpec> = {
  notes: {
    id: "notes",
    name: "Notes",
    defaultSize: { w: 820, h: 580 },
    minSize: { w: 420, h: 300 },
    defaultSlug: "about-me",
    blurb: "About me and résumé",
  },
  finder: {
    id: "finder",
    name: "Finder",
    defaultSize: { w: 860, h: 560 },
    minSize: { w: 440, h: 300 },
    defaultSlug: null,
    blurb: "Projects, one folder each",
  },
  terminal: {
    id: "terminal",
    name: "Terminal",
    defaultSize: { w: 680, h: 420 },
    minSize: { w: 360, h: 220 },
    defaultSlug: null,
    blurb: "A real shell for this site",
  },
  detector: {
    id: "detector",
    name: "Detector",
    defaultSize: { w: 940, h: 620 },
    minSize: { w: 560, h: 420 },
    defaultSlug: null,
    blurb: "Toy light-yield surrogate, in-browser",
  },
  activity: {
    id: "activity",
    name: "Activity Monitor",
    defaultSize: { w: 720, h: 480 },
    minSize: { w: 420, h: 300 },
    defaultSlug: null,
    blurb: "Live metrics (crypto bot coming soon)",
  },
  music: {
    id: "music",
    name: "Music",
    defaultSize: { w: 520, h: 460 },
    minSize: { w: 340, h: 320 },
    defaultSlug: null,
    blurb: "Afrobeats playlist",
  },
};

/** Dock order. */
export const DOCK_APPS: AppId[] = ["finder", "notes", "terminal", "detector", "activity", "music"];

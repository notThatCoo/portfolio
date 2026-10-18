export const APP_IDS = ["notes", "finder", "terminal", "detector", "activity", "music"] as const;

export type AppId = (typeof APP_IDS)[number];

export function isAppId(value: string): value is AppId {
  return (APP_IDS as readonly string[]).includes(value);
}

export interface Size {
  w: number;
  h: number;
}

export interface Bounds extends Size {
  x: number;
  y: number;
}

export interface WindowState {
  app: AppId;
  /** Document shown inside the app (a note, a project). `null` = app root. */
  slug: string | null;
  bounds: Bounds;
  /** Bounds to return to when un-maximizing. */
  restore: Bounds | null;
  minimized: boolean;
  maximized: boolean;
  /** False until the user drags/resizes; auto-placed windows re-center on viewport changes. */
  userPlaced: boolean;
}

export interface WmState {
  /** Bottom → top. The array order *is* the z-order. */
  windows: WindowState[];
  focused: AppId | null;
  viewport: Size;
}

export interface Route {
  app: AppId;
  slug: string | null;
}

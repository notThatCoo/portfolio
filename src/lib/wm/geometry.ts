import type { Bounds, Size } from "./types";

/** Height of the menu bar; windows never go above it. */
export const MENU_BAR_H = 30;
/** Space reserved for the dock when maximizing. */
export const DOCK_RESERVE = 84;
/** How much of a window must stay on-screen horizontally so it can be grabbed again. */
export const GRAB_MARGIN = 96;
/** Vertical equivalent: the title bar must stay above this distance from the bottom. */
export const TITLE_MARGIN = 36;
const CASCADE_STEP = 28;
const CASCADE_SLOTS = 6;
const EDGE_GAP = 12;

export function workArea(viewport: Size): Bounds {
  return {
    x: 0,
    y: MENU_BAR_H,
    w: viewport.w,
    h: Math.max(0, viewport.h - MENU_BAR_H - DOCK_RESERVE),
  };
}

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), Math.max(lo, hi));

/** Fit a size inside the work area, never below `min`. */
export function fitSize(size: Size, min: Size, viewport: Size): Size {
  const area = workArea(viewport);
  return {
    w: Math.round(clamp(size.w, min.w, area.w - EDGE_GAP * 2)),
    h: Math.round(clamp(size.h, min.h, area.h - EDGE_GAP * 2)),
  };
}

/** Centered placement, offset diagonally by `slot` so new windows don't stack exactly. */
export function cascadePlacement(size: Size, slot: number, viewport: Size): Bounds {
  const area = workArea(viewport);
  const offset = (slot % CASCADE_SLOTS) * CASCADE_STEP;
  const baseX = area.x + (area.w - size.w) / 2 - CASCADE_STEP;
  const baseY = area.y + Math.max(EDGE_GAP, (area.h - size.h) / 2 - CASCADE_STEP);
  return clampPosition(
    { ...size, x: Math.round(baseX + offset), y: Math.round(baseY + offset) },
    viewport,
  );
}

/** Keep enough of the window visible to grab its title bar. */
export function clampPosition(b: Bounds, viewport: Size): Bounds {
  return {
    ...b,
    x: Math.round(clamp(b.x, GRAB_MARGIN - b.w, viewport.w - GRAB_MARGIN)),
    y: Math.round(clamp(b.y, MENU_BAR_H, viewport.h - TITLE_MARGIN)),
  };
}

/**
 * Enforce minimum size and keep the top edge below the menu bar. The drag
 * handler already anchors the opposite edge, so this is only a safety net.
 */
export function clampResize(b: Bounds, min: Size, viewport: Size): Bounds {
  return clampPosition(
    {
      x: b.x,
      y: Math.max(MENU_BAR_H, b.y),
      w: Math.round(Math.max(min.w, b.w)),
      h: Math.round(Math.max(min.h, b.h)),
    },
    viewport,
  );
}

/**
 * Compute new bounds while dragging a resize handle. `edges` names the sides
 * being dragged (e.g. "se" = bottom-right). The opposite edges stay put, and
 * the minimum size is enforced without letting the window drift.
 */
export type ResizeEdge = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

export function resizeFrom(
  start: Bounds,
  edge: ResizeEdge,
  dx: number,
  dy: number,
  min: Size,
): Bounds {
  let { x, y, w, h } = start;
  if (edge.includes("e")) w = Math.max(min.w, start.w + dx);
  if (edge.includes("s")) h = Math.max(min.h, start.h + dy);
  if (edge.includes("w")) {
    w = Math.max(min.w, start.w - dx);
    x = start.x + (start.w - w);
  }
  if (edge.includes("n")) {
    const maxGrow = start.y - MENU_BAR_H;
    h = Math.max(min.h, Math.min(start.h - dy, start.h + maxGrow));
    y = start.y + (start.h - h);
  }
  return { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) };
}

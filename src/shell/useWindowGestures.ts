"use client";

import {
  useCallback,
  useLayoutEffect,
  useRef,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";
import { resizeFrom, type ResizeEdge } from "@/lib/wm/geometry";
import type { WmAction } from "@/lib/wm/reducer";
import { APP_SPECS } from "@/lib/wm/specs";
import type { Bounds, WindowState } from "@/lib/wm/types";

const DRAG_THRESHOLD = 3;

function paint(el: HTMLElement, b: Partial<Bounds>) {
  if (b.x !== undefined) el.style.setProperty("--x", `${b.x}px`);
  if (b.y !== undefined) el.style.setProperty("--y", `${b.y}px`);
  if (b.w !== undefined) el.style.setProperty("--w", `${b.w}px`);
  if (b.h !== undefined) el.style.setProperty("--h", `${b.h}px`);
}

/**
 * Pointer-driven move and resize. While the pointer is down we write CSS
 * variables straight to the element once per animation frame (no React
 * renders), then commit the final bounds to the store on release.
 */
export function useWindowGestures(
  ref: RefObject<HTMLElement | null>,
  win: WindowState,
  dispatch: (a: WmAction) => void,
  enabled: boolean,
) {
  // Read the latest window state inside long-lived pointer handlers.
  const latest = useRef(win);
  useLayoutEffect(() => {
    latest.current = win;
  });

  const track = useCallback(
    (
      e: ReactPointerEvent,
      onMove: (dx: number, dy: number) => Bounds,
      onCommit: (b: Bounds) => void,
    ) => {
      const el = ref.current;
      if (!el) return;
      const target = e.currentTarget as HTMLElement;
      const startX = e.clientX;
      const startY = e.clientY;
      const pointerId = e.pointerId;
      let frame = 0;
      let last: Bounds | null = null;
      let active = false;
      target.setPointerCapture(pointerId);

      const move = (ev: PointerEvent) => {
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        if (!active) {
          if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
          active = true;
          el.dataset.dragging = "true";
        }
        last = onMove(dx, dy);
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => last && paint(el, last));
      };
      const end = () => {
        target.removeEventListener("pointermove", move);
        target.removeEventListener("pointerup", end);
        target.removeEventListener("pointercancel", end);
        cancelAnimationFrame(frame);
        delete el.dataset.dragging;
        if (active && last) onCommit(last);
      };
      target.addEventListener("pointermove", move);
      target.addEventListener("pointerup", end);
      target.addEventListener("pointercancel", end);
    },
    [ref],
  );

  const onTitlePointerDown = useCallback(
    (e: ReactPointerEvent) => {
      if (!enabled || e.button !== 0) return;
      if ((e.target as HTMLElement).closest("button, a, input")) return;
      const w = latest.current;
      let start = w.bounds;
      if (w.maximized && w.restore) {
        // Pull a maximized window out under the cursor at its restored size.
        const rel = (e.clientX - w.bounds.x) / w.bounds.w;
        start = { ...w.restore, x: e.clientX - w.restore.w * rel, y: w.bounds.y };
      }
      track(
        e,
        (dx, dy) => ({ ...start, x: start.x + dx, y: start.y + dy }),
        (b) => dispatch({ type: "move", app: w.app, x: b.x, y: b.y }),
      );
    },
    [dispatch, enabled, track],
  );

  const onHandlePointerDown = useCallback(
    (edge: ResizeEdge) => (e: ReactPointerEvent) => {
      if (!enabled || e.button !== 0) return;
      e.stopPropagation();
      const w = latest.current;
      const start = w.bounds;
      const min = APP_SPECS[w.app].minSize;
      track(
        e,
        (dx, dy) => resizeFrom(start, edge, dx, dy, min),
        (bounds) => dispatch({ type: "resize", app: w.app, bounds }),
      );
    },
    [dispatch, enabled, track],
  );

  return { onTitlePointerDown, onHandlePointerDown };
}

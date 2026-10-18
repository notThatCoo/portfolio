"use client";

import { useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { AppIcon } from "@/icons/AppIcons";
import { usePrefersReducedMotion } from "@/lib/hooks/useMediaQuery";
import { APP_SPECS, DOCK_APPS } from "@/lib/wm/specs";
import type { AppId } from "@/lib/wm/types";
import { useDispatch, useWm } from "./DesktopContext";

/** Peak scale under the cursor, and how many icon-widths the effect reaches. */
const MAX_SCALE = 1.65;
const REACH = 2.6;

/**
 * Magnification follows a cosine falloff around the pointer. Exported so the
 * curve is unit-tested independently of the DOM.
 */
export function magnify(distance: number, base: number): number {
  const reach = base * REACH;
  if (distance >= reach) return 1;
  return 1 + (MAX_SCALE - 1) * (0.5 + 0.5 * Math.cos((Math.PI * distance) / reach));
}

export function Dock() {
  const dispatch = useDispatch();
  // Select a primitive so the dock only re-renders when the set of open apps changes.
  const runningKey = useWm((s) =>
    s.windows
      .map((w) => w.app)
      .sort()
      .join(","),
  );
  const running = useMemo(() => new Set(runningKey.split(",")), [runningKey]);
  const reducedMotion = usePrefersReducedMotion();
  const listRef = useRef<HTMLUListElement>(null);
  const centers = useRef<number[]>([]);
  const [bouncing, setBouncing] = useState<AppId | null>(null);

  const items = () =>
    Array.from(listRef.current?.querySelectorAll<HTMLElement>(".dock-item") ?? []);

  const onPointerEnter = () => {
    // Measure resting centers once per hover so scaling doesn't feed back into itself.
    centers.current = items().map((el) => {
      const r = el.getBoundingClientRect();
      return r.left + r.width / 2;
    });
  };

  const onPointerMove = (e: PointerEvent) => {
    if (reducedMotion || e.pointerType !== "mouse") return;
    const base = parseFloat(getComputedStyle(listRef.current!).getPropertyValue("--base")) || 52;
    items().forEach((el, i) => {
      el.style.setProperty(
        "--s",
        magnify(Math.abs(e.clientX - centers.current[i]), base).toFixed(3),
      );
    });
  };

  const onPointerLeave = () => items().forEach((el) => el.style.setProperty("--s", "1"));

  const launch = (app: AppId) => {
    if (!running.has(app) && !reducedMotion) {
      setBouncing(app);
      window.setTimeout(() => setBouncing(null), 520);
    }
    dispatch({ type: "open", app });
  };

  // Arrow keys move between dock items; Tab still moves in/out normally.
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    const buttons = items();
    const i = buttons.indexOf(document.activeElement as HTMLElement);
    if (i < 0) return;
    e.preventDefault();
    const next = (i + (e.key === "ArrowRight" ? 1 : -1) + buttons.length) % buttons.length;
    buttons[next].focus();
  };

  return (
    <nav
      aria-label="Dock"
      className="pointer-events-none fixed inset-x-0 bottom-2 z-[9000] flex justify-center max-[700px]:hidden"
    >
      <ul
        ref={listRef}
        className="dock glass pointer-events-auto"
        onPointerEnter={onPointerEnter}
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
        onKeyDown={onKeyDown}
      >
        {DOCK_APPS.map((app) => {
          const name = APP_SPECS[app].name;
          const isRunning = running.has(app);
          return (
            <li key={app} className="flex">
              <button
                type="button"
                className="dock-item"
                data-bounce={bouncing === app}
                aria-label={isRunning ? `${name} (open)` : name}
                onClick={() => launch(app)}
              >
                <AppIcon app={app} />
                <span className="dock-label" aria-hidden="true">
                  {name}
                </span>
                {isRunning && <span className="dock-dot" aria-hidden="true" />}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

"use client";

import {
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
} from "react";
import { ChevronLeft, CloseGlyph, MaximizeGlyph, MinimizeGlyph } from "@/icons/Glyphs";
import { useIsCompact } from "@/lib/hooks/useMediaQuery";
import type { ResizeEdge } from "@/lib/wm/geometry";
import type { WmAction } from "@/lib/wm/reducer";
import type { WindowState } from "@/lib/wm/types";
import { useWindowGestures } from "./useWindowGestures";

const EDGES: ResizeEdge[] = ["n", "s", "e", "w", "ne", "nw", "se", "sw"];
const KEY_STEP = 16;
const KEY_STEP_LARGE = 64;

export interface WindowHandle {
  /** Play the close animation, then remove the window. */
  close(): void;
  /** Play the minimize animation, then minimize. */
  minimize(): void;
}

type Phase = "open" | "closing" | "minimizing";

interface WindowProps {
  win: WindowState;
  zIndex: number;
  focused: boolean;
  title: string;
  /** Move keyboard focus into the window when it gains focus. Off for windows present at page load. */
  autoFocus: boolean;
  dispatch: (a: WmAction) => void;
  handle: Ref<WindowHandle>;
  children: ReactNode;
}

export function Window({
  win,
  zIndex,
  focused,
  title,
  autoFocus,
  dispatch,
  handle,
  children,
}: WindowProps) {
  const ref = useRef<HTMLElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const [phase, setPhase] = useState<Phase>("open");
  const [animating, setAnimating] = useState(false);
  const compact = useIsCompact();
  const { app, bounds, minimized, maximized } = win;

  const { onTitlePointerDown, onHandlePointerDown } = useWindowGestures(
    ref,
    win,
    dispatch,
    !compact,
  );

  const close = useCallback(() => setPhase("closing"), []);
  const minimize = useCallback(() => setPhase("minimizing"), []);
  useImperativeHandle(handle, () => ({ close, minimize }), [close, minimize]);

  const onAnimationEnd = (e: React.AnimationEvent) => {
    if (e.target !== e.currentTarget) return;
    if (phase === "closing") dispatch({ type: "close", app });
    if (phase === "minimizing") {
      // Reset now: the window is about to be hidden, and restoring replays the CSS open animation.
      setPhase("open");
      dispatch({ type: "minimize", app });
    }
  };

  const toggleMaximize = () => {
    setAnimating(true);
    dispatch({ type: "toggleMaximize", app });
  };

  // Keep keyboard focus with the window the user is working in.
  const skipFirstFocus = useRef(!autoFocus);
  useEffect(() => {
    if (!focused || minimized) return;
    if (skipFirstFocus.current) {
      skipFirstFocus.current = false;
      return;
    }
    if (!ref.current?.contains(document.activeElement)) {
      bodyRef.current?.focus({ preventScroll: true });
    }
  }, [focused, minimized]);

  const onKeyDown = (e: KeyboardEvent) => {
    // Alt+Arrows moves the window; Alt+Shift+Arrows resizes it. Keyboard parity for drag.
    if (!e.altKey || compact || !e.key.startsWith("Arrow")) return;
    e.preventDefault();
    const step = e.metaKey || e.ctrlKey ? KEY_STEP_LARGE : KEY_STEP;
    const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
    const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
    if (e.shiftKey) {
      dispatch({
        type: "resize",
        app,
        bounds: { ...bounds, w: bounds.w + dx, h: bounds.h + dy },
      });
    } else {
      dispatch({ type: "move", app, x: bounds.x + dx, y: bounds.y + dy });
    }
  };

  const style = {
    "--x": `${bounds.x}px`,
    "--y": `${bounds.y}px`,
    "--w": `${bounds.w}px`,
    "--h": `${bounds.h}px`,
    zIndex,
  } as CSSProperties;

  return (
    <section
      ref={ref}
      className="wm-window glass"
      style={style}
      aria-labelledby={titleId}
      data-app={app}
      data-focused={focused}
      data-maximized={maximized}
      data-phase={phase}
      data-animating={animating}
      hidden={minimized}
      onPointerDownCapture={() => dispatch({ type: "focus", app })}
      onFocusCapture={() => !focused && dispatch({ type: "focus", app })}
      onAnimationEnd={onAnimationEnd}
      onTransitionEnd={(e) => e.target === e.currentTarget && setAnimating(false)}
      onKeyDown={onKeyDown}
    >
      <header
        className="wm-titlebar"
        onPointerDown={onTitlePointerDown}
        onDoubleClick={(e) => {
          if (!compact && !(e.target as HTMLElement).closest("button")) toggleMaximize();
        }}
      >
        <div className="wm-lights">
          <button
            type="button"
            className="wm-light"
            data-kind="close"
            aria-label={`Close ${title}`}
            onClick={close}
          >
            <CloseGlyph />
          </button>
          <button
            type="button"
            className="wm-light"
            data-kind="minimize"
            aria-label={`Minimize ${title}`}
            onClick={minimize}
          >
            <MinimizeGlyph />
          </button>
          <button
            type="button"
            className="wm-light"
            data-kind="maximize"
            aria-label={maximized ? `Restore ${title}` : `Maximize ${title}`}
            aria-pressed={maximized}
            onClick={toggleMaximize}
          >
            <MaximizeGlyph />
          </button>
        </div>
        {compact && (
          <button
            type="button"
            onClick={close}
            className="-ml-1 flex items-center gap-0.5 rounded-md px-1 py-1 text-[15px] text-accent"
          >
            <ChevronLeft className="size-4" />
            Home
          </button>
        )}
        <h2
          id={titleId}
          className="pointer-events-none absolute inset-x-28 truncate text-center text-[13px] font-semibold text-muted"
        >
          {title}
        </h2>
      </header>
      <div ref={bodyRef} className="wm-body" tabIndex={-1}>
        {children}
      </div>
      {!compact &&
        !maximized &&
        EDGES.map((edge) => (
          <div
            key={edge}
            className="wm-handle"
            data-edge={edge}
            aria-hidden="true"
            onPointerDown={onHandlePointerDown(edge)}
          />
        ))}
    </section>
  );
}

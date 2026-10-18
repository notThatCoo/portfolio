import { describe, expect, it } from "vitest";
import { MENU_BAR_H, workArea } from "./geometry";
import { getWindow, initialState, reduce, routeOf, type WmAction } from "./reducer";
import { APP_SPECS } from "./specs";
import type { WmState } from "./types";

const vp = { w: 1440, h: 900 };
const run = (state: WmState, ...actions: WmAction[]) => actions.reduce(reduce, state);
const empty = () => initialState(null, vp);
const order = (s: WmState) => s.windows.map((w) => w.app);

describe("open", () => {
  it("creates a focused window with the app's default document", () => {
    const s = run(empty(), { type: "open", app: "notes" });
    expect(order(s)).toEqual(["notes"]);
    expect(s.focused).toBe("notes");
    expect(getWindow(s, "notes")?.slug).toBe(APP_SPECS.notes.defaultSlug);
  });

  it("re-opening brings the window to the front instead of duplicating it", () => {
    const s = run(
      empty(),
      { type: "open", app: "notes" },
      { type: "open", app: "finder" },
      { type: "open", app: "notes" },
    );
    expect(order(s)).toEqual(["finder", "notes"]);
    expect(s.focused).toBe("notes");
  });

  it("keeps the current document when slug is omitted, replaces it when given", () => {
    let s = run(empty(), { type: "open", app: "finder", slug: "streamline-etl" });
    s = reduce(s, { type: "open", app: "finder" });
    expect(getWindow(s, "finder")?.slug).toBe("streamline-etl");
    s = reduce(s, { type: "open", app: "finder", slug: null });
    expect(getWindow(s, "finder")?.slug).toBeNull();
  });

  it("restores a minimized window", () => {
    const s = run(
      empty(),
      { type: "open", app: "notes" },
      { type: "minimize", app: "notes" },
      { type: "open", app: "notes" },
    );
    expect(getWindow(s, "notes")?.minimized).toBe(false);
    expect(s.focused).toBe("notes");
  });

  it("cascades new windows so they don't sit exactly on top of each other", () => {
    const s = run(empty(), { type: "open", app: "terminal" }, { type: "open", app: "music" });
    const a = getWindow(s, "terminal")!.bounds;
    const b = getWindow(s, "music")!.bounds;
    expect(a.x === b.x && a.y === b.y).toBe(false);
  });

  it("fits windows inside a small viewport", () => {
    const s = run(initialState(null, { w: 700, h: 500 }), { type: "open", app: "detector" });
    const { bounds } = getWindow(s, "detector")!;
    expect(bounds.y).toBeGreaterThanOrEqual(MENU_BAR_H);
    expect(bounds.w).toBeGreaterThanOrEqual(APP_SPECS.detector.minSize.w);
  });
});

describe("focus and z-order", () => {
  const three = () =>
    run(
      empty(),
      { type: "open", app: "notes" },
      { type: "open", app: "finder" },
      { type: "open", app: "terminal" },
    );

  it("focus moves a window to the top", () => {
    const s = reduce(three(), { type: "focus", app: "notes" });
    expect(order(s)).toEqual(["finder", "terminal", "notes"]);
    expect(s.focused).toBe("notes");
  });

  it("focusing the already-focused top window is a no-op (same reference)", () => {
    const s = three();
    expect(reduce(s, { type: "focus", app: "terminal" })).toBe(s);
  });

  it("closing the focused window focuses the next one down", () => {
    const s = reduce(three(), { type: "close", app: "terminal" });
    expect(order(s)).toEqual(["notes", "finder"]);
    expect(s.focused).toBe("finder");
  });

  it("minimizing skips minimized windows when picking the next focus", () => {
    const s = run(
      three(),
      { type: "minimize", app: "finder" },
      { type: "minimize", app: "terminal" },
    );
    expect(s.focused).toBe("notes");
    expect(reduce(s, { type: "minimize", app: "notes" }).focused).toBeNull();
  });

  it("cycle forward brings the bottom window up; backward sends the top down", () => {
    const fwd = reduce(three(), { type: "cycle", direction: 1 });
    expect(fwd.focused).toBe("notes");
    expect(order(fwd)).toEqual(["finder", "terminal", "notes"]);
    const back = reduce(three(), { type: "cycle", direction: -1 });
    expect(order(back)).toEqual(["terminal", "notes", "finder"]);
    expect(back.focused).toBe("finder");
  });

  it("ignores actions for windows that aren't open", () => {
    const s = three();
    for (const type of ["close", "focus", "minimize", "toggleMaximize"] as const) {
      expect(reduce(s, { type, app: "music" })).toBe(s);
    }
  });
});

describe("bounds", () => {
  const withNotes = () => run(empty(), { type: "open", app: "notes" });

  it("maximize fills the work area and restore returns to the old bounds", () => {
    const before = getWindow(withNotes(), "notes")!.bounds;
    const max = reduce(withNotes(), { type: "toggleMaximize", app: "notes" });
    expect(getWindow(max, "notes")!.bounds).toEqual(workArea(vp));
    const restored = reduce(max, { type: "toggleMaximize", app: "notes" });
    expect(getWindow(restored, "notes")!.bounds).toEqual(before);
  });

  it("move clamps so the title bar can always be grabbed", () => {
    const s = reduce(withNotes(), { type: "move", app: "notes", x: -5000, y: -5000 });
    const b = getWindow(s, "notes")!.bounds;
    expect(b.y).toBe(MENU_BAR_H);
    expect(b.x + b.w).toBeGreaterThan(0);
  });

  it("dragging a maximized window restores its size", () => {
    const max = run(withNotes(), { type: "toggleMaximize", app: "notes" });
    const s = reduce(max, { type: "move", app: "notes", x: 100, y: 100 });
    const w = getWindow(s, "notes")!;
    expect(w.maximized).toBe(false);
    expect(w.bounds.w).toBe(APP_SPECS.notes.defaultSize.w);
  });

  it("resize enforces the minimum size", () => {
    const s = reduce(withNotes(), {
      type: "resize",
      app: "notes",
      bounds: { x: 100, y: 100, w: 10, h: 10 },
    });
    expect(getWindow(s, "notes")!.bounds).toMatchObject(APP_SPECS.notes.minSize);
  });

  it("viewport changes re-center untouched windows and clamp moved ones", () => {
    let s = run(
      empty(),
      { type: "open", app: "notes" },
      { type: "open", app: "finder" },
      { type: "move", app: "finder", x: 1300, y: 800 },
    );
    s = reduce(s, { type: "setViewport", viewport: { w: 1000, h: 700 } });
    const notes = getWindow(s, "notes")!.bounds;
    expect(notes.x + notes.w).toBeLessThanOrEqual(1000);
    const finder = getWindow(s, "finder")!.bounds;
    expect(finder.x).toBeLessThan(1000);
    expect(finder.y).toBeLessThan(700);
  });
});

describe("routes", () => {
  it("initial state opens the window for a deep link", () => {
    const s = initialState({ app: "finder", slug: "streamline-etl" }, vp);
    expect(routeOf(s)).toEqual({ app: "finder", slug: "streamline-etl" });
  });

  it("route to / closes the focused window (Back exits the app)", () => {
    const s = run(empty(), { type: "open", app: "notes" }, { type: "route", route: null });
    expect(s.windows).toHaveLength(0);
    expect(routeOf(s)).toBeNull();
  });

  it("route to an open app focuses it and shows the requested document", () => {
    const s = run(
      empty(),
      { type: "open", app: "notes", slug: "resume" },
      { type: "open", app: "finder" },
      { type: "route", route: { app: "notes", slug: "about-me" } },
    );
    expect(routeOf(s)).toEqual({ app: "notes", slug: "about-me" });
    expect(order(s)).toEqual(["finder", "notes"]);
  });
});

import { describe, expect, it, vi } from "vitest";
import { initialState } from "./reducer";
import { hrefFor, parsePath } from "./routes";
import { createWmStore } from "./store";

describe("parsePath / hrefFor", () => {
  it.each([
    ["/", null],
    ["/notes", { app: "notes", slug: null }],
    ["/notes/about-me", { app: "notes", slug: "about-me" }],
    ["/finder/streamline-etl/", { app: "finder", slug: "streamline-etl" }],
    ["/nope", null],
    ["/notes/Bad_Slug", null],
    ["/notes/a/b", null],
  ])("parsePath(%s)", (path, expected) => {
    expect(parsePath(path)).toEqual(expected);
  });

  it("round-trips", () => {
    for (const path of ["/", "/terminal", "/notes/resume"]) {
      expect(hrefFor(parsePath(path))).toBe(path);
    }
  });
});

describe("history integration", () => {
  const setup = () => {
    const onRouteChange = vi.fn();
    const store = createWmStore(initialState(null), { onRouteChange });
    const { dispatch } = store.getState();
    return { store, dispatch, onRouteChange };
  };

  it("pushes when a window opens or changes document", () => {
    const { dispatch, onRouteChange } = setup();
    dispatch({ type: "open", app: "notes" });
    expect(onRouteChange).toHaveBeenLastCalledWith({ app: "notes", slug: "about-me" }, "push");
    dispatch({ type: "navigate", app: "notes", slug: "resume" });
    expect(onRouteChange).toHaveBeenLastCalledWith({ app: "notes", slug: "resume" }, "push");
  });

  it("replaces when only focus changes", () => {
    const { dispatch, onRouteChange } = setup();
    dispatch({ type: "open", app: "notes" });
    dispatch({ type: "open", app: "finder" });
    dispatch({ type: "open", app: "notes" });
    expect(onRouteChange).toHaveBeenLastCalledWith({ app: "notes", slug: "about-me" }, "replace");
    dispatch({ type: "close", app: "notes" });
    expect(onRouteChange).toHaveBeenLastCalledWith({ app: "finder", slug: null }, "replace");
  });

  it("never writes history for changes that came from history", () => {
    const { dispatch, onRouteChange } = setup();
    dispatch({ type: "route", route: { app: "terminal", slug: null } });
    dispatch({ type: "route", route: null });
    expect(onRouteChange).not.toHaveBeenCalled();
  });

  it("stays quiet when the URL wouldn't change", () => {
    const { dispatch, onRouteChange } = setup();
    dispatch({ type: "open", app: "notes" });
    onRouteChange.mockClear();
    dispatch({ type: "move", app: "notes", x: 10, y: 50 });
    dispatch({ type: "toggleMaximize", app: "notes" });
    expect(onRouteChange).not.toHaveBeenCalled();
  });
});

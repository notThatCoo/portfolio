import { describe, expect, it } from "vitest";
import { fuzzyMatch, rank } from "./search";

describe("fuzzyMatch", () => {
  it("matches subsequences case-insensitively", () => {
    expect(fuzzyMatch("trm", "Terminal")).not.toBeNull();
    expect(fuzzyMatch("TERM", "Terminal")?.indices).toEqual([0, 1, 2, 3]);
  });

  it("returns null when characters are missing or out of order", () => {
    expect(fuzzyMatch("xyz", "Terminal")).toBeNull();
    expect(fuzzyMatch("lat", "Terminal")).toBeNull();
  });

  it("prefers word-boundary hits", () => {
    const boundary = fuzzyMatch("ds", "DarkSide-20k surrogate")!;
    expect(boundary.indices).toEqual([0, 4]);
  });

  it("scores substrings above scattered matches", () => {
    const sub = fuzzyMatch("etl", "streamline-etl")!;
    const scattered = fuzzyMatch("etl", "electric telemetry log")!;
    expect(sub.score).toBeGreaterThan(scattered.score);
  });
});

describe("rank", () => {
  const items = [
    { title: "Notes" },
    { title: "Terminal" },
    { title: "Detector", keywords: ["darkside", "physics", "onnx"] },
    { title: "Theme: toggle light/dark" },
  ];

  it("returns everything in original order for an empty query", () => {
    expect(rank(items, "  ").map((r) => r.item.title)).toEqual(items.map((i) => i.title));
  });

  it("puts the best title match first", () => {
    expect(rank(items, "term")[0].item.title).toBe("Terminal");
  });

  it("finds items by keyword", () => {
    expect(rank(items, "onnx").map((r) => r.item.title)).toEqual(["Detector"]);
  });

  it("drops non-matches", () => {
    expect(rank(items, "zzz")).toEqual([]);
  });
});

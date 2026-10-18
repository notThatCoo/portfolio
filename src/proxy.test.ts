import { describe, expect, it } from "vitest";
import { contentIndex } from "./content";
import { isKnownPath } from "./proxy";

describe("isKnownPath", () => {
  it("accepts the desktop, every app, and every document", () => {
    expect(isKnownPath("/")).toBe(true);
    expect(isKnownPath("/terminal")).toBe(true);
    for (const n of contentIndex.notes) expect(isKnownPath(`/notes/${n.slug}`)).toBe(true);
    for (const p of contentIndex.projects) expect(isKnownPath(`/finder/${p.slug}`)).toBe(true);
  });

  it("rejects unknown apps, unknown documents, and documents on the wrong app", () => {
    expect(isKnownPath("/nope")).toBe(false);
    expect(isKnownPath("/notes/nope")).toBe(false);
    expect(isKnownPath("/terminal/about-me")).toBe(false);
    expect(isKnownPath("/notes/about-me/extra")).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import type { ContentIndex } from "@/content/schema";
import { execute, type ShellContext } from "./commands";
import { complete } from "./complete";
import { ParseError, parseArgs, tokenize } from "./parse";
import { buildFs, resolvePath } from "./vfs";

const content: ContentIndex = {
  notes: [{ slug: "about-me", title: "About me", summary: "hi", order: 1, updated: "2026-10-17" }],
  projects: [
    {
      slug: "streamline-etl",
      title: "streamline-etl",
      summary: "etl",
      order: 1,
      status: "shipped",
      year: 2025,
      stack: ["Python"],
      links: [],
    },
    {
      slug: "stream-two",
      title: "Stream two",
      summary: "x",
      order: 2,
      status: "shipped",
      year: 2025,
      stack: ["Go"],
      links: [],
    },
  ],
};
const fs = buildFs(content);
const ctx = (over: Partial<ShellContext> = {}): ShellContext => ({
  cwd: [],
  fs,
  history: [],
  ...over,
});
const texts = (input: string, c = ctx()) =>
  execute(input, c).lines.flatMap((l) => (l.type === "text" ? [l.text] : []));

describe("tokenize", () => {
  it.each([
    ["ls  -l   notes", ["ls", "-l", "notes"]],
    [`echo "hello world"`, ["echo", "hello world"]],
    [`echo 'it''s'`, ["echo", "its"]],
    [`echo "say \\"hi\\""`, ["echo", 'say "hi"']],
    [`echo a\\ b`, ["echo", "a b"]],
    [`echo ""`, ["echo", ""]],
    ["   ", []],
  ])("%s", (input, expected) => {
    expect(tokenize(input)).toEqual(expected);
  });

  it("rejects unterminated quotes", () => {
    expect(() => tokenize(`echo "oops`)).toThrow(ParseError);
  });
});

describe("parseArgs", () => {
  it("handles --k v, --k=v, short booleans, and --", () => {
    expect(parseArgs(["--rho", "0.4", "--z=-0.5", "-la", "x", "--", "--raw"], ["l", "a"])).toEqual({
      positional: ["x", "--raw"],
      flags: { rho: "0.4", z: "-0.5", l: true, a: true },
    });
  });

  it("treats a negative number as a value, not a flag", () => {
    expect(parseArgs(["--z", "-0.3"]).flags.z).toBe("-0.3");
  });
});

describe("vfs paths", () => {
  it("normalizes . .. ~ and absolute paths", () => {
    expect(resolvePath(["notes"], "../projects/./x.md")).toEqual(["projects", "x.md"]);
    expect(resolvePath(["notes"], "~")).toEqual([]);
    expect(resolvePath(["notes"], "/apps")).toEqual(["apps"]);
    expect(resolvePath([], "../../..")).toEqual([]);
  });
});

describe("commands", () => {
  it("ls lists directories first, then files", () => {
    const [line] = execute("ls", ctx()).lines;
    expect(line.type === "list" && line.items.map((i) => i.name)).toEqual([
      "apps",
      "notes",
      "projects",
      "README.txt",
    ]);
  });

  it("cd changes cwd and rejects files / missing paths", () => {
    expect(execute("cd projects", ctx()).cwd).toEqual(["projects"]);
    expect(texts("cd README.txt")[0]).toMatch(/not a directory/);
    expect(texts("cd nope")[0]).toMatch(/no such file/);
  });

  it("cat renders MDX docs as doc lines and text files as text", () => {
    expect(execute("cat notes/about-me.md", ctx()).lines).toEqual([
      { type: "doc", key: "notes/about-me" },
    ]);
    expect(texts("cat README.txt").join("\n")).toMatch(/window manager/);
    expect(texts("cat notes")[0]).toMatch(/Is a directory/);
  });

  it("open resolves apps, paths, and bare slugs", () => {
    expect(execute("open Terminal", ctx()).effects).toEqual([
      { type: "open", route: { app: "terminal", slug: null } },
    ]);
    expect(execute("open 'activity monitor'", ctx()).effects[0]).toMatchObject({
      route: { app: "activity" },
    });
    expect(execute("open projects/streamline-etl", ctx()).effects[0]).toMatchObject({
      route: { app: "finder", slug: "streamline-etl" },
    });
    expect(execute("open about-me", ctx()).effects[0]).toMatchObject({
      route: { app: "notes", slug: "about-me" },
    });
    expect(texts("open nothing")[0]).toMatch(/not found/);
  });

  it("simulate validates ranges and normalizes phi", () => {
    expect(execute("simulate --rho 0.4 --phi -90 --z -0.2", ctx()).effects).toEqual([
      { type: "simulate", point: { rho: 0.4, phi: 270, z: -0.2 } },
    ]);
    expect(execute("simulate 0.1 10 0.5", ctx()).effects[0]).toMatchObject({
      point: { rho: 0.1, phi: 10, z: 0.5 },
    });
    expect(texts("simulate --rho 2")[0]).toMatch(/between 0 and 1/);
    expect(texts("simulate --z abc")[0]).toMatch(/must be numbers/);
  });

  it("suggests close commands for typos", () => {
    expect(texts("lss")[0]).toMatch(/Did you mean 'ls'/);
    expect(texts("xyzzy")[0]).toMatch(/Type 'help'/);
  });

  it("history numbers previous commands", () => {
    expect(texts("history", ctx({ history: ["ls", "pwd"] }))).toEqual(["1  ls", "2  pwd"]);
  });

  it("reports parse errors instead of throwing", () => {
    expect(texts(`echo "x`)[0]).toMatch(/unterminated/);
  });
});

describe("complete", () => {
  it("completes a unique command and adds a space", () => {
    expect(complete("wh", [], fs)).toEqual({ value: "whoami ", options: [] });
  });

  it("lists ambiguous commands and extends to the common prefix", () => {
    const r = complete("c", [], fs);
    expect(r.options).toEqual(["cat", "cd", "clear"]);
    expect(r.value).toBe("c");
  });

  it("completes directories with a trailing slash", () => {
    expect(complete("cd pro", [], fs).value).toBe("cd projects/");
  });

  it("completes inside a directory and stops at the common prefix", () => {
    const r = complete("cat projects/stre", [], fs);
    expect(r.value).toBe("cat projects/stream");
    expect(r.options).toEqual(["stream-two.md", "streamline-etl.md"]);
  });

  it("offers app names for open", () => {
    expect(complete("open det", [], fs).value).toBe("open detector ");
  });
});

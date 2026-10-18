import { site } from "@/config/site";
import { APP_SPECS } from "@/lib/wm/specs";
import { isAppId, type Route } from "@/lib/wm/types";
import { ParseError, parseArgs, tokenize } from "./parse";
import { formatPath, lookup, resolvePath, type VDir, type VNode } from "./vfs";

export type Tone = "muted" | "accent" | "error";

export type Line =
  | { type: "text"; text: string; tone?: Tone }
  | { type: "doc"; key: string }
  | { type: "list"; items: { name: string; dir: boolean; note?: string }[]; long: boolean };

export interface DetectorPoint {
  /** ρ/R in [0, 1] */
  rho: number;
  /** degrees */
  phi: number;
  /** z/(H/2) in [-1, 1] */
  z: number;
}

/** Side effects the UI performs after a command runs. The executor itself stays pure. */
export type Effect =
  | { type: "open"; route: Route }
  | { type: "clear" }
  | { type: "theme"; theme: "light" | "dark" | "toggle" }
  | { type: "exit" }
  | { type: "simulate"; point: DetectorPoint };

export interface ShellContext {
  cwd: string[];
  fs: VDir;
  history: string[];
}

export interface ExecResult {
  lines: Line[];
  effects: Effect[];
  cwd: string[];
}

interface CommandDef {
  usage: string;
  summary: string;
  run(args: string[], ctx: ShellContext): Partial<ExecResult>;
}

const text = (t: string, tone?: Tone): Line => ({ type: "text", text: t, tone });
const fail = (t: string): Partial<ExecResult> => ({ lines: [text(t, "error")] });

function resolve(ctx: ShellContext, path: string): { node: VNode | null; segments: string[] } {
  const segments = resolvePath(ctx.cwd, path);
  return { node: lookup(ctx.fs, segments), segments };
}

/** Accepts "notes", "Notes", "activity-monitor", "Activity Monitor", "terminal.app". */
export function appFromName(name: string) {
  const key = name
    .toLowerCase()
    .replace(/\.app$/, "")
    .replace(/[\s_-]+/g, " ")
    .trim();
  if (isAppId(key)) return key;
  return Object.values(APP_SPECS).find((s) => s.name.toLowerCase() === key)?.id ?? null;
}

export const COMMANDS: Record<string, CommandDef> = {
  help: {
    usage: "help [command]",
    summary: "List commands, or explain one",
    run([name]) {
      if (name) {
        const def = COMMANDS[name];
        if (!def) return fail(`help: no such command: ${name}`);
        return { lines: [text(`usage: ${def.usage}`, "accent"), text(def.summary)] };
      }
      const width = Math.max(...Object.values(COMMANDS).map((c) => c.usage.length));
      return {
        lines: [
          text("Commands:", "accent"),
          ...Object.values(COMMANDS).map((c) => text(`  ${c.usage.padEnd(width)}  ${c.summary}`)),
          text(""),
          text("Tab completes commands and paths. ↑/↓ walk history. Ctrl+L clears.", "muted"),
        ],
      };
    },
  },

  ls: {
    usage: "ls [-l] [path]",
    summary: "List a directory",
    run(args, ctx) {
      const { positional, flags } = parseArgs(args, ["l", "a"]);
      const { node } = resolve(ctx, positional[0] ?? ".");
      if (!node) return fail(`ls: ${positional[0]}: No such file or directory`);
      if (node.kind === "file")
        return {
          lines: [
            {
              type: "list",
              long: !!flags.l,
              items: [{ name: node.name, dir: false, note: node.summary }],
            },
          ],
        };
      const items = [...node.children.values()]
        .sort(
          (a, b) =>
            Number(b.kind === "dir") - Number(a.kind === "dir") || a.name.localeCompare(b.name),
        )
        .map((c) => ({
          name: c.name,
          dir: c.kind === "dir",
          note: c.kind === "file" ? c.summary : undefined,
        }));
      return { lines: [{ type: "list", long: !!flags.l, items }] };
    },
  },

  cd: {
    usage: "cd [path]",
    summary: "Change directory",
    run([path = "~"], ctx) {
      const { node, segments } = resolve(ctx, path);
      if (!node) return fail(`cd: no such file or directory: ${path}`);
      if (node.kind !== "dir") return fail(`cd: not a directory: ${path}`);
      return { cwd: segments };
    },
  },

  pwd: {
    usage: "pwd",
    summary: "Print the working directory",
    run(_, ctx) {
      return { lines: [text(formatPath(ctx.cwd))] };
    },
  },

  cat: {
    usage: "cat <file>",
    summary: "Print a file (notes and write-ups render inline)",
    run(args, ctx) {
      if (!args.length) return fail("cat: missing file operand");
      const lines: Line[] = [];
      for (const path of args) {
        const { node } = resolve(ctx, path);
        if (!node) lines.push(text(`cat: ${path}: No such file or directory`, "error"));
        else if (node.kind === "dir") lines.push(text(`cat: ${path}: Is a directory`, "error"));
        else if (node.doc) lines.push({ type: "doc", key: node.doc });
        else if (node.text) lines.push(...node.text.split("\n").map((t) => text(t)));
        else
          lines.push(
            text(
              `${node.name}: binary application. Try: open ${node.name.replace(/\.app$/, "")}`,
              "muted",
            ),
          );
      }
      return { lines };
    },
  },

  open: {
    usage: "open <app|path>",
    summary: "Open an app, note, or project in a window",
    run([target], ctx) {
      if (!target)
        return fail("open: what should I open? e.g. open finder, open projects/streamline-etl.md");
      const app = appFromName(target);
      if (app)
        return {
          effects: [{ type: "open", route: { app, slug: APP_SPECS[app].defaultSlug } }],
          lines: [text(`Opening ${APP_SPECS[app].name}…`, "muted")],
        };
      const { node } = resolve(ctx, target);
      const withExt = node ?? resolve(ctx, `${target}.md`).node;
      if (withExt?.route)
        return {
          effects: [{ type: "open", route: withExt.route }],
          lines: [text(`Opening ${withExt.name}…`, "muted")],
        };
      // Bare slugs work too: `open streamline-etl`.
      for (const folder of ["projects", "notes"]) {
        const hit = lookup(ctx.fs, [folder, `${target}.md`]);
        if (hit?.route)
          return {
            effects: [{ type: "open", route: hit.route }],
            lines: [text(`Opening ${hit.name}…`, "muted")],
          };
      }
      return fail(`open: ${target}: not found. Try 'ls apps' or 'ls projects'.`);
    },
  },

  whoami: {
    usage: "whoami",
    summary: "Who built this",
    run() {
      return {
        lines: [
          text(`${site.name}`, "accent"),
          text("B.S. Data Science, UC Riverside (2026). First-generation college graduate."),
          text("Looking for data science, machine learning, and data engineering roles."),
          text(site.github.replace("https://", ""), "muted"),
        ],
      };
    },
  },

  simulate: {
    usage: "simulate [--rho R] [--phi DEG] [--z Z]",
    summary: "Run the toy detector model at a position (ρ/R 0–1, φ°, z −1–1)",
    run(args) {
      const { positional, flags } = parseArgs(args);
      const pick = (name: string, i: number, fallback: number) => {
        const raw = flags[name] ?? positional[i];
        if (raw === undefined || raw === true) return fallback;
        return Number(raw);
      };
      const point = { rho: pick("rho", 0, 0.5), phi: pick("phi", 1, 45), z: pick("z", 2, 0) };
      if (![point.rho, point.phi, point.z].every(Number.isFinite))
        return fail("simulate: values must be numbers, e.g. simulate --rho 0.4 --phi 30 --z 0.2");
      if (point.rho < 0 || point.rho > 1)
        return fail("simulate: --rho must be between 0 and 1 (fraction of the radius)");
      if (point.z < -1 || point.z > 1)
        return fail("simulate: --z must be between -1 and 1 (fraction of the half-height)");
      point.phi = ((point.phi % 360) + 360) % 360;
      return { effects: [{ type: "simulate", point }] };
    },
  },

  history: {
    usage: "history",
    summary: "Show previous commands",
    run(_, ctx) {
      const w = String(ctx.history.length).length;
      return { lines: ctx.history.map((h, i) => text(`${String(i + 1).padStart(w)}  ${h}`)) };
    },
  },

  echo: {
    usage: "echo [text…]",
    summary: "Print text",
    run(args) {
      return { lines: [text(args.join(" "))] };
    },
  },

  theme: {
    usage: "theme [light|dark]",
    summary: "Switch the color theme",
    run([value]) {
      if (value && value !== "light" && value !== "dark")
        return fail("theme: expected 'light' or 'dark'");
      return { effects: [{ type: "theme", theme: (value as "light" | "dark") ?? "toggle" }] };
    },
  },

  date: {
    usage: "date",
    summary: "Print the date and time",
    run() {
      return { lines: [text(new Date().toString())] };
    },
  },

  clear: {
    usage: "clear",
    summary: "Clear the screen",
    run() {
      return { effects: [{ type: "clear" }] };
    },
  },

  exit: {
    usage: "exit",
    summary: "Close the terminal",
    run() {
      return { effects: [{ type: "exit" }] };
    },
  },
};

/** Levenshtein distance, for "did you mean" suggestions. */
export function editDistance(a: string, b: string): number {
  const dp = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[b.length];
}

export function execute(input: string, ctx: ShellContext): ExecResult {
  const base: ExecResult = { lines: [], effects: [], cwd: ctx.cwd };
  let tokens: string[];
  try {
    tokens = tokenize(input);
  } catch (e) {
    if (e instanceof ParseError)
      return { ...base, lines: [text(`parse error: ${e.message}`, "error")] };
    throw e;
  }
  if (!tokens.length) return base;
  const [name, ...args] = tokens;
  const def = COMMANDS[name];
  if (!def) {
    const guess = Object.keys(COMMANDS)
      .map((c) => [c, editDistance(name, c)] as const)
      .sort((a, b) => a[1] - b[1])[0];
    const hint =
      guess && guess[1] <= 2 ? ` Did you mean '${guess[0]}'?` : " Type 'help' for a list.";
    return { ...base, lines: [text(`command not found: ${name}.${hint}`, "error")] };
  }
  const result = def.run(args, ctx);
  return { lines: result.lines ?? [], effects: result.effects ?? [], cwd: result.cwd ?? ctx.cwd };
}

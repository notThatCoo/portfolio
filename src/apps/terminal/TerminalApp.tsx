"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import type { AppProps } from "@/apps";
import { toCartesian } from "@/lib/detector/geometry";
import { predict } from "@/lib/detector/model";
import { expectedFractions, l1 } from "@/lib/detector/sim";
import { useDetectorPoint } from "@/lib/detector/store";
import { execute, type DetectorPoint, type Line, type Tone } from "@/lib/terminal/commands";
import { complete } from "@/lib/terminal/complete";
import { sparkline } from "@/lib/terminal/sparkline";
import { buildFs, formatPath } from "@/lib/terminal/vfs";
import { currentTheme, setTheme } from "@/lib/theme";
import { useContent, useDispatch, useWindowCommands } from "@/shell/DesktopContext";

interface Entry {
  id: number;
  cwd: string[];
  input: string | null; // null = system output with no prompt (welcome, async results)
  lines: Line[];
}

const HISTORY_KEY = "terminal-history";
const HISTORY_MAX = 100;
const text = (t: string, tone?: Tone): Line => ({ type: "text", text: t, tone });

const TONE: Record<Tone, string> = {
  muted: "text-[var(--term-dim)]",
  accent: "text-[var(--term-accent)]",
  error: "text-[var(--term-error)]",
};

function loadHistory(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]");
    return Array.isArray(raw) ? raw.filter((x) => typeof x === "string").slice(-HISTORY_MAX) : [];
  } catch {
    return [];
  }
}

function saveHistory(history: string[]) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-HISTORY_MAX)));
  } catch {
    // Storage unavailable: history still works for this session.
  }
}

async function simulateLines(point: DetectorPoint): Promise<Line[]> {
  const xyz = toCartesian(point);
  const truth = expectedFractions(xyz);
  const t0 = performance.now();
  const [pred] = await predict([xyz]);
  const ms = performance.now() - t0;
  let max = 0;
  let best = 0;
  for (let i = 0; i < 128; i++) {
    if (pred[i] > max) [max, best] = [pred[i], i];
  }
  const top = pred.slice(0, 64).reduce((a, b) => a + b, 0);
  return [
    text(
      `toy model · synthetic data · ρ=${point.rho.toFixed(2)} φ=${point.phi.toFixed(0)}° z=${point.z.toFixed(2)}`,
      "muted",
    ),
    text(`top    ${sparkline(pred.slice(0, 64), max)}`, "accent"),
    text(`bottom ${sparkline(pred.slice(64), max)}`, "accent"),
    text(`light split   top ${(top * 100).toFixed(1)}% · bottom ${((1 - top) * 100).toFixed(1)}%`),
    text(`brightest     ch ${best} (${(max * 100).toFixed(2)}%)`),
    text(`vs simulator  L1 ${(l1(pred, truth) * 100).toFixed(1)}% · inference ${ms.toFixed(1)} ms`),
    text("Explore it visually: open detector", "muted"),
  ];
}

function Output({ line, bodies }: { line: Line; bodies: Record<string, React.ReactNode> }) {
  if (line.type === "text") {
    return (
      <div
        className={`min-h-[1.4em] break-words whitespace-pre-wrap ${line.tone ? TONE[line.tone] : ""}`}
      >
        {line.text}
      </div>
    );
  }
  if (line.type === "doc") {
    return (
      <div className="prose my-2 max-w-none rounded-md border border-white/10 bg-white/[0.03] p-4 font-sans text-[13px] text-[var(--term-text)] [&_a]:text-[var(--term-accent)]">
        {bodies[line.key] ?? <span>(empty)</span>}
      </div>
    );
  }
  if (line.long) {
    return (
      <div className="grid grid-cols-[auto_1fr] gap-x-6">
        {line.items.map((it) => (
          <div key={it.name} className="contents">
            <span className={it.dir ? "font-semibold text-[var(--term-accent)]" : ""}>
              {it.name}
              {it.dir ? "/" : ""}
            </span>
            <span className="truncate text-[var(--term-dim)]">{it.note ?? ""}</span>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="flex flex-wrap gap-x-6">
      {line.items.map((it) => (
        <span key={it.name} className={it.dir ? "font-semibold text-[var(--term-accent)]" : ""}>
          {it.name}
          {it.dir ? "/" : ""}
        </span>
      ))}
    </div>
  );
}

function Prompt({ cwd }: { cwd: string[] }) {
  return (
    <span className="mr-[1ch] shrink-0 select-none">
      <span className="text-[var(--term-accent)]">tolu@portfolio</span>{" "}
      <span className="text-sky-300">{formatPath(cwd)}</span>{" "}
      <span className="text-[var(--term-dim)]">%</span>
    </span>
  );
}

export default function TerminalApp({ win }: AppProps) {
  const content = useContent();
  const dispatch = useDispatch();
  const commands = useWindowCommands();
  const setPoint = useDetectorPoint((s) => s.setPoint);
  const fs = useMemo(() => buildFs(content), [content]);

  const [cwd, setCwd] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [entries, setEntries] = useState<Entry[]>(() => [
    {
      id: 0,
      cwd: [],
      input: null,
      lines: [
        text("Welcome to tolu@portfolio. This is a real (tiny) shell.", "accent"),
        text("Type 'help' to see commands, or try: ls projects · whoami · simulate", "muted"),
      ],
    },
  ]);
  // History isn't rendered, so reading storage during the first render is safe.
  const [history, setHistory] = useState<string[]>(() =>
    typeof window === "undefined" ? [] : loadHistory(),
  );
  const [cursor, setCursor] = useState<number | null>(null); // index into history while browsing
  const draft = useRef("");
  const nextId = useRef(1);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [entries]);

  const push = (entry: Omit<Entry, "id">) =>
    setEntries((e) => [...e, { ...entry, id: nextId.current++ }]);

  const run = (raw: string) => {
    const line = raw.trim();
    const nextHistory = line && history[history.length - 1] !== line ? [...history, line] : history;
    if (nextHistory !== history) {
      setHistory(nextHistory);
      saveHistory(nextHistory);
    }
    setCursor(null);
    setInput("");

    const result = execute(line, { cwd, fs, history: nextHistory });
    let cleared = false;
    for (const effect of result.effects) {
      switch (effect.type) {
        case "clear":
          cleared = true;
          break;
        case "open":
          dispatch({ type: "open", app: effect.route.app, slug: effect.route.slug });
          break;
        case "theme":
          setTheme(
            effect.theme === "toggle"
              ? currentTheme() === "dark"
                ? "light"
                : "dark"
              : effect.theme,
          );
          break;
        case "exit":
          commands.close(win.app);
          break;
        case "simulate": {
          setPoint(effect.point);
          const id = nextId.current;
          simulateLines(effect.point).then(
            (lines) => push({ cwd, input: null, lines }),
            () =>
              push({
                cwd,
                input: null,
                lines: [
                  text(
                    `simulate: couldn't load the model (#${id}). Check your connection and retry.`,
                    "error",
                  ),
                ],
              }),
          );
          result.lines.push(text("running toy model…", "muted"));
          break;
        }
      }
    }
    if (cleared) setEntries([]);
    else push({ cwd, input: raw, lines: result.lines });
    setCwd(result.cwd);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      run(input);
    } else if (e.key === "Tab") {
      e.preventDefault();
      const { value, options } = complete(input, cwd, fs);
      setInput(value);
      if (options.length > 1)
        push({
          cwd,
          input,
          lines: [
            {
              type: "list",
              long: false,
              items: options.map((o) => ({ name: o.replace(/\/$/, ""), dir: o.endsWith("/") })),
            },
          ],
        });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!history.length) return;
      if (cursor === null) draft.current = input;
      const next = cursor === null ? history.length - 1 : Math.max(0, cursor - 1);
      setCursor(next);
      setInput(history[next]);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (cursor === null) return;
      const next = cursor + 1;
      if (next >= history.length) {
        setCursor(null);
        setInput(draft.current);
      } else {
        setCursor(next);
        setInput(history[next]);
      }
    } else if (e.ctrlKey && e.key === "l") {
      e.preventDefault();
      setEntries([]);
    } else if (e.ctrlKey && e.key === "c") {
      e.preventDefault();
      push({ cwd, input: `${input}^C`, lines: [] });
      setInput("");
      setCursor(null);
    }
  };

  return (
    <div
      ref={scrollRef}
      className="h-full overflow-y-auto bg-[var(--term-bg)] p-3 font-mono text-[13px] leading-[1.45] text-[var(--term-text)]"
      onMouseUp={() => {
        // Focus the prompt on click, unless the user is selecting text to copy.
        if (!window.getSelection()?.toString()) inputRef.current?.focus();
      }}
    >
      <div role="log" aria-live="polite" aria-label="Terminal output">
        {entries.map((entry) => (
          <div key={entry.id}>
            {entry.input !== null && (
              <div className="flex">
                <Prompt cwd={entry.cwd} />
                <span className="break-all whitespace-pre-wrap">{entry.input}</span>
              </div>
            )}
            {entry.lines.map((line, i) => (
              <Output key={i} line={line} bodies={content.bodies} />
            ))}
          </div>
        ))}
      </div>
      <div className="flex">
        <Prompt cwd={cwd} />
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setCursor(null);
          }}
          onKeyDown={onKeyDown}
          aria-label="Terminal command"
          autoFocus
          autoCapitalize="off"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="send"
          className="min-w-0 flex-1 bg-transparent caret-[var(--term-accent)] outline-none"
        />
      </div>
    </div>
  );
}

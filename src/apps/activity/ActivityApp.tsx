"use client";

import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/lib/hooks/useMediaQuery";
import { useWm } from "@/shell/DesktopContext";

const SAMPLES = 60;

interface Sample {
  fps: number;
  heapMb: number | null;
  domNodes: number;
  transferKb: number;
}

/** Chrome-only, non-standard. Feature-detected; shown as "n/a" elsewhere. */
function heapMb(): number | null {
  const mem = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;
  return mem ? mem.usedJSHeapSize / 1024 / 1024 : null;
}

function transferredKb(): number {
  const entries = [
    ...performance.getEntriesByType("navigation"),
    ...performance.getEntriesByType("resource"),
  ] as PerformanceResourceTiming[];
  return entries.reduce((sum, e) => sum + (e.transferSize || 0), 0) / 1024;
}

/**
 * Samples the page once per second: frame rate (rAF count), JS heap, DOM size.
 * Real numbers about this tab, until the crypto bot's live feed is wired in.
 */
function useSamples(paused: boolean) {
  const [samples, setSamples] = useState<Sample[]>([]);
  const frames = useRef(0);

  useEffect(() => {
    if (paused) return;
    let raf = 0;
    const tick = () => {
      frames.current++;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    let last = performance.now();
    const interval = window.setInterval(() => {
      const now = performance.now();
      const fps = (frames.current * 1000) / (now - last);
      frames.current = 0;
      last = now;
      setSamples((s) => [
        ...s.slice(-(SAMPLES - 1)),
        {
          fps,
          heapMb: heapMb(),
          domNodes: document.getElementsByTagName("*").length,
          transferKb: transferredKb(),
        },
      ]);
    }, 1000);
    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(interval);
    };
  }, [paused]);

  return samples;
}

function Sparkline({ values, max, label }: { values: number[]; max: number; label: string }) {
  const W = 240;
  const H = 48;
  if (values.length < 2) return <div className="h-12" aria-hidden="true" />;
  const step = W / (SAMPLES - 1);
  const offset = (SAMPLES - values.length) * step;
  const pts = values.map(
    (v, i) =>
      `${(offset + i * step).toFixed(1)},${(H - 2 - (Math.min(v, max) / max) * (H - 4)).toFixed(1)}`,
  );
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className="h-12 w-full"
      role="img"
      aria-label={label}
    >
      <line x1="0" x2={W} y1={H - 2} y2={H - 2} stroke="var(--border)" />
      <polyline
        points={pts.join(" ")}
        fill="none"
        stroke="var(--chart-bar)"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function ActivityApp() {
  const reducedMotion = usePrefersReducedMotion();
  const [paused, setPaused] = useState(false);
  const samples = useSamples(paused);
  const windows = useWm((s) => s.windows.length);
  const latest = samples[samples.length - 1];
  const transfer = latest?.transferKb ?? null;

  const tiles: [string, string, number[] | null, number][] = [
    ["Frame rate", latest ? `${latest.fps.toFixed(0)} fps` : "…", samples.map((s) => s.fps), 120],
    [
      "JS heap",
      latest?.heapMb != null ? `${latest.heapMb.toFixed(1)} MB` : "n/a",
      latest?.heapMb != null ? samples.map((s) => s.heapMb ?? 0) : null,
      Math.max(10, ...samples.map((s) => (s.heapMb ?? 0) * 1.25)),
    ],
    [
      "DOM nodes",
      latest ? latest.domNodes.toLocaleString() : "…",
      samples.map((s) => s.domNodes),
      Math.max(500, ...samples.map((s) => s.domNodes * 1.25)),
    ],
  ];

  return (
    <div className="h-full overflow-y-auto p-4">
      <section aria-labelledby="am-tab">
        <div className="mb-3 flex items-center justify-between">
          <h3 id="am-tab" className="text-[13px] font-semibold">
            This tab, live
          </h3>
          <button
            type="button"
            className="button button-quiet !py-1 text-xs"
            onClick={() => setPaused((p) => !p)}
            aria-pressed={paused}
          >
            {paused ? "Resume" : "Pause"}
          </button>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {tiles.map(([label, value, series, max]) => (
            <div key={label} className="rounded-xl border border-line bg-raised p-3">
              <p className="text-[11px] text-muted">{label}</p>
              <p className="text-xl font-semibold tabular-nums">{value}</p>
              {series && (
                <Sparkline values={series} max={max} label={`${label}, last ${SAMPLES} seconds`} />
              )}
            </div>
          ))}
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-xs sm:grid-cols-4">
          <dt className="text-muted">Open windows</dt>
          <dd className="tabular-nums">{windows}</dd>
          <dt className="text-muted">Transferred</dt>
          <dd className="tabular-nums">{transfer !== null ? `${transfer.toFixed(0)} KB` : "…"}</dd>
          <dt className="text-muted">Reduced motion</dt>
          <dd>{reducedMotion ? "on" : "off"}</dd>
          <dt className="text-muted">Sampling</dt>
          <dd>1 Hz, last {SAMPLES}s</dd>
        </dl>
      </section>

      <section aria-labelledby="am-bot" className="mt-6">
        <div className="mb-2 flex items-center gap-2">
          <h3 id="am-bot" className="text-[13px] font-semibold">
            Crypto signal bot
          </h3>
          <span className="flex items-center gap-1 rounded-full bg-hover px-2 py-0.5 text-[11px] text-muted">
            <span className="size-1.5 rounded-full bg-[var(--text-faint)]" aria-hidden="true" /> Not
            connected
          </span>
        </div>
        <div className="overflow-hidden rounded-xl border border-dashed border-line-strong">
          <table className="w-full text-left text-xs">
            <thead className="bg-hover text-muted">
              <tr>
                {["Time", "Pair", "Signal", "Confidence", "Model"].map((h) => (
                  <th key={h} className="px-3 py-2 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-muted">
                  Live signals will stream here once the bot is connected.
                  <br />
                  <span className="text-faint">
                    Planned: server-sent events from the bot, buffered and shown newest first.
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

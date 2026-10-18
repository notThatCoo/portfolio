"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { N_CHANNELS } from "@/lib/detector/geometry";

const H = 240;
const PAD = { top: 12, right: 8, bottom: 30, left: 40 };
const pct = (v: number) => `${(v * 100).toFixed(2)}%`;

interface ChannelChartProps {
  model: ArrayLike<number> | null;
  truth: ArrayLike<number>;
  showTruth: boolean;
  highlight: number | null;
  onHighlight: (ch: number | null) => void;
}

/** Round numbers for the y-axis grid that cover [0, max]. */
function niceTicks(max: number): number[] {
  const raw = max / 4;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const ticks = [];
  for (let v = 0; v <= max + 1e-12; v += step) ticks.push(v);
  if (ticks[ticks.length - 1] < max) ticks.push(ticks[ticks.length - 1] + step);
  return ticks;
}

/**
 * 128 bars = the model's predicted share of light per channel; short ticks =
 * the simulator's value (different mark shape, so the two series never rely
 * on color alone). Hover or arrow keys inspect a channel.
 */
export function ChannelChart({
  model,
  truth,
  showTruth,
  highlight,
  onHighlight,
}: ChannelChartProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(280, entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const plotW = width - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const slot = plotW / N_CHANNELS;
  const barW = Math.max(1, slot - 1);
  let max = 0;
  for (let i = 0; i < N_CHANNELS; i++) max = Math.max(max, truth[i], model?.[i] ?? 0);
  const ticks = niceTicks(max || 0.01);
  const yMax = ticks[ticks.length - 1];
  const y = (v: number) => PAD.top + plotH * (1 - v / yMax);
  const series = model ?? truth;

  const onKeyDown = (e: KeyboardEvent) => {
    const step = e.shiftKey ? 8 : 1;
    const cur = highlight ?? -1;
    if (e.key === "ArrowRight") onHighlight(Math.min(N_CHANNELS - 1, cur + step));
    else if (e.key === "ArrowLeft") onHighlight(Math.max(0, cur - step));
    else if (e.key === "Home") onHighlight(0);
    else if (e.key === "End") onHighlight(N_CHANNELS - 1);
    else if (e.key === "Escape") onHighlight(null);
    else return;
    e.preventDefault();
  };

  const hi = highlight;
  const tipLeft = hi === null ? 0 : Math.min(width - 150, Math.max(0, PAD.left + hi * slot - 70));

  return (
    <div ref={wrapRef} className="relative w-full">
      <svg
        width={width}
        height={H}
        role="img"
        aria-label={`Bar chart of predicted light in ${N_CHANNELS} channels. Use arrow keys to read individual channels.`}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onPointerMove={(e) => {
          const x = e.clientX - e.currentTarget.getBoundingClientRect().left - PAD.left;
          const ch = Math.floor(x / slot);
          onHighlight(ch >= 0 && ch < N_CHANNELS ? ch : null);
        }}
        onPointerLeave={() => onHighlight(null)}
        className="block outline-offset-4"
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--border)" />
            <text
              x={PAD.left - 6}
              y={y(t)}
              dy="0.32em"
              textAnchor="end"
              fontSize="10"
              fill="var(--text-faint)"
            >
              {(t * 100).toFixed(t * 100 < 1 && t > 0 ? 1 : 0)}%
            </text>
          </g>
        ))}
        {/* Plane divider */}
        <line
          x1={PAD.left + 64 * slot}
          x2={PAD.left + 64 * slot}
          y1={PAD.top}
          y2={H - PAD.bottom + 4}
          stroke="var(--border-strong)"
          strokeDasharray="3 3"
        />
        {Array.from({ length: N_CHANNELS }, (_, i) => {
          const v = series[i];
          const x = PAD.left + i * slot;
          const top = y(v);
          return (
            <rect
              key={i}
              x={x}
              y={top}
              width={barW}
              height={Math.max(0, H - PAD.bottom - top)}
              rx={Math.min(1.5, barW / 2)}
              fill={model ? "var(--chart-bar)" : "var(--text-faint)"}
              opacity={hi === null || hi === i ? 1 : 0.55}
            />
          );
        })}
        {showTruth &&
          Array.from({ length: N_CHANNELS }, (_, i) => (
            <line
              key={i}
              x1={PAD.left + i * slot - 0.5}
              x2={PAD.left + i * slot + barW + 0.5}
              y1={y(truth[i])}
              y2={y(truth[i])}
              stroke="var(--chart-truth)"
              strokeWidth={2}
              strokeLinecap="round"
            />
          ))}
        <line
          x1={PAD.left}
          x2={width - PAD.right}
          y1={H - PAD.bottom}
          y2={H - PAD.bottom}
          stroke="var(--border-strong)"
        />
        <text
          x={PAD.left + 32 * slot}
          y={H - 10}
          textAnchor="middle"
          fontSize="10.5"
          fill="var(--text-muted)"
        >
          Top plane · ch 0–63
        </text>
        <text
          x={PAD.left + 96 * slot}
          y={H - 10}
          textAnchor="middle"
          fontSize="10.5"
          fill="var(--text-muted)"
        >
          Bottom plane · ch 64–127
        </text>
      </svg>
      {hi !== null && (
        <div
          role="status"
          className="pointer-events-none absolute top-0 w-[150px] rounded-lg border border-line-strong bg-surface-solid px-2.5 py-1.5 text-[11px] shadow-lg"
          style={{ left: tipLeft }}
        >
          <p className="font-semibold">
            Channel {hi}{" "}
            <span className="font-normal text-muted">· {hi < 64 ? "top" : "bottom"}</span>
          </p>
          {model && (
            <p className="flex justify-between gap-2">
              <span className="flex items-center gap-1 text-muted">
                <span className="inline-block size-2 rounded-sm bg-[var(--chart-bar)]" /> Model
              </span>
              <span className="tabular-nums">{pct(model[hi])}</span>
            </p>
          )}
          <p className="flex justify-between gap-2">
            <span className="flex items-center gap-1 text-muted">
              <span className="inline-block h-0.5 w-2 rounded bg-[var(--chart-truth)]" /> Simulator
            </span>
            <span className="tabular-nums">{pct(truth[hi])}</span>
          </p>
        </div>
      )}
    </div>
  );
}

export function ChannelTable({
  model,
  truth,
}: {
  model: ArrayLike<number> | null;
  truth: ArrayLike<number>;
}) {
  return (
    <table className="w-full text-left text-xs tabular-nums">
      <thead className="sticky top-0 bg-surface-solid text-muted">
        <tr>
          <th className="px-2 py-1 font-medium">Channel</th>
          <th className="px-2 py-1 font-medium">Plane</th>
          <th className="px-2 py-1 text-right font-medium">Model</th>
          <th className="px-2 py-1 text-right font-medium">Simulator</th>
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: N_CHANNELS }, (_, i) => (
          <tr key={i} className="border-t border-line">
            <td className="px-2 py-0.5">{i}</td>
            <td className="px-2 py-0.5">{i < 64 ? "top" : "bottom"}</td>
            <td className="px-2 py-0.5 text-right">{model ? pct(model[i]) : "…"}</td>
            <td className="px-2 py-0.5 text-right">{pct(truth[i])}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

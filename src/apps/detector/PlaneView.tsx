"use client";

import { useRef, type KeyboardEvent, type PointerEvent } from "react";
import {
  CHANNELS_PER_PLANE,
  SENSORS,
  toCartesian,
  toPolar,
  type Cylindrical,
} from "@/lib/detector/geometry";

const SIZE = 200;
const R = 88; // detector radius in SVG units
const C = SIZE / 2;

interface PlaneViewProps {
  plane: "top" | "bottom";
  point: Cylindrical;
  /** Light fractions for all 128 channels (model if ready, else simulator). */
  values: ArrayLike<number>;
  highlight: number | null;
  onPick?: (rho: number, phi: number) => void;
  onHover?: (channel: number | null) => void;
}

/**
 * Looking down the cylinder axis at one sensor plane. Each sensor is shaded
 * on a single-hue sequential scale by its share of light. The top view is
 * also the (ρ, φ) picker: click or drag anywhere in the disk, or use arrow
 * keys (←/→ rotate φ, ↑/↓ change ρ).
 */
export function PlaneView({ plane, point, values, highlight, onPick, onHover }: PlaneViewProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const offset = plane === "top" ? 0 : CHANNELS_PER_PLANE;
  let max = 0;
  for (let i = 0; i < 128; i++) max = Math.max(max, values[i]);
  const [px, py] = toCartesian(point);

  const pick = (e: PointerEvent) => {
    const rect = svgRef.current!.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * SIZE - C;
    const y = -(((e.clientY - rect.top) / rect.height) * SIZE - C);
    const { rho, phi } = toPolar(x / R, y / R);
    onPick?.(rho, phi);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (!onPick) return;
    const big = e.shiftKey ? 5 : 1;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [0, 5 * big],
      ArrowRight: [0, -5 * big],
      ArrowUp: [0.02 * big, 0],
      ArrowDown: [-0.02 * big, 0],
    };
    const m = moves[e.key];
    if (!m) return;
    e.preventDefault();
    onPick(Math.min(1, Math.max(0, point.rho + m[0])), point.phi + m[1]);
  };

  const interactive = !!onPick;
  const label =
    plane === "top"
      ? `Top plane, looking down. Interaction point at rho ${point.rho.toFixed(2)}, phi ${point.phi.toFixed(0)} degrees. Use arrow keys to move it.`
      : "Bottom plane, looking down.";

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className={`w-full touch-none select-none ${interactive ? "cursor-crosshair rounded-full" : ""}`}
      role={interactive ? "slider" : "img"}
      aria-label={label}
      aria-valuetext={
        interactive ? `rho ${point.rho.toFixed(2)}, phi ${point.phi.toFixed(0)}°` : undefined
      }
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={onKeyDown}
      onPointerDown={(e) => {
        if (!interactive) return;
        (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId);
        pick(e);
      }}
      onPointerMove={(e) => interactive && e.buttons === 1 && pick(e)}
      onPointerLeave={() => onHover?.(null)}
    >
      <circle cx={C} cy={C} r={R + 6} fill="var(--surface-raised)" stroke="var(--border-strong)" />
      {[0.33, 0.66].map((r) => (
        <circle
          key={r}
          cx={C}
          cy={C}
          r={R * r}
          fill="none"
          stroke="var(--border)"
          strokeDasharray="2 3"
        />
      ))}
      <line x1={C - R} x2={C + R} y1={C} y2={C} stroke="var(--border)" />
      <line y1={C - R} y2={C + R} x1={C} x2={C} stroke="var(--border)" />
      {SENSORS.slice(offset, offset + CHANNELS_PER_PLANE).map(([sx, sy], i) => {
        const ch = offset + i;
        const t = max > 0 ? values[ch] / max : 0;
        return (
          <circle
            key={ch}
            cx={C + sx * R}
            cy={C - sy * R}
            r={ch === highlight ? 6.5 : 5}
            fill={`color-mix(in oklab, var(--chart-bar) ${Math.round(8 + t * 92)}%, var(--surface-raised))`}
            stroke={ch === highlight ? "var(--text)" : "var(--border-strong)"}
            strokeWidth={ch === highlight ? 1.5 : 0.75}
            onPointerEnter={() => onHover?.(ch)}
          />
        );
      })}
      {/* Interaction point, projected onto this plane. Hollow on the bottom view. */}
      <g transform={`translate(${C + px * R} ${C - py * R})`} pointerEvents="none">
        <circle r={7} fill="none" stroke="var(--surface-solid)" strokeWidth={4} />
        <circle
          r={7}
          fill="none"
          stroke="var(--text)"
          strokeWidth={1.75}
          strokeDasharray={plane === "bottom" ? "2 2" : undefined}
        />
        {plane === "top" && <circle r={2} fill="var(--text)" />}
      </g>
      <text x={C} y={SIZE - 1} textAnchor="middle" fontSize="9" fill="var(--text-faint)">
        φ = 0° →
      </text>
    </svg>
  );
}

/**
 * Side view of the cylinder: drag vertically (or use ↑/↓) to set z.
 * Implemented as a styled vertical slider so it has native semantics.
 */
export function DepthPicker({ z, onChange }: { z: number; onChange: (z: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const set = (e: PointerEvent) => {
    const rect = ref.current!.getBoundingClientRect();
    const t = 1 - (e.clientY - rect.top) / rect.height;
    onChange(Math.round((t * 2 - 1) * 100) / 100);
  };
  return (
    <div className="flex flex-col items-center gap-1 text-[10px] text-faint">
      <span>top</span>
      <div
        ref={ref}
        role="slider"
        tabIndex={0}
        aria-label="Height z (side view)"
        aria-orientation="vertical"
        aria-valuemin={-1}
        aria-valuemax={1}
        aria-valuenow={z}
        aria-valuetext={`z ${z.toFixed(2)}`}
        className="relative h-40 w-9 cursor-ns-resize touch-none rounded-md border border-line-strong bg-raised"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          set(e);
        }}
        onPointerMove={(e) => e.buttons === 1 && set(e)}
        onKeyDown={(e) => {
          const step = e.shiftKey ? 0.1 : 0.02;
          if (e.key === "ArrowUp" || e.key === "ArrowRight") onChange(Math.min(1, z + step));
          else if (e.key === "ArrowDown" || e.key === "ArrowLeft") onChange(Math.max(-1, z - step));
          else return;
          e.preventDefault();
        }}
      >
        <div className="absolute inset-x-0 top-0 h-1 rounded-t-md bg-[var(--chart-bar)] opacity-60" />
        <div className="absolute inset-x-0 bottom-0 h-1 rounded-b-md bg-[var(--chart-bar)] opacity-60" />
        <div
          className="absolute inset-x-1 h-0.5 -translate-y-1/2 rounded bg-text"
          style={{ top: `${((1 - z) / 2) * 100}%` }}
        >
          <span className="absolute top-1/2 left-1/2 size-3 -translate-1/2 rounded-full border-2 border-text bg-surface-solid" />
        </div>
      </div>
      <span>bottom</span>
    </div>
  );
}

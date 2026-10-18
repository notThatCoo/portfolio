"use client";

import { useId, useState } from "react";
import card from "@/lib/detector/model-card.json";
import { l1 } from "@/lib/detector/sim";
import { useDetectorPoint } from "@/lib/detector/store";
import { ChannelChart, ChannelTable } from "./ChannelChart";
import { DepthPicker, PlaneView } from "./PlaneView";
import { useInference } from "./useInference";

function sum(values: ArrayLike<number>, from: number, to: number) {
  let s = 0;
  for (let i = from; i < to; i++) s += values[i];
  return s;
}

function NumberField({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (v: number) => void;
}) {
  const id = useId();
  return (
    <div className="grid grid-cols-[2.25rem_1fr_3.5rem] items-center gap-2 text-xs">
      <label htmlFor={id} className="font-mono text-muted">
        {label}
      </label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--accent)]"
      />
      <output htmlFor={id} className="text-right font-mono tabular-nums">
        {value.toFixed(step < 1 ? 2 : 0)}
        {unit}
      </output>
    </div>
  );
}

export default function DetectorApp() {
  const { point, setPoint } = useDetectorPoint();
  const { status, prediction, truth, latencyMs, retry } = useInference(point);
  const [highlight, setHighlight] = useState<number | null>(null);
  const [showTruth, setShowTruth] = useState(true);
  const shown = prediction ?? truth;
  const metrics = card.metrics_vs_noise_free_simulator;

  return (
    <div className="@container h-full overflow-y-auto">
      <div
        role="note"
        className="flex flex-wrap items-center gap-x-2 gap-y-0.5 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs"
      >
        <strong className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] tracking-wide text-amber-700 uppercase dark:text-amber-300">
          Toy model · synthetic data
        </strong>
        <span className="text-muted">
          A small MLP trained on a simplified optical simulation, running in your browser with ONNX
          Runtime Web. It is not the DarkSide-20k research model and uses no real detector data.
        </span>
      </div>

      <div className="grid gap-5 p-4 @[640px]:grid-cols-[minmax(0,300px)_minmax(0,1fr)]">
        <section aria-labelledby="det-pos" className="space-y-3">
          <h3 id="det-pos" className="text-[13px] font-semibold">
            Interaction point
          </h3>
          <div className="flex items-start gap-3">
            <figure className="min-w-0 flex-1">
              <PlaneView
                plane="top"
                point={point}
                values={shown}
                highlight={highlight}
                onPick={(rho, phi) => setPoint({ rho, phi })}
                onHover={setHighlight}
              />
              <figcaption className="mt-1 text-center text-[11px] text-muted">
                Top view: click to set ρ, φ
              </figcaption>
            </figure>
            <DepthPicker z={point.z} onChange={(z) => setPoint({ z })} />
          </div>
          <div className="space-y-1.5">
            <NumberField
              label="ρ/R"
              value={point.rho}
              min={0}
              max={1}
              step={0.01}
              onChange={(rho) => setPoint({ rho })}
            />
            <NumberField
              label="φ"
              value={point.phi}
              min={0}
              max={359}
              step={1}
              unit="°"
              onChange={(phi) => setPoint({ phi })}
            />
            <NumberField
              label="z"
              value={point.z}
              min={-1}
              max={1}
              step={0.01}
              onChange={(z) => setPoint({ z })}
            />
          </div>
          <figure className="mx-auto w-32">
            <PlaneView
              plane="bottom"
              point={point}
              values={shown}
              highlight={highlight}
              onHover={setHighlight}
            />
            <figcaption className="text-center text-[11px] text-muted">Bottom plane</figcaption>
          </figure>
        </section>

        <section aria-labelledby="det-out" className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 id="det-out" className="text-[13px] font-semibold">
              Predicted light per channel
            </h3>
            <div className="flex items-center gap-3 text-[11px] text-muted">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-3 w-1.5 rounded-sm bg-[var(--chart-bar)]" /> Model
              </span>
              <label className="flex cursor-pointer items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={showTruth}
                  onChange={(e) => setShowTruth(e.target.checked)}
                  className="accent-[var(--accent)]"
                />
                <span className="inline-block h-0.5 w-3 rounded bg-[var(--chart-truth)]" />{" "}
                Simulator
              </label>
            </div>
          </div>

          <div aria-live="polite" className="text-xs text-muted">
            {status === "loading" &&
              "Loading ONNX Runtime… showing the simulator until the model is ready."}
            {status === "error" && (
              <span className="text-[var(--term-error)]">
                Couldn’t load the model.{" "}
                <button type="button" onClick={retry} className="underline">
                  Retry
                </button>
              </span>
            )}
          </div>

          <ChannelChart
            model={prediction}
            truth={truth}
            showTruth={showTruth}
            highlight={highlight}
            onHighlight={setHighlight}
          />

          <dl className="grid grid-cols-2 gap-2 @[900px]:grid-cols-4">
            {[
              ["Top plane", `${(sum(shown, 0, 64) * 100).toFixed(1)}%`],
              ["Bottom plane", `${(sum(shown, 64, 128) * 100).toFixed(1)}%`],
              [
                "Model vs. sim (L1)",
                prediction ? `${(l1(prediction, truth) * 100).toFixed(1)}%` : "…",
              ],
              ["Inference", latencyMs !== null ? `${latencyMs.toFixed(1)} ms` : "…"],
            ].map(([k, v]) => (
              <div key={k} className="rounded-lg border border-line bg-raised px-3 py-2">
                <dt className="text-[11px] text-muted">{k}</dt>
                <dd className="text-lg font-semibold tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>

          <details className="rounded-lg border border-line">
            <summary className="cursor-pointer px-3 py-2 text-xs font-medium">Data table</summary>
            <div className="max-h-60 overflow-y-auto border-t border-line">
              <ChannelTable model={prediction} truth={truth} />
            </div>
          </details>

          <details className="rounded-lg border border-line text-xs">
            <summary className="cursor-pointer px-3 py-2 font-medium">Model card</summary>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 border-t border-line px-3 py-3">
              <dt className="text-muted">Architecture</dt>
              <dd>{card.architecture}</dd>
              <dt className="text-muted">Parameters</dt>
              <dd className="tabular-nums">{card.parameters.toLocaleString()}</dd>
              <dt className="text-muted">Training data</dt>
              <dd>
                {card.training.events.toLocaleString()} simulated events,{" "}
                {card.training.photons_per_event.toLocaleString()} photons each (multinomial noise)
              </dd>
              <dt className="text-muted">Loss</dt>
              <dd>{card.training.loss}</dd>
              <dt className="text-muted">Validation</dt>
              <dd>
                Mean L1 vs. noise-free simulator {(metrics.mean_l1_distance * 100).toFixed(1)}% (p95{" "}
                {(metrics.p95_l1_distance * 100).toFixed(1)}%) on{" "}
                {card.validation_events.toLocaleString()} held-out events
              </dd>
              <dt className="text-muted">File</dt>
              <dd>{Math.round(card.onnx_bytes / 1024)} KB ONNX</dd>
              <dt className="text-muted">Source</dt>
              <dd>
                <code>ml/train.py</code>, reproducible with a fixed seed ({card.training.seed})
              </dd>
            </dl>
          </details>
        </section>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toCartesian, type Cylindrical } from "@/lib/detector/geometry";
import { loadModel, predict } from "@/lib/detector/model";
import { expectedFractions } from "@/lib/detector/sim";

export type ModelStatus = "loading" | "ready" | "error";

/**
 * Runs the ONNX model whenever the point changes. The simulator result is
 * synchronous, so the chart has something to show while the runtime loads.
 * Out-of-order results are dropped (only the latest request may commit).
 */
export function useInference(point: Cylindrical) {
  const [status, setStatus] = useState<ModelStatus>("loading");
  const [prediction, setPrediction] = useState<Float32Array | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [attempt, setAttempt] = useState(0);
  const requestId = useRef(0);

  const xyz = useMemo(() => toCartesian(point), [point]);
  const truth = useMemo(() => expectedFractions(xyz), [xyz]);

  useEffect(() => {
    let cancelled = false;
    loadModel().then(
      () => !cancelled && setStatus("ready"),
      (err) => {
        console.error("[detector] failed to load model", err);
        if (!cancelled) setStatus("error");
      },
    );
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  useEffect(() => {
    if (status !== "ready") return;
    const id = ++requestId.current;
    const t0 = performance.now();
    predict([xyz]).then(([out]) => {
      if (id !== requestId.current) return;
      setLatencyMs(performance.now() - t0);
      setPrediction(out);
    });
  }, [xyz, status]);

  const retry = () => {
    setStatus("loading");
    setAttempt((a) => a + 1);
  };

  return { status, prediction, truth, latencyMs, retry };
}

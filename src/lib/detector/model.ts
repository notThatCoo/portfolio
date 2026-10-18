import type { InferenceSession } from "onnxruntime-web";
import { N_CHANNELS } from "./geometry";

export const MODEL_URL = "/models/detector-toy.onnx";

type Ort = typeof import("onnxruntime-web/wasm");

let sessionPromise: Promise<{ ort: Ort; session: InferenceSession }> | null = null;

/**
 * Lazily load ONNX Runtime Web (wasm backend only, no WebGPU/WebGL code) and
 * the model. Memoized: every caller shares one session. On failure the cache
 * is cleared so a retry can succeed.
 */
export function loadModel() {
  sessionPromise ??= (async () => {
    const ort = await import("onnxruntime-web/wasm");
    // Versioned path (set in next.config.ts) so the binary can be cached as immutable.
    ort.env.wasm.wasmPaths = `/ort/${process.env.NEXT_PUBLIC_ORT_VERSION}/`;
    // Threads need cross-origin isolation (COOP/COEP); a 50k-param MLP doesn't need them.
    ort.env.wasm.numThreads = 1;
    const session = await ort.InferenceSession.create(MODEL_URL, {
      executionProviders: ["wasm"],
      graphOptimizationLevel: "all",
    });
    return { ort, session };
  })().catch((err) => {
    sessionPromise = null;
    throw err;
  });
  return sessionPromise;
}

/** Predict light fractions for a batch of cartesian points. */
export async function predict(points: [number, number, number][]): Promise<Float32Array[]> {
  const { ort, session } = await loadModel();
  const input = new ort.Tensor("float32", Float32Array.from(points.flat()), [points.length, 3]);
  const { fractions } = await session.run({ position: input });
  const data = fractions.data as Float32Array;
  return points.map((_, i) => data.slice(i * N_CHANNELS, (i + 1) * N_CHANNELS));
}

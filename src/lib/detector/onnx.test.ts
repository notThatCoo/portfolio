// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as ort from "onnxruntime-web/wasm";
import { describe, expect, it } from "vitest";
import golden from "./golden.json";

/**
 * Runs the committed ONNX file through the same runtime the browser uses
 * (ONNX Runtime Web, wasm backend) and checks it reproduces PyTorch's outputs.
 * Catches a stale model, a bad export, or a runtime upgrade that changes numerics.
 */
describe("detector-toy.onnx in ONNX Runtime Web", () => {
  it("reproduces the PyTorch outputs recorded at export time", async () => {
    ort.env.wasm.numThreads = 1;
    const root = join(__dirname, "../../..");
    ort.env.wasm.wasmPaths = join(root, "node_modules/onnxruntime-web/dist/");
    const bytes = readFileSync(join(root, "public/models/detector-toy.onnx"));
    const session = await ort.InferenceSession.create(bytes);
    const input = new ort.Tensor("float32", Float32Array.from(golden.inputs_xyz.flat()), [
      golden.inputs_xyz.length,
      3,
    ]);
    const { fractions } = await session.run({ position: input });
    const out = fractions.data as Float32Array;
    golden.model.forEach((row, i) =>
      row.forEach((v, k) => expect(out[i * 128 + k]).toBeCloseTo(v, 5)),
    );
  }, 30_000);
});

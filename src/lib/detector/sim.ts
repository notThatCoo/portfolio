import card from "./model-card.json";
import { N_CHANNELS, SENSORS } from "./geometry";

const { absorption_length: LAMBDA, diffuse_fraction: DIFFUSE, sensor_area: AREA } = card.simulator;

/**
 * TypeScript port of ml/toydetector/sim.py `expected_fractions`: the
 * noise-free toy simulator the model was trained to imitate. Shown next to
 * the model's prediction so visitors can see where the surrogate is off.
 * A golden-file test keeps it numerically identical to the Python version.
 */
export function expectedFractions([px, py, pz]: [number, number, number]): Float64Array {
  const out = new Float64Array(N_CHANNELS);
  let total = 0;
  for (let i = 0; i < N_CHANNELS; i++) {
    const [sx, sy, sz] = SENSORS[i];
    const dx = sx - px;
    const dy = sy - py;
    const dz = sz - pz;
    const d2 = dx * dx + dy * dy + dz * dz;
    const d = Math.sqrt(d2);
    const cos = Math.abs(dz) / Math.max(d, 1e-9);
    const v = ((AREA * cos) / (4 * Math.PI * Math.max(d2, 1e-4))) * Math.exp(-d / LAMBDA);
    out[i] = v;
    total += v;
  }
  for (let i = 0; i < N_CHANNELS; i++) {
    out[i] = (1 - DIFFUSE) * (out[i] / total) + DIFFUSE / N_CHANNELS;
  }
  return out;
}

/** L1 distance between two distributions (0 = identical, 2 = disjoint). */
export function l1(a: ArrayLike<number>, b: ArrayLike<number>): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]);
  return s;
}

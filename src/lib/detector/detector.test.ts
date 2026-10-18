import { describe, expect, it } from "vitest";
import golden from "./golden.json";
import { N_CHANNELS, SENSORS, toCartesian, toPolar } from "./geometry";
import { expectedFractions, l1 } from "./sim";

describe("geometry", () => {
  it("has 128 sensors, half on each plane", () => {
    expect(SENSORS).toHaveLength(N_CHANNELS);
    expect(SENSORS.filter((s) => s[2] === 1)).toHaveLength(64);
  });

  it("matches the Python cylindrical → cartesian conversion", () => {
    golden.inputs_cylindrical.forEach(([rho, phi, z], i) => {
      toCartesian({ rho, phi, z }).forEach((v, k) =>
        expect(v).toBeCloseTo(golden.inputs_xyz[i][k], 6),
      );
    });
  });

  it("toPolar inverts toCartesian", () => {
    const [x, y] = toCartesian({ rho: 0.6, phi: 210, z: 0 });
    const p = toPolar(x, y);
    expect(p.rho).toBeCloseTo(0.6);
    expect(p.phi).toBeCloseTo(210);
  });
});

describe("TS simulator", () => {
  it("matches the Python simulator on the golden inputs", () => {
    golden.inputs_xyz.forEach((xyz, i) => {
      const ts = expectedFractions(xyz as [number, number, number]);
      // Sensor positions are stored to 6 decimals, so allow rounding-level drift.
      expect(l1(ts, golden.simulator[i])).toBeLessThan(1e-5);
    });
  });

  it("returns a probability distribution", () => {
    const f = expectedFractions([0.2, -0.3, 0.5]);
    expect(f.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
    expect(Math.min(...f)).toBeGreaterThan(0);
  });

  it("sends more light to the nearer plane", () => {
    const top = (f: Float64Array) => f.slice(0, 64).reduce((a, b) => a + b, 0);
    expect(top(expectedFractions([0, 0, 0.8]))).toBeGreaterThan(0.7);
    expect(top(expectedFractions([0, 0, -0.8]))).toBeLessThan(0.3);
  });
});

describe("golden model outputs", () => {
  it("stay close to the simulator (sanity check on the trained model)", () => {
    golden.model.forEach((pred, i) => {
      expect(l1(pred, golden.simulator[i])).toBeLessThan(0.25);
    });
  });
});

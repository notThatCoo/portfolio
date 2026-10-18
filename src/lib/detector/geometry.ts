import card from "./model-card.json";

export const N_CHANNELS = 128;
export const CHANNELS_PER_PLANE = 64;

/** Sensor centers (x, y, z) in normalized units; 0–63 top plane, 64–127 bottom. */
export const SENSORS = card.sensors as [number, number, number][];

export interface Cylindrical {
  /** ρ/R, 0–1 */
  rho: number;
  /** degrees, 0–360 */
  phi: number;
  /** z/(H/2), −1–1 */
  z: number;
}

export function toCartesian({ rho, phi, z }: Cylindrical): [number, number, number] {
  const t = (phi * Math.PI) / 180;
  return [rho * Math.cos(t), rho * Math.sin(t), z];
}

/** Inverse of toCartesian for points in the x–y plane; phi normalized to [0, 360). */
export function toPolar(x: number, y: number): { rho: number; phi: number } {
  const rho = Math.min(1, Math.hypot(x, y));
  const phi = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
  return { rho, phi };
}

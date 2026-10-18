"use client";

import { create } from "zustand";
import type { Cylindrical } from "./geometry";

/**
 * The selected interaction point, shared by the Detector window and the
 * Terminal's `simulate` command (running `simulate` moves the Detector's
 * marker). Client-only UI state; nothing here is rendered on the server.
 */
interface DetectorPointStore {
  point: Cylindrical;
  setPoint: (p: Partial<Cylindrical>) => void;
}

export const clampPoint = (p: Cylindrical): Cylindrical => ({
  rho: Math.min(1, Math.max(0, p.rho)),
  phi: ((p.phi % 360) + 360) % 360,
  z: Math.min(1, Math.max(-1, p.z)),
});

export const useDetectorPoint = create<DetectorPointStore>()((set) => ({
  point: { rho: 0.5, phi: 45, z: 0.3 },
  setPoint: (p) => set((s) => ({ point: clampPoint({ ...s.point, ...p }) })),
}));

"""
Toy optical model of a cylindrical detector. SYNTHETIC — not DarkSide-20k.

Geometry (all lengths normalized):
  * cylinder of radius R = 1 and half-height H = 1, axis along z
  * two photosensor planes, at z = +1 (top) and z = -1 (bottom)
  * 64 sensors per plane on concentric rings -> 128 channels

Physics, deliberately simple but with the right qualitative shape:
  * direct light: solid angle of a small flat sensor,  A * cos(theta) / (4 pi d^2)
  * absorption along the path: exp(-d / lambda)
  * a diffuse floor (reflections / scattering) shared evenly by all channels

`expected_fractions` is the noise-free share of light each channel sees.
`sample_fractions` adds photon-counting (multinomial) noise, which is what a
real detector measures and what the network is trained on.

`src/lib/detector/sim.ts` mirrors this file; a golden-file test keeps the two
implementations in agreement.
"""

from __future__ import annotations

import numpy as np

RING_RADII = (0.0, 0.22, 0.44, 0.66, 0.88)
RING_COUNTS = (1, 6, 12, 18, 27)  # 64 per plane
SENSOR_AREA = 0.02
ABSORPTION_LENGTH = 3.0
DIFFUSE_FRACTION = 0.12
N_CHANNELS = 128


def sensor_positions() -> np.ndarray:
    """(128, 3) array of sensor centers: 64 on the top plane, then 64 on the bottom."""
    plane = []
    for ring, (radius, count) in enumerate(zip(RING_RADII, RING_COUNTS, strict=True)):
        # Offset alternate rings by half a step so sensors don't line up radially.
        offset = np.pi / count if ring % 2 else 0.0
        for k in range(count):
            angle = 2 * np.pi * k / count + offset
            plane.append((radius * np.cos(angle), radius * np.sin(angle)))
    plane_xy = np.array(plane)
    top = np.column_stack([plane_xy, np.ones(len(plane_xy))])
    bottom = np.column_stack([plane_xy, -np.ones(len(plane_xy))])
    return np.vstack([top, bottom])


SENSORS = sensor_positions()


def cylindrical_to_cartesian(rho: np.ndarray, phi_deg: np.ndarray, z: np.ndarray) -> np.ndarray:
    phi = np.deg2rad(phi_deg)
    return np.column_stack([rho * np.cos(phi), rho * np.sin(phi), z])


def expected_fractions(points: np.ndarray) -> np.ndarray:
    """(N, 3) cartesian points -> (N, 128) expected light fractions (rows sum to 1)."""
    points = np.atleast_2d(points)
    delta = SENSORS[None, :, :] - points[:, None, :]  # (N, 128, 3)
    d2 = np.sum(delta**2, axis=-1)
    d = np.sqrt(d2)
    cos_theta = np.abs(delta[..., 2]) / np.maximum(d, 1e-9)
    direct = SENSOR_AREA * cos_theta / (4 * np.pi * np.maximum(d2, 1e-4)) * np.exp(-d / ABSORPTION_LENGTH)
    direct /= direct.sum(axis=1, keepdims=True)
    return (1 - DIFFUSE_FRACTION) * direct + DIFFUSE_FRACTION / N_CHANNELS


def sample_points(n: int, rng: np.random.Generator) -> np.ndarray:
    """Uniform in the cylinder volume (rho ~ sqrt(U) so density is uniform in area)."""
    rho = np.sqrt(rng.uniform(0, 1, n))
    phi = rng.uniform(0, 360, n)
    z = rng.uniform(-1, 1, n)
    return cylindrical_to_cartesian(rho, phi, z)


def sample_fractions(points: np.ndarray, photons: int, rng: np.random.Generator) -> np.ndarray:
    """Noisy measured fractions: draw `photons` photons per event from the expected pattern."""
    probs = expected_fractions(points)
    counts = np.stack([rng.multinomial(photons, p) for p in probs])
    return counts / photons

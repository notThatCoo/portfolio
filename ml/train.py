"""
Train the toy detector surrogate and export it for the browser.

    cd ml && uv run train.py

Outputs (all committed, so the site builds without Python):
  public/models/detector-toy.onnx      the model, run in-browser by ONNX Runtime Web
  src/lib/detector/model-card.json     metrics + sensor layout, shown in the Detector app
  src/lib/detector/golden.json         fixed inputs with PyTorch + simulator outputs;
                                       Vitest checks ONNX Runtime and the TS simulator match

This is a TOY: a small MLP trained on synthetic data from toydetector/sim.py.
It illustrates the surrogate idea; it is not the DarkSide-20k research model.
"""

from __future__ import annotations

import argparse
import json
import time
from pathlib import Path

import numpy as np
import onnxruntime as ort
import torch
from torch import nn

from toydetector import sim

ROOT = Path(__file__).resolve().parent.parent
MODEL_PATH = ROOT / "public" / "models" / "detector-toy.onnx"
CARD_PATH = ROOT / "src" / "lib" / "detector" / "model-card.json"
GOLDEN_PATH = ROOT / "src" / "lib" / "detector" / "golden.json"


class Surrogate(nn.Module):
    """(x, y, z) -> 128 light fractions. Softmax output guarantees a valid distribution."""

    def __init__(self, hidden: int = 128, channels: int = sim.N_CHANNELS):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(3, hidden),
            nn.SiLU(),
            nn.Linear(hidden, hidden),
            nn.SiLU(),
            nn.Linear(hidden, hidden),
            nn.SiLU(),
            nn.Linear(hidden, channels),
        )

    def forward(self, xyz: torch.Tensor) -> torch.Tensor:
        return torch.softmax(self.net(xyz), dim=-1)


def soft_cross_entropy(pred: torch.Tensor, target: torch.Tensor) -> torch.Tensor:
    """Cross-entropy against noisy measured fractions (equivalent to KL up to a constant)."""
    return -(target * torch.log(pred.clamp_min(1e-9))).sum(dim=1).mean()


def evaluate(model: nn.Module, points: np.ndarray) -> dict[str, float]:
    """Compare predictions to the *noise-free* simulator, which the model never saw directly."""
    truth = sim.expected_fractions(points)
    with torch.no_grad():
        pred = model(torch.from_numpy(points).float()).numpy()
    abs_err = np.abs(pred - truth)
    rel_err = abs_err.sum(axis=1) / truth.sum(axis=1)  # L1 distance between distributions
    # Fraction of light landing on the top plane: a physically meaningful summary.
    top_pred, top_true = pred[:, :64].sum(1), truth[:, :64].sum(1)
    return {
        "mean_abs_error_per_channel": float(abs_err.mean()),
        "mean_l1_distance": float(rel_err.mean()),
        "p95_l1_distance": float(np.percentile(rel_err, 95)),
        "top_fraction_mae": float(np.abs(top_pred - top_true).mean()),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--train", type=int, default=120_000, help="training events")
    parser.add_argument("--val", type=int, default=10_000, help="validation events")
    parser.add_argument("--photons", type=int, default=4_000, help="photons per event (noise level)")
    parser.add_argument("--epochs", type=int, default=100)
    parser.add_argument("--seed", type=int, default=7)
    args = parser.parse_args()

    rng = np.random.default_rng(args.seed)
    torch.manual_seed(args.seed)

    t0 = time.time()
    x_train = sim.sample_points(args.train, rng)
    y_train = sim.sample_fractions(x_train, args.photons, rng)
    x_val = sim.sample_points(args.val, rng)
    print(f"simulated {args.train:,} events in {time.time() - t0:.1f}s")

    model = Surrogate()
    opt = torch.optim.AdamW(model.parameters(), lr=3e-3, weight_decay=1e-5)
    sched = torch.optim.lr_scheduler.CosineAnnealingLR(opt, T_max=args.epochs)
    xt = torch.from_numpy(x_train).float()
    yt = torch.from_numpy(y_train).float()
    batch = 512

    for epoch in range(1, args.epochs + 1):
        model.train()
        perm = torch.randperm(len(xt))
        total = 0.0
        for i in range(0, len(xt), batch):
            idx = perm[i : i + batch]
            loss = soft_cross_entropy(model(xt[idx]), yt[idx])
            opt.zero_grad()
            loss.backward()
            opt.step()
            total += loss.item() * len(idx)
        sched.step()
        if epoch % 5 == 0 or epoch == 1:
            model.eval()
            m = evaluate(model, x_val)
            print(f"epoch {epoch:3d}  loss {total / len(xt):.5f}  val L1 {m['mean_l1_distance']:.4f}")

    model.eval()
    metrics = evaluate(model, x_val)
    print("final:", json.dumps(metrics, indent=2))

    # ── Export ──────────────────────────────────────────────────────────
    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    example = torch.zeros(1, 3)
    torch.onnx.export(
        model,
        (example,),
        str(MODEL_PATH),
        input_names=["position"],
        output_names=["fractions"],
        dynamic_shapes={"xyz": {0: torch.export.Dim("batch", min=1, max=4096)}},
        opset_version=18,
        external_data=False,
    )
    size_kb = MODEL_PATH.stat().st_size / 1024
    print(f"wrote {MODEL_PATH.relative_to(ROOT)} ({size_kb:.0f} KB)")

    # Golden file: fixed points with PyTorch, ONNX Runtime, and simulator outputs.
    golden_cyl = np.array([[0.0, 0.0, 0.0], [0.5, 45.0, 0.3], [0.9, 200.0, -0.8], [0.3, 300.0, 0.95]])
    golden_xyz = sim.cylindrical_to_cartesian(golden_cyl[:, 0], golden_cyl[:, 1], golden_cyl[:, 2])
    with torch.no_grad():
        torch_out = model(torch.from_numpy(golden_xyz).float()).numpy()
    session = ort.InferenceSession(str(MODEL_PATH))
    ort_out = session.run(None, {"position": golden_xyz.astype(np.float32)})[0]
    max_diff = float(np.abs(torch_out - ort_out).max())
    assert max_diff < 1e-5, f"ONNX export diverges from PyTorch by {max_diff}"

    GOLDEN_PATH.parent.mkdir(parents=True, exist_ok=True)
    GOLDEN_PATH.write_text(
        json.dumps(
            {
                "inputs_cylindrical": golden_cyl.tolist(),
                "inputs_xyz": golden_xyz.round(8).tolist(),
                "model": torch_out.round(7).tolist(),
                "simulator": sim.expected_fractions(golden_xyz).round(9).tolist(),
            }
        )
        + "\n"
    )

    card = {
        "name": "detector-toy",
        "disclaimer": "Toy model trained on synthetic data from a simplified optical simulation. Not DarkSide-20k data or the research model.",
        "architecture": "MLP 3 → 128 → 128 → 128 → 128 (SiLU), softmax output",
        "parameters": int(sum(p.numel() for p in model.parameters())),
        "inputs": "Cartesian position (x, y, z) in units of the radius / half-height",
        "outputs": "Fraction of detected light in each of 128 channels (top plane 0–63, bottom 64–127)",
        "training": {
            "events": args.train,
            "photons_per_event": args.photons,
            "epochs": args.epochs,
            "seed": args.seed,
            "loss": "soft cross-entropy vs. multinomial-noised fractions",
        },
        "metrics_vs_noise_free_simulator": {k: round(v, 6) for k, v in metrics.items()},
        "validation_events": args.val,
        "onnx_bytes": MODEL_PATH.stat().st_size,
        "simulator": {
            "absorption_length": sim.ABSORPTION_LENGTH,
            "diffuse_fraction": sim.DIFFUSE_FRACTION,
            "sensor_area": sim.SENSOR_AREA,
        },
        "sensors": sim.SENSORS.round(6).tolist(),
    }
    CARD_PATH.write_text(json.dumps(card, indent=2) + "\n")
    print(f"wrote {CARD_PATH.relative_to(ROOT)} and {GOLDEN_PATH.relative_to(ROOT)}")


if __name__ == "__main__":
    main()

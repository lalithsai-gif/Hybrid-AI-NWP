"""Real SDW-Net forward pass. Requires the same tensors used at training time."""

from __future__ import annotations

from typing import Any
import numpy as np

from .artifacts import ArtifactStore, GUARDRAIL_K
from .sdw_net import GLOBAL_CHANNELS, LOCAL_EXTRA_CHANNELS, N_MODELS, TORCH_AVAILABLE


def _as_batch(name: str, arr: Any, c: int, h: int, w: int):
    if not TORCH_AVAILABLE:
        raise RuntimeError("PyTorch is required for live inference execution.")
    import torch
    a = np.asarray(arr, dtype=np.float32)
    if a.shape == (c, h, w):
        a = a[None, ...]
    elif a.shape == (1, c, h, w):
        pass
    else:
        raise ValueError(f"{name} expected ({c}, {h}, {w}) or (1, {c}, {h}, {w}), got {tuple(a.shape)}")
    return torch.from_numpy(np.ascontiguousarray(a))


def run_inference(store: ArtifactStore, payload: dict[str, Any]) -> dict[str, Any]:
    missing = [k for k in ("candidate", "local_extra", "regime", "lead") if k not in payload or payload[k] is None]
    if missing or not TORCH_AVAILABLE or store.model is None:
        msg = (
            "Live inference requires the full SDW-Net feature tensors: "
            "candidate forecasts (3xHxW), local_extra (13xHxW: spread, range, lead-skill, static terrain), "
            "and regime (3xHxW: Z500, T850, MSLP). "
        )
        if not TORCH_AVAILABLE:
            msg += "PyTorch is currently not available in this environment. Historical locked-test outputs are served directly from locked_test_outputs.npz."
        else:
            msg += "These tensors were not packaged inside locked_test_outputs.npz. All historical maps are retrieved from locked-test evaluation."

        return {
            "ok": False,
            "error": "incomplete_inputs" if missing else "model_unavailable",
            "missing": missing,
            "message": msg,
            "required": {
                "candidate": [N_MODELS, store.height, store.width],
                "local_extra": [LOCAL_EXTRA_CHANNELS, store.height, store.width],
                "regime": [GLOBAL_CHANNELS, store.height, store.width],
                "lead": "hours in {24, 48, 72, 120} or lead/max_lead in (0, 1]",
                "sin_doy": "optional float",
                "cos_doy": "optional float",
                "mask": f"optional length-{N_MODELS} availability mask [HRES, GraphCast, Pangu]",
            },
        }

    import torch
    h, w = store.height, store.width
    try:
        cand = _as_batch("candidate", payload["candidate"], N_MODELS, h, w)
        extra = _as_batch("local_extra", payload["local_extra"], LOCAL_EXTRA_CHANNELS, h, w)
        regime = _as_batch("regime", payload["regime"], GLOBAL_CHANNELS, h, w)
    except ValueError as exc:
        return {"ok": False, "error": "shape_mismatch", "message": str(exc)}

    lead_hours = float(payload["lead"])
    max_lead = float(payload.get("max_lead", 120.0))
    lead_norm = lead_hours / max_lead if lead_hours > 1.5 else lead_hours
    lead = torch.tensor([lead_norm], dtype=torch.float32)

    sin_doy = torch.tensor([float(payload.get("sin_doy", 0.0))], dtype=torch.float32)
    cos_doy = torch.tensor([float(payload.get("cos_doy", 1.0))], dtype=torch.float32)

    if payload.get("mask") is not None:
        mask = np.asarray(payload["mask"], dtype=np.float32).reshape(-1)
        if mask.size != N_MODELS:
            return {"ok": False, "error": "shape_mismatch", "message": f"mask length {mask.size} != {N_MODELS}"}
        mask_t = torch.from_numpy(mask)[None, :]
    else:
        mask_t = torch.ones(1, N_MODELS, dtype=torch.float32)

    with torch.no_grad():
        store.model.eval()
        weights, residual = store.model(
            cand, extra, regime, lead, sin_doy, cos_doy, mask_t, return_residual=True
        )
        base = (weights * cand).sum(dim=1, keepdim=True)
        pred = base + residual

    evp_alpha = float(store.ckpt.get("evp_alpha", 0.75))
    thr = float(store.ckpt.get("extreme_threshold_normalized", 1.645))
    cand_np = cand.numpy()
    pred_np = pred.numpy()
    maximum = cand_np.max(axis=1, keepdims=True)
    excess = np.maximum(maximum - thr, 0.0)
    activation = 1.0 - np.exp(-excess)
    pred_evp = pred_np + evp_alpha * activation * (maximum - pred_np)

    lower_n = (GUARDRAIL_K[0] - store.train_mean) / store.train_std
    upper_n = (GUARDRAIL_K[1] - store.train_mean) / store.train_std
    pred_final = np.clip(pred_evp, lower_n, upper_n)

    pred_c = store.to_c(pred_final[0, 0])
    base_c = store.to_c(base.numpy()[0, 0])
    w_out = weights.numpy()[0]

    return {
        "ok": True,
        "units": "degC",
        "weights": w_out.tolist(),
        "pred_base_C": base_c.tolist(),
        "pred_final_C": pred_c.tolist(),
        "residual_normalized": residual.numpy()[0, 0].tolist(),
        "evp_alpha": evp_alpha,
        "guardrail_applied": bool(np.any(pred_evp != pred_final)),
        "note": "Forward pass executed using saved SDW-Net checkpoint with validation-tuned EVP and Kelvin guardrails.",
    }
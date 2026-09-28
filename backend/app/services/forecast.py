from __future__ import annotations

import numpy as np

from ..ml.artifacts import MODEL_NAMES, ArtifactStore

# Simplified India mainland outline (lon, lat) for Leaflet / SVG overlay
INDIA_RING = [
    [68.1, 23.7], [69.6, 22.4], [70.4, 20.7], [72.8, 18.9], [73.1, 16.5],
    [74.5, 14.0], [75.5, 12.0], [76.8, 8.9], [77.5, 8.1], [78.1, 8.5],
    [80.3, 13.2], [80.2, 16.0], [82.5, 17.3], [84.4, 19.3], [86.9, 21.4],
    [88.1, 21.6], [88.9, 23.0], [89.8, 25.2], [92.3, 24.5], [93.3, 24.7],
    [94.3, 25.6], [95.4, 27.5], [97.4, 27.8], [95.2, 27.0], [91.7, 26.7],
    [90.3, 28.1], [88.9, 27.3], [88.1, 27.8], [86.0, 27.5], [83.0, 29.1],
    [80.4, 30.4], [78.2, 32.5], [76.1, 35.5], [74.8, 37.0], [73.7, 36.2],
    [74.9, 32.5], [73.2, 31.5], [71.8, 30.0], [70.3, 28.6], [69.3, 26.8],
    [70.2, 25.5], [69.5, 24.2], [68.1, 23.7],
]


def _nanstats(pred: np.ndarray, truth: np.ndarray) -> dict:
    err = pred - truth
    rmse = float(np.sqrt(np.nanmean(err ** 2)))
    mae = float(np.nanmean(np.abs(err)))
    bias = float(np.nanmean(err))
    p = pred - np.nanmean(pred)
    t = truth - np.nanmean(truth)
    acc = float(np.nansum(p * t) / (np.sqrt(np.nansum(p ** 2) * np.nansum(t ** 2)) + 1e-12))
    return {
        "RMSE_C": rmse,
        "MAE_C": mae,
        "Bias_C": bias,
        "ACC": acc,
    }


def grid_payload(store: ArtifactStore, values: np.ndarray, units: str = "degC") -> dict:
    v = store.field_2d(values)
    return {
        "latitudes": store.lats.tolist(),
        "longitudes": store.lons.tolist(),
        "values": np.where(np.isfinite(v), v, None).tolist(),
        "min": float(np.nanmin(v)),
        "max": float(np.nanmax(v)),
        "mean": float(np.nanmean(v)),
        "units": units,
        "bounds": [
            [float(store.lats.min()), float(store.lons.min())],
            [float(store.lats.max()), float(store.lons.max())],
        ],
    }


def sample_fields(store: ArtifactStore, i: int) -> dict[str, np.ndarray]:
    cand = store.to_c(store.candidates[i])
    aura = store.to_c(store.field_2d(store.pred_final[i]))
    base = store.to_c(store.field_2d(store.pred_base[i]))
    truth = store.to_c(store.field_2d(store.truth[i]))
    arith = cand.mean(axis=0)
    return {
        "HRES": cand[0],
        "GraphCast": cand[1],
        "Pangu": cand[2],
        "AURA-BLEND": aura,
        "AURA-BLEND-base": base,
        "truth": truth,
        "Arithmetic Mean": arith,
        "c-candidates": cand,
        "candidates": cand,
        "weights": store.weights[i],
        # Differences
        "diff_hres": aura - cand[0],
        "diff_graphcast": aura - cand[1],
        "diff_pangu": aura - cand[2],
        "diff_mean": aura - arith,
        "diff_truth": aura - truth,
    }


def resolve_model_field(fields: dict[str, np.ndarray], model: str) -> tuple[np.ndarray, str, str]:
    m = model.lower().strip().replace(" ", "_").replace("-", "_")
    mapping = {
        "hres": ("HRES", fields["HRES"], "degC"),
        "graphcast": ("GraphCast", fields["GraphCast"], "degC"),
        "pangu": ("Pangu", fields["Pangu"], "degC"),
        "aura": ("AURA-BLEND", fields["AURA-BLEND"], "degC"),
        "aura_blend": ("AURA-BLEND", fields["AURA-BLEND"], "degC"),
        "mean": ("Arithmetic Mean", fields["Arithmetic Mean"], "degC"),
        "arithmetic_mean": ("Arithmetic Mean", fields["Arithmetic Mean"], "degC"),
        "truth": ("ERA5 Ground Truth", fields["truth"], "degC"),
        "era5": ("ERA5 Ground Truth", fields["truth"], "degC"),
        "base": ("AURA-BLEND (Base)", fields["AURA-BLEND-base"], "degC"),
        # Difference maps
        "aura_minus_hres": ("AURA − HRES", fields["diff_hres"], "degC difference"),
        "diff_hres": ("AURA − HRES", fields["diff_hres"], "degC difference"),
        "aura_minus_graphcast": ("AURA − GraphCast", fields["diff_graphcast"], "degC difference"),
        "diff_graphcast": ("AURA − GraphCast", fields["diff_graphcast"], "degC difference"),
        "aura_minus_pangu": ("AURA − Pangu", fields["diff_pangu"], "degC difference"),
        "diff_pangu": ("AURA − Pangu", fields["diff_pangu"], "degC difference"),
        "aura_minus_mean": ("AURA − Arithmetic Mean", fields["diff_mean"], "degC difference"),
        "diff_mean": ("AURA − Arithmetic Mean", fields["diff_mean"], "degC difference"),
        "diff_truth": ("AURA − ERA5 Error", fields["diff_truth"], "degC error"),
        # Contribution weight maps
        "weight_hres": ("HRES Contribution Weight", fields["weights"][0] * 100.0, "% contribution"),
        "weight_graphcast": ("GraphCast Contribution Weight", fields["weights"][1] * 100.0, "% contribution"),
        "weight_pangu": ("Pangu Contribution Weight", fields["weights"][2] * 100.0, "% contribution"),
        # Verification spatial error map
        "verification": ("AURA-BLEND Spatial Absolute Error (|AURA − ERA5|)", np.abs(fields["diff_truth"]), "degC error"),
        "error_aura": ("AURA-BLEND Spatial Error (AURA − ERA5)", fields["diff_truth"], "degC error"),
        # Extreme event guidance
        "extreme_guidance": ("EVP Upper-Tail Delta", fields["AURA-BLEND"] - fields["AURA-BLEND-base"], "degC adjustment"),
    }
    if m in mapping:
        label, arr, units = mapping[m]
        return arr, label, units
    # default to aura
    return fields["AURA-BLEND"], "AURA-BLEND", "degC"


def missing_source_blend(
    weights: np.ndarray,
    candidates_c: np.ndarray,
    mask: list[int] | None,
) -> tuple[np.ndarray, np.ndarray]:
    w = weights.astype(np.float64).copy()
    if mask is None:
        mask_arr = np.ones(w.shape[0], dtype=np.float64)
    else:
        mask_arr = np.asarray(mask, dtype=np.float64)
        if mask_arr.size != w.shape[0]:
            raise ValueError("mask must have 3 values (HRES, GraphCast, Pangu)")
    w = w * mask_arr[:, None, None]
    w = w / (w.sum(axis=0, keepdims=True) + 1e-8)
    blend = (w * candidates_c).sum(axis=0)
    return w.astype(np.float32), blend.astype(np.float32)


def evp_status(store: ArtifactStore, i: int) -> dict:
    base = store.field_2d(store.pred_base[i])
    final = store.field_2d(store.pred_final[i])
    delta = final - base
    lower_n = (180.0 - store.train_mean) / store.train_std
    upper_n = (340.0 - store.train_mean) / store.train_std
    clipped = bool(np.any(np.isclose(final, lower_n) | np.isclose(final, upper_n)))
    alpha = float(store.ckpt.get("evp_alpha", 0.75))
    thr = float(store.ckpt.get("extreme_threshold_normalized", 1.645))
    return {
        "evp_alpha": alpha,
        "extreme_threshold_normalized": thr,
        "mean_abs_delta_normalized": float(np.mean(np.abs(delta))),
        "max_abs_delta_normalized": float(np.max(np.abs(delta))),
        "evp_or_guardrail_changed_field": bool(np.max(np.abs(delta)) > 1e-8),
        "guardrail_clip_detected": clipped,
        "guardrail_bounds_kelvin": [180.0, 340.0],
        "guardrail_bounds_celsius": [180.0 - 273.15, 340.0 - 273.15],
        "note": "pred_final is locked-test output after bounded calibration, validation-tuned EVP, and Kelvin guardrails.",
    }


def per_sample_metrics(store: ArtifactStore, i: int) -> dict:
    f = sample_fields(store, i)
    truth = f["truth"]
    out = {}
    for name in ["HRES", "GraphCast", "Pangu", "Arithmetic Mean", "AURA-BLEND"]:
        out[name] = _nanstats(f[name], truth)
    return out


def list_dates(store: ArtifactStore) -> list[dict]:
    by_date: dict[str, set[int]] = {}
    for i in range(store.n_samples):
        d = store.init_date(i)
        by_date.setdefault(d, set()).add(int(store.sample_lead[i]))
    return [{"date": d, "leads": sorted(leads)} for d, leads in sorted(by_date.items())]


def build_cases(store: ArtifactStore) -> list[dict]:
    n = store.n_samples
    spread = store.candidates.std(axis=1).mean(axis=(1, 2))
    aura = np.stack([store.field_2d(store.pred_final[i]) for i in range(n)])
    mean = store.candidates.mean(axis=1)
    delta = np.abs(aura - mean).mean(axis=(1, 2))
    residual = np.abs(
        np.stack([store.field_2d(store.pred_final[i]) for i in range(n)])
        - np.stack([store.field_2d(store.pred_base[i]) for i in range(n)])
    ).mean(axis=(1, 2))
    lead120 = np.where(store.sample_lead == 120)[0]
    idx_spread = int(np.argmax(spread))
    idx_delta = int(np.argmax(delta))
    idx_res = int(np.argmax(residual))
    idx_120 = int(lead120[int(np.argmax(spread[lead120]))]) if len(lead120) else idx_spread

    specs = [
        ("max_disagreement", idx_spread, "High Divergence Case", "Largest mean inter-model spread among candidate models on the locked test set."),
        ("max_aura_vs_mean", idx_delta, "Maximum Adaptive Gain", "Largest mean |AURA-BLEND - arithmetic mean|, where spatially adaptive weighting creates the greatest divergence from naive averaging."),
        ("lead_120h_disagreement", idx_120, "Day-5 (120h) Challenge", "Largest spread among 120h locked-test samples, demonstrating long-lead skill preservation."),
        ("max_evp_delta", idx_res, "Extreme Value Preservation", "Largest mean |pred_final - pred_base|, illustrating the EVP module restoring physical extreme warmth."),
    ]
    cases = []
    seen = set()
    for cid, idx, title, reason in specs:
        if idx in seen:
            cid = f"{cid}_{idx}"
        seen.add(idx)
        cases.append(
            {
                "id": cid,
                "title": title,
                "index": idx,
                "date": store.init_date(idx),
                "init": store.init_iso(idx),
                "lead_hours": int(store.sample_lead[idx]),
                "reason": reason,
            }
        )
    return cases


def case_detail(store: ArtifactStore, case_id: str) -> dict:
    cases = build_cases(store)
    match = next((c for c in cases if c["id"] == case_id), None)
    if match is None:
        raise KeyError(case_id)
    i = match["index"]
    f = sample_fields(store, i)
    cand = f["candidates"]
    disagreement = cand.std(axis=0)
    w = f["weights"]
    steps = [
        {"id": "hres", "title": "HRES Forecast (ECMWF Physics)", "model": "HRES", "description": "Operational global NWP model from ECMWF."},
        {"id": "graphcast", "title": "GraphCast Forecast (DeepMind GNN)", "model": "GraphCast", "description": "Graph neural network forecast trained on ERA5."},
        {"id": "pangu", "title": "Pangu-Weather Forecast (Huawei 3D-ViT)", "model": "Pangu", "description": "3D Earth-specific vision transformer."},
        {"id": "disagreement", "title": "Model Disagreement (Spread)", "units": "degC", "description": "Standard deviation across the three models showing uncertainty hotspots."},
        {"id": "weights", "title": "SDW-Net Adaptive Weights", "units": "fraction", "description": "Learned spatial gating coefficients (HRES, GraphCast, Pangu) summing to 1.0 at every grid point."},
        {"id": "aura", "title": "AURA-BLEND Consensus Forecast", "model": "AURA-BLEND", "description": "Spatially weighted consensus with bounded calibration, EVP, and Kelvin guardrails."},
        {"id": "difference", "title": "AURA-BLEND vs Arithmetic Mean", "units": "degC", "description": "Difference from naive average showing where intelligent weighting modifies the forecast."},
    ]
    return {
        **match,
        "metrics": per_sample_metrics(store, i),
        "evp": evp_status(store, i),
        "maps": {
            "HRES": grid_payload(store, f["HRES"]),
            "GraphCast": grid_payload(store, f["GraphCast"]),
            "Pangu": grid_payload(store, f["Pangu"]),
            "AURA-BLEND": grid_payload(store, f["AURA-BLEND"]),
            "Arithmetic Mean": grid_payload(store, f["Arithmetic Mean"]),
            "truth": grid_payload(store, f["truth"]),
            "disagreement": grid_payload(store, disagreement),
            "difference": grid_payload(store, f["AURA-BLEND"] - f["Arithmetic Mean"]),
            "error_aura": grid_payload(store, f["AURA-BLEND"] - f["truth"]),
            "weights": {
                name: grid_payload(store, w[m], units="fraction")
                for m, name in enumerate(MODEL_NAMES)
            },
        },
        "steps": steps,
        "narrative": (
            "AURA-BLEND does not pick a single winner. It allocates spatially varying trust "
            "across HRES, GraphCast, and Pangu based on local terrain, synoptic regime, and lead time, "
            "then applies bounded calibration, EVP, and physical guardrails. "
            "All fields shown are locked WeatherBench 2 test tensors."
        ),
    }


def india_geojson() -> dict:
    return {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "properties": {"name": "India (Operational Domain Outline)"},
                "geometry": {"type": "Polygon", "coordinates": [INDIA_RING]},
            }
        ],
    }
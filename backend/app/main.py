from __future__ import annotations

from typing import Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .ml.artifacts import MODEL_NAMES, load_store, model_info
from .ml.inference import run_inference
from .services.forecast import (
    build_cases,
    case_detail,
    evp_status,
    grid_payload,
    india_geojson,
    list_dates,
    missing_source_blend,
    per_sample_metrics,
    resolve_model_field,
    sample_fields,
)

app = FastAPI(
    title="AURA-BLEND Decision Support System",
    description="HISTORICAL BENCHMARK DEMO - WeatherBench 2 locked-test India domain (2m Temperature)",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class InferenceBody(BaseModel):
    candidate: Optional[list] = None
    local_extra: Optional[list] = None
    regime: Optional[list] = None
    lead: Optional[float] = None
    max_lead: Optional[float] = 120.0
    sin_doy: Optional[float] = None
    cos_doy: Optional[float] = None
    mask: Optional[list] = None


@app.get("/api/health")
def health():
    store = load_store()
    return {
        "status": "ok",
        "mode": "HISTORICAL BENCHMARK DEMO",
        "samples": store.n_samples,
        "models": MODEL_NAMES,
        "variable": "2m_temperature",
        "domain": "India (6.0N-38.5N, 68.0E-98.5E)",
    }


@app.get("/api/model/info")
def api_model_info():
    return model_info(load_store())


@app.get("/api/metrics/summary")
def metrics_summary():
    store = load_store()
    return {"rows": store.metrics, "source": "final_metrics.csv"}


@app.get("/api/metrics/ablations")
def metrics_ablations():
    store = load_store()
    return {"rows": store.ablations, "source": "ablation_results.csv"}


@app.get("/api/forecast/dates")
def forecast_dates():
    return {"dates": list_dates(load_store())}


@app.get("/api/forecast/leads")
def forecast_leads():
    store = load_store()
    leads = sorted({int(x) for x in store.sample_lead.tolist()})
    return {"leads": leads}


@app.get("/api/geo/india")
def geo_india():
    return india_geojson()


def _index(date: str, lead: int) -> int:
    try:
        return load_store().lookup(date, lead)
    except KeyError as exc:
        raise HTTPException(404, str(exc)) from exc


@app.get("/api/forecast")
def get_forecast(
    date: str = Query(..., description="Init date YYYY-MM-DD"),
    lead: int = Query(..., description="Lead hours (24, 48, 72, 120)"),
    model: str = Query("aura", description="Model name or difference: aura, hres, graphcast, pangu, mean, diff_hres, diff_graphcast, diff_pangu, diff_mean, diff_truth"),
    missing_hres: int = Query(0, description="1 if HRES unavailable"),
    missing_graphcast: int = Query(0, description="1 if GraphCast unavailable"),
    missing_pangu: int = Query(0, description="1 if Pangu unavailable"),
):
    store = load_store()
    i = _index(date, lead)
    fields = sample_fields(store, i)
    mask = [1 - missing_hres, 1 - missing_graphcast, 1 - missing_pangu]
    missing_used = any(m == 0 for m in mask)
    extra = {}

    if missing_used:
        w_new, blend = missing_source_blend(fields["weights"], fields["candidates"], mask)
        extra = {
            "input_health": {
                "status": "DEGRADED INPUT",
                "mask": {"HRES": mask[0], "GraphCast": mask[1], "Pangu": mask[2]},
                "method": "Saved spatial weights dynamically renormalized over available candidate models; convex blend of active candidate forecasts.",
                "weights": {
                    name: grid_payload(store, w_new[m], units="fraction")
                    for m, name in enumerate(MODEL_NAMES)
                },
            }
        }
        if model.lower().strip() in {"aura", "aura-blend", "aura_blend"}:
            grid = grid_payload(store, blend, units="degC")
            label = "AURA-BLEND (Degraded Input - Renormalized)"
            units = "degC"
        else:
            arr, label, units = resolve_model_field(fields, model)
            grid = grid_payload(store, arr, units=units)
    else:
        extra = {
            "input_health": {
                "status": "FULL INPUT",
                "mask": {"HRES": 1, "GraphCast": 1, "Pangu": 1},
                "method": "All candidate forecast feeds nominal.",
            }
        }
        arr, label, units = resolve_model_field(fields, model)
        grid = grid_payload(store, arr, units=units)

    return {
        "mode": "HISTORICAL BENCHMARK DEMO",
        "date": store.init_date(i),
        "init": store.init_iso(i),
        "lead_hours": int(store.sample_lead[i]),
        "variable": "2m_temperature",
        "variable_label": "2m Surface Temperature",
        "units": units,
        "model": label,
        "model_key": model,
        "index": i,
        "grid": grid,
        "evp": evp_status(store, i),
        **extra,
    }


@app.get("/api/forecast/weights")
def get_weights(
    date: str = Query(..., description="Init date YYYY-MM-DD"),
    lead: int = Query(..., description="Lead hours"),
):
    store = load_store()
    i = _index(date, lead)
    w = store.weights[i]
    fields = sample_fields(store, i)

    # Per-grid-cell statistics for forecaster transparency
    return {
        "date": store.init_date(i),
        "init": store.init_iso(i),
        "lead_hours": int(store.sample_lead[i]),
        "weights": {
            name: grid_payload(store, w[m], units="fraction")
            for m, name in enumerate(MODEL_NAMES)
        },
        "mean_weights": {name: float(w[m].mean()) for m, name in enumerate(MODEL_NAMES)},
        "note": "Learned spatial contribution maps from SDW-Net output. Weights vary spatially by terrain, lead-time skill, and synoptic regime, rather than being a flat global average.",
    }


@app.get("/api/forecast/comparison")
def get_comparison(
    date: str = Query(..., description="Init date YYYY-MM-DD"),
    lead: int = Query(..., description="Lead hours"),
):
    store = load_store()
    i = _index(date, lead)
    fields = sample_fields(store, i)
    cand = fields["candidates"]
    disagreement = cand.std(axis=0)

    maps = {
        name: grid_payload(store, fields[name], units="degC")
        for name in ["HRES", "GraphCast", "Pangu", "AURA-BLEND", "Arithmetic Mean", "truth"]
    }
    maps["diff_hres"] = grid_payload(store, fields["diff_hres"], units="degC")
    maps["diff_graphcast"] = grid_payload(store, fields["diff_graphcast"], units="degC")
    maps["diff_pangu"] = grid_payload(store, fields["diff_pangu"], units="degC")
    maps["diff_mean"] = grid_payload(store, fields["diff_mean"], units="degC")
    maps["diff_truth"] = grid_payload(store, fields["diff_truth"], units="degC")
    maps["disagreement"] = grid_payload(store, disagreement, units="degC")

    w = fields["weights"]
    weights_map = {
        name: grid_payload(store, w[m], units="fraction")
        for m, name in enumerate(MODEL_NAMES)
    }

    return {
        "date": store.init_date(i),
        "init": store.init_iso(i),
        "lead_hours": int(store.sample_lead[i]),
        "sample_metrics": per_sample_metrics(store, i),
        "locked_test_metrics": store.metrics,
        "maps": maps,
        "weights": weights_map,
        "mean_weights": {name: float(w[m].mean()) for m, name in enumerate(MODEL_NAMES)},
        "evp": evp_status(store, i),
    }


@app.get("/api/cases")
def api_cases():
    return {"cases": build_cases(load_store())}


@app.get("/api/cases/{case_id}")
def api_case(case_id: str):
    try:
        return case_detail(load_store(), case_id)
    except KeyError as exc:
        raise HTTPException(404, f"Unknown case {case_id}") from exc


@app.post("/api/inference")
def api_inference(body: InferenceBody):
    result = run_inference(load_store(), body.model_dump())
    if not result.get("ok"):
        raise HTTPException(422, result)
    return result


from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from .config import ROOT

dist_dir = ROOT / "frontend" / "dist"
if dist_dir.exists():
    if (dist_dir / "assets").exists():
        app.mount("/assets", StaticFiles(directory=str(dist_dir / "assets")), name="assets")

    @app.get("/{full_path:path}")
    def serve_frontend(full_path: str):
        if full_path.startswith("api/"):
            raise HTTPException(404, "API route not found")
        file_path = dist_dir / full_path
        if file_path.is_file():
            return FileResponse(file_path)
        index_file = dist_dir / "index.html"
        if index_file.exists():
            return FileResponse(index_file)
        return {"status": "ok"}
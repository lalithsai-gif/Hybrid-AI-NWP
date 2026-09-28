# AURA-BLEND: Adaptive Weather Forecast Decision Support System
### SIH 2026 Operational Forecaster Decision-Support MVP

**Status:** `HISTORICAL BENCHMARK DEMO`  
**Dataset:** WeatherBench 2 Locked Temporal Test Set (588 Evaluated Samples)  
**Variable:** 2m Surface Temperature ($T_{2m}$, °C)  
**Target Domain:** India Subcontinent ($6.0^\circ\text{N} - 38.5^\circ\text{N}, 68.0^\circ\text{E} - 98.5^\circ\text{E}$)  
**Candidate Forecast Sources:**
- **ECMWF HRES** (0.1° Physics-Based Operational NWP)
- **Google DeepMind GraphCast** (0.25° Graph Neural Network)
- **Huawei Pangu-Weather** (0.25° 3D Earth-Specific Vision Transformer)

---

## 1. Core Mission: The Forecaster Question

> **"Which model should I trust here, by how much, and why?"**

In modern meteorology, operational centers receive outputs from both numerical weather prediction (NWP) and data-driven AI weather models. However, models display **spatially and regimes-dependent strengths**:
- **ECMWF HRES** preserves physical conservation laws and excels over complex terrain (e.g., Western Ghats, Himalayan foothills) and coastlines.
- **DeepMind GraphCast & Huawei Pangu-Weather** exhibit superior skill in large-scale geopotential propagation, baroclinic waves, and thermal advection.

A flat arithmetic average or a uniform national scalar weighting loses critical local advantages. **AURA-BLEND** solves this by using **Spatial Dynamic Weighting (SDW-Net)**:
1. Ingests candidate forecasts alongside 13 local static & dynamic channels and 3 synoptic weather regime channels ($Z_{500}, T_{850}, \text{MSLP}$).
2. Dynamically calculates continuous spatial trust weights $W_{\text{HRES}}(x,y) + W_{\text{GraphCast}}(x,y) + W_{\text{Pangu}}(x,y) = 1.0$.
3. Applies **Extreme Value Preservation (EVP)** to restore smoothed upper-tail heat extremes.
4. Enforces strict physical thermodynamics through **Kelvin guardrails** ($[180\text{ K}, 340\text{ K}]$).

---

## 2. Key Scientific Verification Metrics

All metrics are computed on the **locked temporal test set** (`final_metrics.csv`):

| Model | RMSE (°C) | MAE (°C) | Bias (°C) | ACC | FSS | CSI | ETS | POD | FAR |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **ECMWF HRES** | 1.723 | 1.220 | -0.345 | 0.9950 | 0.698 | 0.373 | 0.371 | 0.380 | 0.045 |
| **GraphCast** | 1.694 | 1.195 | -0.410 | 0.9950 | 0.693 | 0.377 | 0.374 | 0.382 | 0.036 |
| **Pangu-Weather** | 1.499 | 1.071 | -0.400 | 0.9963 | 0.670 | 0.348 | 0.346 | 0.349 | 0.009 |
| **Arithmetic Mean** | 1.555 | 1.104 | -0.385 | 0.9960 | 0.685 | 0.367 | 0.365 | 0.369 | 0.013 |
| **Global Learned Blend** | 1.507 | 1.073 | -0.400 | 0.9962 | 0.677 | 0.358 | 0.355 | 0.359 | 0.010 |
| **AURA-BLEND (Base)** | 1.434 | 1.012 | -0.114 | 0.9964 | 0.741 | 0.422 | 0.419 | 0.434 | 0.060 |
| **AURA-BLEND + EVP + Guardrails** | **1.434** | **1.012** | **-0.114** | **0.9964** | **0.741** | **0.422** | **0.419** | **0.434** | **0.060** |

> **Key Result:** AURA-BLEND achieves a **7.78% RMSE reduction** over naive arithmetic mean with superior ACC (0.9964), highest Critical Success Index (CSI 0.422), and lowest systematic bias (-0.114°C).

---

## 3. Architecture & Operational Pipeline

```
Input Forecasts (HRES, GraphCast, Pangu)
       │
       ▼
Common Grid Alignment (1.5° WeatherBench 2 India domain)
       │
       ▼
Feature Extraction (13 Local Channels + 3 Synoptic Regimes)
       │
       ▼
SDW-Net (Cross-Attention Fusion + Spatial Softmax Head)
       │
       ▼
Adaptive Spatial Weights (W_hres, W_graphcast, W_pangu)
       │
       ▼
Extreme Value Preservation (EVP, α = 0.75) + Physical Kelvin Guardrails
       │
       ▼
Calibrated Consensus Forecast (7.78% RMSE gain over Mean)
       │
       ▼
Forecaster Decision Support Console
```

---

## 4. Operational Dashboard Features

1. **Forecast Operations (Primary Operational View):**
   - High-performance interactive India raster mesh map with smooth meteorological color ramps.
   - Synchronized lead-time switching (+24h, +48h, +72h, +120h) and initialization dates.
   - Live switching between candidate forecasts (AURA-BLEND, HRES, GraphCast, Pangu, Mean, Truth) and difference maps (AURA − HRES, AURA − GraphCast, AURA − Pangu, AURA − Mean, AURA − Truth).
   - Prominent **AURA-BLEND Consensus** telemetry card: Forecast value, domain min/mean/max, EVP status, and Kelvin guardrails.
   - **Operational Extreme Weather Guidance** panel: Supported upper-tail thermal extremes, ensemble spread confidence, and explicit scientific honesty disclosure.

2. **"Why AURA-BLEND?" Mode:**
   - Dedicated spatial contribution maps for HRES, GraphCast, and Pangu.
   - Interactive **Point Inspector**: click any grid cell across India to see the exact percentage trust allocation, model candidate values, and meteorological rationale.
   - Visual demonstration that weights vary spatially based on topography and synoptic patterns, not fixed global scalars.

3. **Model Comparison View:**
   - Synchronized side-by-side or tabbed multi-model fields.
   - Real per-sample verification metrics alongside historical locked-test metrics from `final_metrics.csv`.
   - Architectural ablation table from `ablation_results.csv`.

4. **Input Health & Degraded Mode:**
   - Interactive operational feed toggles (HRES, GraphCast, Pangu).
   - Real-time **weight renormalization**: when an upstream model feed drops out, active weights automatically renormalize to 1.0 without unphysical extrapolation.

5. **Case Study Playback:**
   - Curated operational scenarios:
     1. *High Divergence Case* (Max inter-model spread).
     2. *Maximum Adaptive Gain* (Greatest improvement over arithmetic mean).
     3. *Day-5 (120h) Challenge* (Long-lead stability).
     4. *Extreme Value Preservation* (Upper-tail restoration).
   - Synchronized 10-stage playback sequence with forecaster narratives.

6. **Processing Pipeline:**
   - Visual interactive end-to-end flowchart from data ingestion to decision support.

---

## 5. Backend REST API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Operational health and locked sample telemetry |
| `GET` | `/api/model/info` | Architecture parameters, domain, and metadata |
| `GET` | `/api/metrics/summary` | Verifiable metrics from `final_metrics.csv` |
| `GET` | `/api/metrics/ablations` | Ablation results from `ablation_results.csv` |
| `GET` | `/api/forecast/dates` | Available historical initialization dates |
| `GET` | `/api/forecast/leads` | Available lead times (+24h, +48h, +72h, +120h) |
| `GET` | `/api/forecast` | Main raster map payload with model & difference selection |
| `GET` | `/api/forecast/weights` | Spatial contribution weight maps (HRES, GraphCast, Pangu) |
| `GET` | `/api/forecast/comparison` | Multi-model comparison maps and per-sample verification |
| `GET` | `/api/cases` | Available case study scenarios |
| `GET` | `/api/cases/{case_id}` | Detailed case playback steps, maps, and narrative |
| `POST` | `/api/inference` | Live SDW-Net forward pass with validation schemas |

---

## 6. How to Run the Complete Demo

### Option A: Unified Single-Command Deployment (Recommended)
FastAPI automatically serves both the backend REST API and the production-built React frontend:

```bash
# From the project root (Ai_nwwp)
python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000
```
Open your browser at: **`http://localhost:8000`**

### Option B: Dual-Server Development Mode (With Hot Reloading)

**Terminal 1 — Backend:**
```bash
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```

**Terminal 2 — Frontend (Vite Dev Server):**
```bash
cd frontend
npm run dev
```
Open your browser at: **`http://localhost:5173`** (Vite proxies all `/api` requests to port 8000).

---

## 7. Running the Test Suite

Execute the automated test suite verifying all 12 operational endpoints:

```bash
python run_tests.py
```

Expected output:
```
--- RUNNING AURA-BLEND BACKEND TESTS ---
[PASS] GET /api/health passed
[PASS] GET /api/model/info passed
[PASS] GET /api/metrics/summary passed
[PASS] GET /api/metrics/ablations passed
[PASS] GET /api/forecast/dates and leads passed
[PASS] GET /api/forecast passed
[PASS] Difference maps (diff_hres, diff_graphcast, diff_pangu, diff_mean) passed
[PASS] Degraded input and weight renormalization passed
[PASS] GET /api/forecast/weights passed
[PASS] GET /api/forecast/comparison passed
[PASS] GET /api/cases and detail passed
[PASS] POST /api/inference passed
=========================================
ALL 12 BACKEND TESTS PASSED SUCCESSFULLY!
=========================================
```

---

## 8. Scientific Integrity Disclosure

- **Historical Benchmark Mode:** All data displayed originates from the locked WeatherBench 2 temporal evaluation set (Year 2020, 2m temperature).
- **No Fabricated Feeds:** No claims are made regarding live operational IMD or NCMRWF real-time ingestion.
- **Physical Bounding:** Kelvin guardrails strictly clip predictions outside $[180\text{ K}, 340\text{ K}]$.
- **No Hallucinated Hazards:** Extreme event guidance is restricted to upper-tail thermal extremes regulated by EVP. Wind, precipitation, and cyclone tracks are explicitly marked as unavailable for this single-variable benchmark.

from fastapi.testclient import TestClient

from backend.app.main import app

client = TestClient(app)


def test_health():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert data["mode"] == "HISTORICAL BENCHMARK DEMO"
    assert data["samples"] == 588
    assert "HRES" in data["models"]


def test_model_info():
    res = client.get("/api/model/info")
    assert res.status_code == 200
    data = res.json()
    assert data["system"] == "AURA-BLEND"
    assert data["target"] == "2m_temperature"
    assert data["grid"]["height"] == 21
    assert data["grid"]["width"] == 20
    assert "architecture" in data


def test_metrics_summary():
    res = client.get("/api/metrics/summary")
    assert res.status_code == 200
    data = res.json()
    assert "rows" in data
    assert len(data["rows"]) >= 5
    models = [r["Model"] for r in data["rows"]]
    assert "HRES" in models
    assert "GraphCast" in models
    assert "Pangu" in models
    assert "Arithmetic Mean" in models


def test_metrics_ablations():
    res = client.get("/api/metrics/ablations")
    assert res.status_code == 200
    data = res.json()
    assert "rows" in data
    assert len(data["rows"]) >= 3


def test_forecast_dates_and_leads():
    res_dates = client.get("/api/forecast/dates")
    assert res_dates.status_code == 200
    dates = res_dates.json()["dates"]
    assert len(dates) > 0
    first_date = dates[0]["date"]

    res_leads = client.get("/api/forecast/leads")
    assert res_leads.status_code == 200
    leads = res_leads.json()["leads"]
    assert 24 in leads
    assert 48 in leads


def test_forecast():
    # Fetch a sample
    res_dates = client.get("/api/forecast/dates")
    first_date = res_dates.json()["dates"][0]["date"]

    res = client.get(f"/api/forecast?date={first_date}&lead=24&model=aura")
    assert res.status_code == 200
    data = res.json()
    assert data["variable"] == "2m_temperature"
    assert "grid" in data
    assert len(data["grid"]["values"]) == 21
    assert len(data["grid"]["values"][0]) == 20
    assert "evp" in data


def test_forecast_differences():
    res_dates = client.get("/api/forecast/dates")
    first_date = res_dates.json()["dates"][0]["date"]

    for diff_key in ["diff_hres", "diff_graphcast", "diff_pangu", "diff_mean"]:
        res = client.get(f"/api/forecast?date={first_date}&lead=24&model={diff_key}")
        assert res.status_code == 200
        data = res.json()
        assert "grid" in data
        assert len(data["grid"]["values"]) == 21


def test_forecast_degraded_input():
    res_dates = client.get("/api/forecast/dates")
    first_date = res_dates.json()["dates"][0]["date"]

    res = client.get(f"/api/forecast?date={first_date}&lead=24&model=aura&missing_hres=1")
    assert res.status_code == 200
    data = res.json()
    assert data["input_health"]["status"] == "DEGRADED INPUT"
    assert data["input_health"]["mask"]["HRES"] == 0
    assert "weights" in data["input_health"]


def test_forecast_weights():
    res_dates = client.get("/api/forecast/dates")
    first_date = res_dates.json()["dates"][0]["date"]

    res = client.get(f"/api/forecast/weights?date={first_date}&lead=24")
    assert res.status_code == 200
    data = res.json()
    assert "weights" in data
    assert "HRES" in data["weights"]
    assert "GraphCast" in data["weights"]
    assert "Pangu" in data["weights"]
    assert "mean_weights" in data


def test_forecast_comparison():
    res_dates = client.get("/api/forecast/dates")
    first_date = res_dates.json()["dates"][0]["date"]

    res = client.get(f"/api/forecast/comparison?date={first_date}&lead=24")
    assert res.status_code == 200
    data = res.json()
    assert "maps" in data
    assert "HRES" in data["maps"]
    assert "AURA-BLEND" in data["maps"]
    assert "sample_metrics" in data


def test_cases():
    res = client.get("/api/cases")
    assert res.status_code == 200
    cases = res.json()["cases"]
    assert len(cases) >= 3

    case_id = cases[0]["id"]
    res_case = client.get(f"/api/cases/{case_id}")
    assert res_case.status_code == 200
    detail = res_case.json()
    assert "maps" in detail
    assert "metrics" in detail
    assert "steps" in detail


def test_inference_endpoint():
    res = client.post("/api/inference", json={})
    # Expect 422 with informative schema since full feature tensors not supplied
    assert res.status_code == 422
    data = res.json()
    assert data["detail"]["error"] == "incomplete_inputs"
    assert "required" in data["detail"]

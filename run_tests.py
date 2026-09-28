"""Runner for backend endpoint test suite with clean ASCII output."""
import sys
import os

sys.path.insert(0, os.path.abspath("."))

from tests.test_api import (
    test_health,
    test_model_info,
    test_metrics_summary,
    test_metrics_ablations,
    test_forecast_dates_and_leads,
    test_forecast,
    test_forecast_differences,
    test_forecast_degraded_input,
    test_forecast_weights,
    test_forecast_comparison,
    test_cases,
    test_inference_endpoint,
)

print("--- RUNNING AURA-BLEND BACKEND TESTS ---")
test_health()
print("[PASS] GET /api/health passed")
test_model_info()
print("[PASS] GET /api/model/info passed")
test_metrics_summary()
print("[PASS] GET /api/metrics/summary passed")
test_metrics_ablations()
print("[PASS] GET /api/metrics/ablations passed")
test_forecast_dates_and_leads()
print("[PASS] GET /api/forecast/dates and leads passed")
test_forecast()
print("[PASS] GET /api/forecast passed")
test_forecast_differences()
print("[PASS] Difference maps (diff_hres, diff_graphcast, diff_pangu, diff_mean) passed")
test_forecast_degraded_input()
print("[PASS] Degraded input and weight renormalization passed")
test_forecast_weights()
print("[PASS] GET /api/forecast/weights passed")
test_forecast_comparison()
print("[PASS] GET /api/forecast/comparison passed")
test_cases()
print("[PASS] GET /api/cases and detail passed")
test_inference_endpoint()
print("[PASS] POST /api/inference passed")
print("=========================================")
print("ALL 12 BACKEND TESTS PASSED SUCCESSFULLY!")
print("=========================================")

import React from "react";
import { EvpStatus } from "../types";

interface SelectedLocationPanelProps {
  selectedCell: { r: number; c: number; lat: number; lon: number; val: number | null } | null;
  candidateValues: Record<string, number | null>;
  weights: Record<string, number>;
  metricsRows: Array<{
    Model: string;
    RMSE_C: string;
    MAE_C: string;
    Bias_C: string;
    ACC: string;
    FSS: string;
    CSI: string;
    ETS: string;
    POD: string;
    FAR: string;
  }>;
  evpStatus: EvpStatus | null;
  inputHealthStatus?: string;
  leadHours: number;
  initTime: string;
}

// Helper to identify nearest Indian region / meteorological subdivision
function getSubdivisionName(lat: number, lon: number): string {
  if (lat >= 32.0) return "Western Himalayas (J&K / Ladakh / Himachal)";
  if (lat >= 28.0 && lon <= 78.5) return "Northern Plains (Punjab / Haryana / Delhi NCR / West UP)";
  if (lat >= 28.0 && lon > 78.5) return "East Uttar Pradesh & Foothills";
  if (lat >= 24.0 && lon < 74.0) return "West Rajasthan & Thar Desert";
  if (lat >= 24.0 && lon >= 74.0 && lon <= 82.0) return "Central India (Madhya Pradesh & Bundelkhand)";
  if (lat >= 24.0 && lon > 82.0 && lon <= 88.5) return "Bihar & Jharkhand Plains";
  if (lon > 88.5 && lat >= 22.0) return "Northeast India & Sub-Himalayan Bengal";
  if (lat >= 20.0 && lat < 24.0 && lon < 74.0) return "Gujarat Region & Saurashtra";
  if (lat >= 18.0 && lat < 24.0 && lon >= 74.0 && lon <= 82.0) return "Maharashtra & Vidarbha";
  if (lat >= 18.0 && lat < 24.0 && lon > 82.0) return "Odisha & Coastal East India";
  if (lat >= 14.0 && lat < 18.0 && lon < 76.5) return "Konkan & Coastal Karnataka";
  if (lat >= 14.0 && lat < 18.0 && lon >= 76.5) return "Telangana & Rayalaseema";
  if (lat < 14.0 && lon < 77.5) return "South Interior Karnataka & Kerala";
  if (lat < 14.0 && lon >= 77.5) return "Tamil Nadu & Puducherry";
  return "Indian Operational Subcontinent";
}

export const SelectedLocationPanel: React.FC<SelectedLocationPanelProps> = ({
  selectedCell,
  candidateValues,
  weights,
  metricsRows,
  evpStatus,
  inputHealthStatus = "FULL INPUT",
  leadHours,
  initTime,
}) => {
  const lat = selectedCell?.lat ?? 28.5;
  const lon = selectedCell?.lon ?? 77.2;
  const regionName = getSubdivisionName(lat, lon);

  // Exact model values
  const valAura = candidateValues["AURA-BLEND"] ?? selectedCell?.val ?? null;
  const valHres = candidateValues["HRES"] ?? null;
  const valGraphcast = candidateValues["GraphCast"] ?? null;
  const valPangu = candidateValues["Pangu"] ?? null;
  const valMean = candidateValues["Arithmetic Mean"] ?? (
    valHres !== null && valGraphcast !== null && valPangu !== null
      ? (valHres + valGraphcast + valPangu) / 3
      : null
  );
  const valTruth = candidateValues["truth"] ?? null;

  // Exact weights
  const wHres = weights["HRES"] ?? 0.333;
  const wGraphcast = weights["GraphCast"] ?? 0.333;
  const wPangu = weights["Pangu"] ?? 0.334;

  // Find AURA-BLEND verified metrics row
  const auraMetrics = metricsRows.find((r) => r.Model.includes("AURA-Blend + EVP")) ||
    metricsRows.find((r) => r.Model.includes("AURA-Blend (base)")) ||
    metricsRows[metricsRows.length - 1];

  const isDegraded = inputHealthStatus.includes("DEGRADED");

  return (
    <div className="sci-card selected-location-panel" style={{ borderTop: "4px solid var(--primary-gold)" }}>
      {/* 1. Header: Selected Location Coordinates */}
      <div className="sci-card-header" style={{ flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
        <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
          <div className="sci-card-title">
            <span style={{ color: "var(--primary-gold-dark)" }}>📍</span>
            <span>SELECTED LOCATION</span>
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, fontFamily: "var(--font-mono)", background: "#fef3c7", color: "var(--primary-gold-dark)", padding: "2px 8px", borderRadius: 4, border: "1px solid #fcd34d" }}>
            +{leadHours}h Lead
          </span>
        </div>

        <div style={{ display: "flex", gap: 12, fontSize: 13, fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--text-primary)" }}>
          <span>LAT: {lat.toFixed(2)}°N</span>
          <span>LON: {lon.toFixed(2)}°E</span>
        </div>
        <div style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 500 }}>
          {regionName}
        </div>
      </div>

      <div className="sci-card-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* 2. AURA-BLEND FORECAST Comparison */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8, display: "flex", justifyContent: "space-between" }}>
            <span>AURA-BLEND FORECAST</span>
            <span>2m Temp (°C)</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div className="forecast-point-row">
              <span className="model-name">HRES (ECMWF Physics)</span>
              <span className="model-val">{valHres !== null ? `${valHres.toFixed(1)}°C` : "—"}</span>
            </div>

            <div className="forecast-point-row">
              <span className="model-name">GraphCast (DeepMind GNN)</span>
              <span className="model-val">{valGraphcast !== null ? `${valGraphcast.toFixed(1)}°C` : "—"}</span>
            </div>

            <div className="forecast-point-row">
              <span className="model-name">Pangu (Huawei 3D-ViT)</span>
              <span className="model-val">{valPangu !== null ? `${valPangu.toFixed(1)}°C` : "—"}</span>
            </div>

            <div className="forecast-point-row" style={{ borderTop: "1px dashed #e2e8f0", paddingTop: 4 }}>
              <span className="model-name" style={{ color: "var(--text-secondary)" }}>Arithmetic Mean</span>
              <span className="model-val" style={{ color: "var(--text-secondary)" }}>
                {valMean !== null ? `${valMean.toFixed(1)}°C` : "—"}
              </span>
            </div>

            <div className="forecast-point-row highlight-aura">
              <span className="model-name" style={{ fontWeight: 800, color: "var(--primary-gold-dark)" }}>
                ★ AURA-BLEND (Consensus)
              </span>
              <span className="model-val" style={{ fontWeight: 800, fontSize: 15, color: "var(--primary-gold-dark)" }}>
                {valAura !== null ? `${valAura.toFixed(1)}°C` : "—"}
              </span>
            </div>

            {valTruth !== null && (
              <div className="forecast-point-row" style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "4px 8px", borderRadius: 3 }}>
                <span className="model-name" style={{ color: "#166534", fontWeight: 600 }}>ERA5 Ground Truth</span>
                <span className="model-val" style={{ color: "#166534", fontWeight: 700 }}>{valTruth.toFixed(1)}°C</span>
              </div>
            )}
          </div>
        </div>

        {/* 3. MODEL CONTRIBUTION (Weights %) */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8, display: "flex", justifyContent: "space-between" }}>
            <span>MODEL CONTRIBUTION</span>
            <span>Trust Weight %</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {/* HRES */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 2 }}>
                <span style={{ fontWeight: 600 }}>HRES</span>
                <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "#15803d" }}>
                  {(wHres * 100).toFixed(1)}%
                </span>
              </div>
              <div className="weight-progress-track">
                <div className="weight-progress-bar" style={{ width: `${Math.min(100, wHres * 100)}%`, backgroundColor: "#15803d" }} />
              </div>
            </div>

            {/* GraphCast */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 2 }}>
                <span style={{ fontWeight: 600 }}>GraphCast</span>
                <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "#0284c7" }}>
                  {(wGraphcast * 100).toFixed(1)}%
                </span>
              </div>
              <div className="weight-progress-track">
                <div className="weight-progress-bar" style={{ width: `${Math.min(100, wGraphcast * 100)}%`, backgroundColor: "#0284c7" }} />
              </div>
            </div>

            {/* Pangu */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 2 }}>
                <span style={{ fontWeight: 600 }}>Pangu-Weather</span>
                <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--primary-gold-dark)" }}>
                  {(wPangu * 100).toFixed(1)}%
                </span>
              </div>
              <div className="weight-progress-track">
                <div className="weight-progress-bar" style={{ width: `${Math.min(100, wPangu * 100)}%`, backgroundColor: "var(--primary-gold)" }} />
              </div>
            </div>
          </div>

          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6, fontStyle: "italic" }}>
            *SDW-Net spatial weights dynamically inferred for local elevation & weather regime.
          </div>
        </div>

        {/* 4. VERIFICATION METRICS (Real data from final_metrics.csv) */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8, display: "flex", justifyContent: "space-between" }}>
            <span>VERIFICATION SKILL</span>
            <span style={{ fontSize: 10, color: "var(--text-muted)" }}>Locked Test Data</span>
          </div>

          {auraMetrics ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, textAlign: "center" }}>
              <div className="metric-mini-badge">
                <div className="lbl">RMSE</div>
                <div className="val">{Number(auraMetrics.RMSE_C).toFixed(3)}°C</div>
              </div>

              <div className="metric-mini-badge">
                <div className="lbl">MAE</div>
                <div className="val">{Number(auraMetrics.MAE_C).toFixed(3)}°C</div>
              </div>

              <div className="metric-mini-badge">
                <div className="lbl">Bias</div>
                <div className="val">{Number(auraMetrics.Bias_C).toFixed(3)}°C</div>
              </div>

              <div className="metric-mini-badge">
                <div className="lbl">ACC</div>
                <div className="val">{Number(auraMetrics.ACC).toFixed(4)}</div>
              </div>

              <div className="metric-mini-badge">
                <div className="lbl">CSI</div>
                <div className="val">{Number(auraMetrics.CSI).toFixed(3)}</div>
              </div>

              <div className="metric-mini-badge">
                <div className="lbl">ETS</div>
                <div className="val">{Number(auraMetrics.ETS).toFixed(3)}</div>
              </div>

              <div className="metric-mini-badge">
                <div className="lbl">POD</div>
                <div className="val">{Number(auraMetrics.POD).toFixed(3)}</div>
              </div>

              <div className="metric-mini-badge">
                <div className="lbl">FAR</div>
                <div className="val">{Number(auraMetrics.FAR).toFixed(3)}</div>
              </div>

              <div className="metric-mini-badge">
                <div className="lbl">FSS</div>
                <div className="val">{Number(auraMetrics.FSS).toFixed(3)}</div>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Loading verification telemetry...</div>
          )}
        </div>

        {/* 5. Forecaster Guidance Telemetry */}
        <div style={{ background: "#f8fafc", padding: "10px 12px", borderRadius: 4, border: "1px solid #e2e8f0", fontSize: 11 }}>
          <div className="key-value-row" style={{ padding: "3px 0" }}>
            <span className="key">Input Health</span>
            <span className="value" style={{ color: isDegraded ? "var(--status-amber)" : "var(--status-green)" }}>
              {inputHealthStatus}
            </span>
          </div>

          <div className="key-value-row" style={{ padding: "3px 0" }}>
            <span className="key">EVP Status</span>
            <span className="value">
              {evpStatus?.evp_or_guardrail_changed_field ? "Active (Tail Restored)" : "Nominal"} (α = {evpStatus?.evp_alpha ?? 0.75})
            </span>
          </div>

          <div className="key-value-row" style={{ padding: "3px 0" }}>
            <span className="key">Kelvin Guardrail</span>
            <span className="value">
              {evpStatus?.guardrail_clip_detected ? "Clipped" : "Nominal [-93°C, +67°C]"}
            </span>
          </div>

          <div className="key-value-row" style={{ padding: "3px 0" }}>
            <span className="key">Initialization</span>
            <span className="value">{initTime}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

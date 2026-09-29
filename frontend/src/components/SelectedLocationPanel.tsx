import React from "react";
import { EvpStatus } from "../types";
import {
  IconTarget,
  IconClock,
  IconShieldAlert,
  IconCheck,
  IconActivity,
  IconCompass,
} from "./Icons";

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

// Identify meteorological subdivision
function getSubdivisionName(lat: number, lon: number): string {
  if (lat >= 32.0) return "Western Himalayas (J&K / Ladakh / HP)";
  if (lat >= 28.0 && lon <= 78.5) return "Northern Plains (Punjab / Haryana / Delhi NCR)";
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

  // Candidate model values
  const valAura = candidateValues["AURA-BLEND"] ?? selectedCell?.val ?? null;
  const valHres = candidateValues["HRES"] ?? null;
  const valGraphcast = candidateValues["GraphCast"] ?? null;
  const valPangu = candidateValues["Pangu"] ?? null;
  const valMean =
    candidateValues["Arithmetic Mean"] ??
    (valHres !== null && valGraphcast !== null && valPangu !== null
      ? (valHres + valGraphcast + valPangu) / 3
      : null);
  const valTruth = candidateValues["truth"] ?? null;

  // Exact weights
  const wHres = weights["HRES"] ?? 0.333;
  const wGraphcast = weights["GraphCast"] ?? 0.333;
  const wPangu = weights["Pangu"] ?? 0.334;
  const totalW = wHres + wGraphcast + wPangu || 1.0;
  const pctHres = ((wHres / totalW) * 100).toFixed(1);
  const pctGraphcast = ((wGraphcast / totalW) * 100).toFixed(1);
  const pctPangu = ((wPangu / totalW) * 100).toFixed(1);

  // Find AURA-BLEND verified metrics row
  const auraMetrics =
    metricsRows.find((r) => r.Model.includes("AURA-Blend + EVP")) ||
    metricsRows.find((r) => r.Model.includes("AURA-Blend (base)")) ||
    metricsRows[metricsRows.length - 1];

  const isDegraded = inputHealthStatus.includes("DEGRADED");

  return (
    <div className="neu-panel dossier-card">
      {/* 1. Dossier Header */}
      <div className="neu-panel-header">
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <div className="neu-panel-title">
            <IconTarget size={15} color="var(--brand-orange)" />
            <span>Grid Point Telemetry</span>
          </div>
          <span className="dossier-header-subtext">{regionName}</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              fontWeight: 700,
              backgroundColor: "var(--bg-surface-inset)",
              padding: "3px 8px",
              borderRadius: "var(--radius-xs)",
              color: "var(--text-primary)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            {lat.toFixed(2)}°N, {lon.toFixed(2)}°E
          </span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 800,
              fontFamily: "var(--font-mono)",
              backgroundColor: "var(--brand-orange-soft)",
              color: "var(--brand-orange)",
              padding: "3px 7px",
              borderRadius: "var(--radius-xs)",
              border: "1px solid var(--border-orange)",
            }}
          >
            +{leadHours}h
          </span>
        </div>
      </div>

      <div className="neu-panel-body" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {/* 2. Forecast Consensus & Candidate Values Matrix */}
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
              fontSize: 11,
              fontWeight: 800,
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            <span>Model Multi-Comparison</span>
            <span>2m Surface (°C)</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {/* AURA-BLEND Primary Row */}
            <div className="model-row-item highlight-consensus">
              <span className="model-row-name" style={{ color: "var(--brand-orange)", fontWeight: 800 }}>
                <span>★ AURA-BLEND</span>
                <span style={{ fontSize: 10, padding: "1px 5px", background: "#ffffff", borderRadius: 3, border: "1px solid var(--border-orange)" }}>
                  Consensus
                </span>
              </span>
              <span className="model-row-val" style={{ fontSize: 16, color: "var(--brand-orange)", fontWeight: 800 }}>
                {valAura !== null ? `${valAura.toFixed(1)}°C` : "—"}
              </span>
            </div>

            {/* HRES */}
            <div className="model-row-item">
              <span className="model-row-name">
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--status-green)", display: "inline-block" }} />
                <span>HRES (ECMWF Physics)</span>
              </span>
              <span className="model-row-val">{valHres !== null ? `${valHres.toFixed(1)}°C` : "—"}</span>
            </div>

            {/* GraphCast */}
            <div className="model-row-item">
              <span className="model-row-name">
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--meteo-blue)", display: "inline-block" }} />
                <span>GraphCast (DeepMind GNN)</span>
              </span>
              <span className="model-row-val">{valGraphcast !== null ? `${valGraphcast.toFixed(1)}°C` : "—"}</span>
            </div>

            {/* Pangu */}
            <div className="model-row-item">
              <span className="model-row-name">
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--brand-orange)", display: "inline-block" }} />
                <span>Pangu-Weather (Huawei 3D-ViT)</span>
              </span>
              <span className="model-row-val">{valPangu !== null ? `${valPangu.toFixed(1)}°C` : "—"}</span>
            </div>

            {/* Arithmetic Mean */}
            <div className="model-row-item" style={{ borderStyle: "dashed" }}>
              <span className="model-row-name" style={{ color: "var(--text-muted)" }}>
                <span>Arithmetic Mean (Naive)</span>
              </span>
              <span className="model-row-val" style={{ color: "var(--text-muted)" }}>
                {valMean !== null ? `${valMean.toFixed(1)}°C` : "—"}
              </span>
            </div>

            {/* ERA5 Ground Truth if available */}
            {valTruth !== null && (
              <div className="model-row-item" style={{ backgroundColor: "var(--status-green-bg)", borderColor: "var(--status-green-border)" }}>
                <span className="model-row-name" style={{ color: "var(--status-green)" }}>
                  <IconCheck size={12} color="var(--status-green)" />
                  <span>ERA5 Ground Truth</span>
                </span>
                <span className="model-row-val" style={{ color: "var(--status-green)" }}>
                  {valTruth.toFixed(1)}°C
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 3. Learned Spatial Trust (SDW-Net Multi-Segment Bar) */}
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 4,
              fontSize: 11,
              fontWeight: 800,
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            <span>SDW-Net Trust Allocation</span>
            <span>Spatial Weights</span>
          </div>

          {/* Proportional Strip */}
          <div className="trust-proportional-bar" title="Learned Trust Distribution">
            <div className="trust-segment" style={{ width: `${pctHres}%`, backgroundColor: "var(--status-green)" }} />
            <div className="trust-segment" style={{ width: `${pctGraphcast}%`, backgroundColor: "var(--meteo-blue)" }} />
            <div className="trust-segment" style={{ width: `${pctPangu}%`, backgroundColor: "var(--brand-orange)" }} />
          </div>

          {/* Chips */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, marginTop: 8 }}>
            <div style={{ padding: "4px 6px", background: "var(--bg-surface-inset)", borderRadius: 4, textAlign: "center", border: "1px solid var(--border-subtle)" }}>
              <div style={{ fontSize: 10, color: "var(--status-green)", fontWeight: 700 }}>HRES</div>
              <div style={{ fontSize: 12, fontWeight: 800, fontFamily: "var(--font-mono)" }}>{pctHres}%</div>
            </div>
            <div style={{ padding: "4px 6px", background: "var(--bg-surface-inset)", borderRadius: 4, textAlign: "center", border: "1px solid var(--border-subtle)" }}>
              <div style={{ fontSize: 10, color: "var(--meteo-blue)", fontWeight: 700 }}>GraphCast</div>
              <div style={{ fontSize: 12, fontWeight: 800, fontFamily: "var(--font-mono)" }}>{pctGraphcast}%</div>
            </div>
            <div style={{ padding: "4px 6px", background: "var(--bg-surface-inset)", borderRadius: 4, textAlign: "center", border: "1px solid var(--border-subtle)" }}>
              <div style={{ fontSize: 10, color: "var(--brand-orange)", fontWeight: 700 }}>Pangu</div>
              <div style={{ fontSize: 12, fontWeight: 800, fontFamily: "var(--font-mono)" }}>{pctPangu}%</div>
            </div>
          </div>
        </div>

        {/* 4. Verification Skill Matrix (Real Locked-Test Data) */}
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
              fontSize: 11,
              fontWeight: 800,
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            <span>Verification Skill Scores</span>
            <span style={{ fontSize: 10, color: "var(--brand-orange)", fontWeight: 700 }}>588 Samples</span>
          </div>

          {auraMetrics ? (
            <div className="metric-3x3-grid">
              <div className="metric-quad-card">
                <div className="metric-quad-label">RMSE</div>
                <div className="metric-quad-value" style={{ color: "var(--brand-orange)" }}>
                  {Number(auraMetrics.RMSE_C).toFixed(3)}°C
                </div>
              </div>
              <div className="metric-quad-card">
                <div className="metric-quad-label">MAE</div>
                <div className="metric-quad-value">{Number(auraMetrics.MAE_C).toFixed(3)}°C</div>
              </div>
              <div className="metric-quad-card">
                <div className="metric-quad-label">Bias</div>
                <div className="metric-quad-value">{Number(auraMetrics.Bias_C).toFixed(3)}°C</div>
              </div>
              <div className="metric-quad-card">
                <div className="metric-quad-label">ACC</div>
                <div className="metric-quad-value">{Number(auraMetrics.ACC).toFixed(4)}</div>
              </div>
              <div className="metric-quad-card">
                <div className="metric-quad-label">CSI</div>
                <div className="metric-quad-value">{Number(auraMetrics.CSI).toFixed(3)}</div>
              </div>
              <div className="metric-quad-card">
                <div className="metric-quad-label">ETS</div>
                <div className="metric-quad-value">{Number(auraMetrics.ETS).toFixed(3)}</div>
              </div>
              <div className="metric-quad-card">
                <div className="metric-quad-label">POD</div>
                <div className="metric-quad-value">{Number(auraMetrics.POD).toFixed(3)}</div>
              </div>
              <div className="metric-quad-card">
                <div className="metric-quad-label">FAR</div>
                <div className="metric-quad-value">{Number(auraMetrics.FAR).toFixed(3)}</div>
              </div>
              <div className="metric-quad-card">
                <div className="metric-quad-label">FSS</div>
                <div className="metric-quad-value">{Number(auraMetrics.FSS).toFixed(3)}</div>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Loading verification telemetry...</div>
          )}
        </div>

        {/* 5. Physical Guardrails & Forecaster Safety Spec */}
        <div style={{ backgroundColor: "var(--bg-surface-inset)", padding: "10px 14px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)" }}>
          <div className="spec-kv-row">
            <span className="spec-kv-key">Input Feed Health</span>
            <span className="spec-kv-val" style={{ color: isDegraded ? "var(--status-amber)" : "var(--status-green)" }}>
              {inputHealthStatus}
            </span>
          </div>

          <div className="spec-kv-row">
            <span className="spec-kv-key">EVP Status</span>
            <span className="spec-kv-val">
              {evpStatus?.evp_or_guardrail_changed_field ? "Active (Tail Restored)" : "Nominal"} (α = {evpStatus?.evp_alpha ?? 0.75})
            </span>
          </div>

          <div className="spec-kv-row">
            <span className="spec-kv-key">Kelvin Guardrail</span>
            <span className="spec-kv-val">
              {evpStatus?.guardrail_clip_detected ? "Clipped" : "Physical [180K, 340K]"}
            </span>
          </div>

          <div className="spec-kv-row">
            <span className="spec-kv-key">Init Cycle</span>
            <span className="spec-kv-val">{initTime}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SelectedLocationPanel;

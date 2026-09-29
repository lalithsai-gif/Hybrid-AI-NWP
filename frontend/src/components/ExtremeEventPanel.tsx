import React from "react";
import { EvpStatus, GridPayload } from "../types";
import {
  IconShieldAlert,
  IconActivity,
  IconInfo,
  IconCheck,
} from "./Icons";

interface ExtremeEventPanelProps {
  evp: EvpStatus | null;
  grid: GridPayload | null;
  selectedCell: { r: number; c: number; lat: number; lon: number; val: number | null } | null;
  interModelSpread?: number | null;
}

export const ExtremeEventPanel: React.FC<ExtremeEventPanelProps> = ({
  evp,
  grid,
  selectedCell,
  interModelSpread,
}) => {
  if (!evp || !grid) {
    return null;
  }

  const cellVal = selectedCell?.val ?? grid.max;
  const isHeatwave = cellVal >= 40.0;
  const isSevereHeatwave = cellVal >= 44.0;
  const isColdwave = cellVal <= 5.0;

  // Inter-model spread confidence
  let confidenceLabel = "Moderate Consensus Spread";
  let confidenceColor = "var(--brand-orange)";
  if (interModelSpread !== undefined && interModelSpread !== null) {
    if (interModelSpread < 1.0) {
      confidenceLabel = "High Agreement (Spread < 1.0°C)";
      confidenceColor = "var(--status-green)";
    } else if (interModelSpread > 2.5) {
      confidenceLabel = "High Model Divergence (Spread > 2.5°C)";
      confidenceColor = "var(--status-red)";
    }
  }

  return (
    <div className="neu-panel" style={{ borderTop: "3px solid var(--border-orange)" }}>
      {/* Header */}
      <div className="neu-panel-header">
        <div className="neu-panel-title">
          <IconShieldAlert size={15} color="var(--brand-orange)" />
          <span>Thermal Hazard Intelligence</span>
        </div>
        <span
          style={{
            fontSize: 10,
            fontWeight: 800,
            padding: "3px 8px",
            borderRadius: "var(--radius-xs)",
            backgroundColor: isSevereHeatwave
              ? "var(--status-red-bg)"
              : isHeatwave
              ? "var(--status-amber-bg)"
              : isColdwave
              ? "var(--meteo-blue-bg)"
              : "var(--bg-surface-inset)",
            color: isSevereHeatwave
              ? "var(--status-red)"
              : isHeatwave
              ? "var(--status-amber)"
              : isColdwave
              ? "var(--meteo-blue)"
              : "var(--text-secondary)",
            border: `1px solid ${
              isSevereHeatwave
                ? "var(--status-red-border)"
                : isHeatwave
                ? "var(--status-amber-border)"
                : isColdwave
                ? "var(--meteo-blue-border)"
                : "var(--border-subtle)"
            }`,
            textTransform: "uppercase",
            letterSpacing: 0.4,
          }}
        >
          {isSevereHeatwave
            ? "Severe Heat Alert"
            : isHeatwave
            ? "Heat Alert (>40°C)"
            : isColdwave
            ? "Cold Wave Alert (<5°C)"
            : "Nominal Thermal Range"}
        </span>
      </div>

      <div className="neu-panel-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div className="spec-kv-row">
          <span className="spec-kv-key">Tail Extreme Threshold</span>
          <span className="spec-kv-val">
            {evp.extreme_threshold_normalized.toFixed(3)} σ (Calibrated Tail)
          </span>
        </div>

        <div className="spec-kv-row">
          <span className="spec-kv-key">Ensemble Agreement</span>
          <span className="spec-kv-val" style={{ color: confidenceColor }}>
            {confidenceLabel}
          </span>
        </div>

        <div className="spec-kv-row">
          <span className="spec-kv-key">Extreme Value Preservation (EVP)</span>
          <span className="spec-kv-val">
            {evp.evp_or_guardrail_changed_field ? "Active (Tail Restored)" : "Inactive for this field"}
          </span>
        </div>

        <div className="spec-kv-row">
          <span className="spec-kv-key">Physical Kelvin Guardrail</span>
          <span className="spec-kv-val">
            {evp.guardrail_clip_detected ? "Clipped to Physical Bounds" : "Enforced [180.0 K, 340.0 K]"}
          </span>
        </div>

        {/* Operational Scientific Integrity Notice */}
        <div
          style={{
            marginTop: 4,
            padding: "10px 12px",
            backgroundColor: "var(--bg-surface-inset)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-sm)",
            fontSize: 11,
            color: "var(--text-secondary)",
            lineHeight: 1.5,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, color: "var(--text-primary)", fontWeight: 750 }}>
            <IconInfo size={13} color="var(--brand-orange)" />
            <span>Operational Integrity Notice</span>
          </div>
          Precipitation and convective cyclone hazard probabilities are{" "}
          <strong style={{ color: "var(--brand-orange)" }}>
            not active for the 2m temperature benchmark.
          </strong>{" "}
          Only upper-tail thermal extremes modulated via Extreme Value Preservation (EVP) are supported.
        </div>
      </div>
    </div>
  );
};

export default ExtremeEventPanel;

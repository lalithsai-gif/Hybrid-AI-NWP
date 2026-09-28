import React from "react";
import { EvpStatus, GridPayload } from "../types";

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

  // Determine physical extreme status supported by 2m temperature
  // High heat threshold: > 40°C, Severe: > 44°C
  const cellVal = selectedCell?.val ?? grid.max;
  const isHeatwave = cellVal >= 40.0;
  const isSevereHeatwave = cellVal >= 44.0;
  const isColdwave = cellVal <= 5.0;

  // Inter-model spread provides meteorological agreement confidence
  let confidenceLabel = "Moderate Confidence";
  let confidenceColor = "var(--primary-gold-dark)";
  if (interModelSpread !== undefined && interModelSpread !== null) {
    if (interModelSpread < 1.0) {
      confidenceLabel = "High Agreement (Spread < 1.0°C)";
      confidenceColor = "var(--status-green)";
    } else if (interModelSpread > 2.5) {
      confidenceLabel = "Low Agreement / High Divergence";
      confidenceColor = "var(--status-red)";
    }
  }

  return (
    <div className="sci-card">
      <div className="sci-card-header">
        <div className="sci-card-title">
          <span>Extreme Weather Guidance</span>
        </div>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            padding: "2px 6px",
            borderRadius: 3,
            backgroundColor: isSevereHeatwave ? "var(--status-red-bg)" : isHeatwave ? "var(--status-amber-bg)" : "#f3f4f6",
            color: isSevereHeatwave ? "var(--status-red)" : isHeatwave ? "var(--status-amber)" : "var(--text-secondary)",
          }}
        >
          {isSevereHeatwave ? "Severe Heat Detected" : isHeatwave ? "Heat Alert (>40°C)" : isColdwave ? "Cold Alert (<5°C)" : "Within Nominal Range"}
        </span>
      </div>

      <div className="sci-card-body">
        <div className="key-value-row">
          <span className="key">Thermal Extreme Threshold</span>
          <span className="value">
            {evp.extreme_threshold_normalized.toFixed(3)} σ (Calibrated Tail)
          </span>
        </div>

        <div className="key-value-row">
          <span className="key">Model Consensus Confidence</span>
          <span className="value" style={{ color: confidenceColor }}>
            {confidenceLabel}
          </span>
        </div>

        <div className="key-value-row">
          <span className="key">Extreme Value Preservation (EVP)</span>
          <span className="value">
            {evp.evp_or_guardrail_changed_field ? "Active (Restoring upper tail)" : "Inactive for this field"}
          </span>
        </div>

        <div className="key-value-row">
          <span className="key">Physical Kelvin Guardrail</span>
          <span className="value">
            {evp.guardrail_clip_detected ? "Clipped to physical bounds" : "Enforced [180.0 K, 340.0 K]"}
          </span>
        </div>

        {/* Scientific Honesty Notice */}
        <div
          style={{
            marginTop: 12,
            padding: "8px 10px",
            backgroundColor: "#f9fafb",
            border: "1px solid #e5e7eb",
            borderRadius: 4,
            fontSize: 11,
            color: "var(--text-secondary)",
            lineHeight: 1.4,
          }}
        >
          <strong style={{ color: "var(--text-primary)" }}>Meteorological Integrity Notice:</strong>
          <br />
          Precipitation, convective hazard, and cyclone track probabilities are{" "}
          <span style={{ fontWeight: 600, color: "var(--status-amber)" }}>
            not available for current benchmark variable (2m Temperature).
          </span>{" "}
          Only upper-tail thermal extremes regulated by the Extreme Value Preservation (EVP) module are supported.
        </div>
      </div>
    </div>
  );
};

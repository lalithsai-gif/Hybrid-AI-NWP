import React from "react";
import { ForecastResponse } from "../types";

interface AuraConsensusPanelProps {
  forecast: ForecastResponse | null;
  selectedCell: { r: number; c: number; lat: number; lon: number; val: number | null } | null;
  weights?: Record<string, number>;
  modelValues?: Record<string, number | null>;
}

export const AuraConsensusPanel: React.FC<AuraConsensusPanelProps> = ({
  forecast,
  selectedCell,
  weights,
  modelValues,
}) => {
  if (!forecast) {
    return (
      <div className="sci-card">
        <div className="sci-card-body">
          <p style={{ color: "var(--text-muted)" }}>Loading consensus telemetry...</p>
        </div>
      </div>
    );
  }

  const { grid, evp, input_health } = forecast;
  const isDegraded = input_health?.status === "DEGRADED INPUT";
  const displayVal = selectedCell?.val !== null && selectedCell?.val !== undefined ? selectedCell.val : grid.mean;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Primary Consensus Card */}
      <div className="sci-card" style={{ borderTop: "4px solid var(--primary-gold)" }}>
        <div className="sci-card-header">
          <div className="sci-card-title">
            <span>AURA-BLEND CONSENSUS</span>
          </div>
          <span className={`health-status-badge ${isDegraded ? "degraded" : "full"}`}>
            {input_health?.status || "FULL INPUT"}
          </span>
        </div>

        <div className="sci-card-body">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
                {selectedCell ? "Selected Cell Forecast" : "Domain Spatial Mean"}
              </div>
              <div style={{ display: "flex", alignItems: "baseline" }}>
                <span className="metric-value-huge">{displayVal.toFixed(1)}</span>
                <span className="metric-unit">°C</span>
              </div>
              {selectedCell && (
                <div style={{ fontSize: 11, color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
                  Lat {selectedCell.lat.toFixed(1)}°N, Lon {selectedCell.lon.toFixed(1)}°E
                </div>
              )}
            </div>

            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
                Lead Time
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "var(--primary-gold-dark)", fontFamily: "var(--font-mono)" }}>
                +{forecast.lead_hours}h
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                {forecast.lead_hours / 24} Day{forecast.lead_hours > 24 ? "s" : ""}
              </div>
            </div>
          </div>

          {/* Location breakdown if clicked */}
          {selectedCell && modelValues && (
            <div style={{ background: "#f8fafc", padding: "10px 12px", borderRadius: 4, border: "1px solid #e2e8f0", marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 6, textTransform: "uppercase" }}>
                Point Inter-Model Values
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, textAlign: "center" }}>
                <div style={{ background: "white", padding: 4, borderRadius: 3, border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600 }}>HRES</div>
                  <div style={{ fontSize: 13, fontWeight: 700, fontFamily: "var(--font-mono)" }}>
                    {modelValues["HRES"] !== undefined && modelValues["HRES"] !== null ? `${modelValues["HRES"].toFixed(1)}°` : "—"}
                  </div>
                  {weights && weights["HRES"] !== undefined && (
                    <div style={{ fontSize: 10, color: "var(--primary-gold-dark)", fontWeight: 600 }}>
                      {(weights["HRES"] * 100).toFixed(0)}%
                    </div>
                  )}
                </div>

                <div style={{ background: "white", padding: 4, borderRadius: 3, border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600 }}>GraphCast</div>
                  <div style={{ fontSize: 13, fontWeight: 700, fontFamily: "var(--font-mono)" }}>
                    {modelValues["GraphCast"] !== undefined && modelValues["GraphCast"] !== null ? `${modelValues["GraphCast"].toFixed(1)}°` : "—"}
                  </div>
                  {weights && weights["GraphCast"] !== undefined && (
                    <div style={{ fontSize: 10, color: "var(--primary-gold-dark)", fontWeight: 600 }}>
                      {(weights["GraphCast"] * 100).toFixed(0)}%
                    </div>
                  )}
                </div>

                <div style={{ background: "white", padding: 4, borderRadius: 3, border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600 }}>Pangu</div>
                  <div style={{ fontSize: 13, fontWeight: 700, fontFamily: "var(--font-mono)" }}>
                    {modelValues["Pangu"] !== undefined && modelValues["Pangu"] !== null ? `${modelValues["Pangu"].toFixed(1)}°` : "—"}
                  </div>
                  {weights && weights["Pangu"] !== undefined && (
                    <div style={{ fontSize: 10, color: "var(--primary-gold-dark)", fontWeight: 600 }}>
                      {(weights["Pangu"] * 100).toFixed(0)}%
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Telemetry Rows */}
          <div className="key-value-row">
            <span className="key">Initialization Time</span>
            <span className="value">{forecast.init}</span>
          </div>

          <div className="key-value-row">
            <span className="key">Domain Range (Min / Max)</span>
            <span className="value">{grid.min.toFixed(1)}°C / {grid.max.toFixed(1)}°C</span>
          </div>

          <div className="key-value-row">
            <span className="key">Input Feed Status</span>
            <span className="value" style={{ color: isDegraded ? "var(--status-amber)" : "var(--status-green)" }}>
              {input_health?.status || "FULL INPUT (3/3)"}
            </span>
          </div>

          <div className="key-value-row">
            <span className="key">EVP Post-Processing</span>
            <span className="value">
              {evp.evp_or_guardrail_changed_field ? "Active (Tail Restored)" : "Nominal"} (α = {evp.evp_alpha})
            </span>
          </div>

          <div className="key-value-row">
            <span className="key">Kelvin Physical Guardrail</span>
            <span className="value">
              {evp.guardrail_clip_detected ? "Enforced (Clipped)" : "Nominal [-93°C, +67°C]"}
            </span>
          </div>
        </div>
      </div>

      {/* Degradation / Renormalization Note */}
      {isDegraded && (
        <div className="integrity-banner">
          <strong>Degraded Mode Active:</strong> Feeds marked unavailable have their weights automatically zeroed out, and the remaining model contributions are convexly renormalized at every grid point.
        </div>
      )}
    </div>
  );
};

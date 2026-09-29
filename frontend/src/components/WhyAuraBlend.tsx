import React, { useState } from "react";
import { GridPayload, WeightsResponse } from "../types";
import { MapViewer } from "./MapViewer";
import {
  IconSparkles,
  IconTarget,
  IconInfo,
  IconCompass,
  IconShieldAlert,
} from "./Icons";

interface WhyAuraBlendProps {
  weightsData: WeightsResponse | null;
  selectedCell: { r: number; c: number; lat: number; lon: number; val: number | null } | null;
  onSelectCell: (cell: { r: number; c: number; lat: number; lon: number; val: number | null }) => void;
  candidateValues?: Record<string, number | null>;
  consensusVal?: number;
}

export const WhyAuraBlend: React.FC<WhyAuraBlendProps> = ({
  weightsData,
  selectedCell,
  onSelectCell,
  candidateValues,
  consensusVal,
}) => {
  const [activeModel, setActiveModel] = useState<"HRES" | "GraphCast" | "Pangu">("Pangu");

  if (!weightsData) {
    return (
      <div className="neu-panel">
        <div className="neu-panel-body" style={{ textAlign: "center", padding: 40 }}>
          <p style={{ color: "var(--text-muted)", fontWeight: 600 }}>
            Loading spatial weight contribution fields from SDW-Net...
          </p>
        </div>
      </div>
    );
  }

  const { weights, mean_weights } = weightsData;
  const currentGrid = weights[activeModel];

  // Selected cell weights
  const cellWeights: Record<string, number> = {};
  if (selectedCell) {
    const { r, c } = selectedCell;
    for (const name of ["HRES", "GraphCast", "Pangu"]) {
      if (weights[name] && weights[name].values[r]) {
        cellWeights[name] = Number(weights[name].values[r][c] ?? 0);
      }
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* 1. Forecaster Question Narrative Header */}
      <div className="neu-panel" style={{ borderLeft: "5px solid var(--brand-orange)" }}>
        <div className="neu-panel-body" style={{ padding: "18px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <IconSparkles size={18} color="var(--brand-orange)" />
            <h2 style={{ fontSize: 16, fontWeight: 800, color: "var(--text-primary)" }}>
              "Which model should I trust here, by how much, and why?"
            </h2>
          </div>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>
            Conventional ensemble averaging applies a flat arithmetic mean or a single nationwide scalar weight.
            In reality, NWP accuracy is non-uniform across the subcontinent: <strong>physical NWP (HRES)</strong> excels in
            complex Himalayan orography and coastal marine interfaces, while <strong>deep learning foundation models (GraphCast & Pangu)</strong> dominate
            large-scale geopotential dynamics across open plains. AURA-BLEND uses <strong>Spatial Dynamic Weighting (SDW-Net)</strong> to
            infer calibrated, spatially continuous trust coefficients at every 1.5° grid point across India.
          </p>
        </div>
      </div>

      {/* 2. Interactive Model Spatial Trust Switcher */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>
            Inspect Spatial Weight Map:
          </span>
          {(["Pangu", "GraphCast", "HRES"] as const).map((m) => {
            const isActive = activeModel === m;
            const meanPct = (mean_weights[m] * 100).toFixed(1);
            return (
              <button
                key={m}
                type="button"
                className={`sub-model-pill ${isActive ? "active" : ""}`}
                style={{ padding: "6px 14px", fontSize: 12 }}
                onClick={() => setActiveModel(m)}
              >
                <span>{m} Contribution</span>
                <span
                  style={{
                    marginLeft: 6,
                    fontSize: 10,
                    fontFamily: "var(--font-mono)",
                    backgroundColor: isActive ? "#ffffff" : "var(--bg-surface-inset)",
                    padding: "1px 5px",
                    borderRadius: 3,
                  }}
                >
                  Mean {meanPct}%
                </span>
              </button>
            );
          })}
        </div>

        <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>
          Weights sum to 100% at every coordinate point
        </span>
      </div>

      {/* 3. Main Split View: Map Left, Point Inspector & Rationale Right */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 400px", gap: 20 }}>
        {/* Spatial Trust Map */}
        <MapViewer
          grid={currentGrid}
          activeModelKey={activeModel.toLowerCase()}
          setActiveModelKey={() => {}}
          title={`${activeModel} Spatial Contribution Weight [0.0 – 1.0]`}
          selectedCell={selectedCell}
          onSelectCell={onSelectCell}
          height={640}
          showModeBar={false}
        />

        {/* Right Dossier */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Selected Coordinate Trust Card */}
          <div className="neu-panel" style={{ borderTop: "3px solid var(--brand-orange)" }}>
            <div className="neu-panel-header">
              <div className="neu-panel-title">
                <IconTarget size={15} color="var(--brand-orange)" />
                <span>Coordinate Trust Analysis</span>
              </div>
              {selectedCell ? (
                <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--text-primary)" }}>
                  {selectedCell.lat.toFixed(1)}°N, {selectedCell.lon.toFixed(1)}°E
                </span>
              ) : (
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Domain Average</span>
              )}
            </div>

            <div className="neu-panel-body">
              {selectedCell ? (
                <div>
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>
                      AURA-BLEND Consensus Forecast
                    </div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginTop: 2 }}>
                      <span style={{ fontSize: 30, fontWeight: 900, fontFamily: "var(--font-mono)", color: "var(--brand-orange)" }}>
                        {consensusVal !== undefined ? consensusVal.toFixed(1) : selectedCell.val?.toFixed(1) ?? "—"}
                      </span>
                      <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-muted)" }}>°C</span>
                    </div>
                  </div>

                  <div style={{ fontSize: 11, fontWeight: 800, color: "var(--text-secondary)", marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>
                    Point Weight Distribution:
                  </div>

                  {(["Pangu", "GraphCast", "HRES"] as const).map((name) => {
                    const weightFrac = cellWeights[name] ?? mean_weights[name];
                    const val = candidateValues ? candidateValues[name] : null;
                    const color = name === "Pangu" ? "var(--brand-orange)" : name === "GraphCast" ? "var(--meteo-blue)" : "var(--status-green)";
                    return (
                      <div
                        key={name}
                        style={{
                          marginBottom: 10,
                          padding: "10px 12px",
                          background: "var(--bg-surface-inset)",
                          borderRadius: "var(--radius-sm)",
                          border: "1px solid var(--border-subtle)",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                          <span style={{ fontWeight: 700, fontSize: 13, color: "var(--text-primary)" }}>{name}</span>
                          <span style={{ fontFamily: "var(--font-mono)", fontWeight: 800, color, fontSize: 13 }}>
                            {(weightFrac * 100).toFixed(1)}% weight
                          </span>
                        </div>
                        {val !== null && val !== undefined && (
                          <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 6 }}>
                            Candidate Model Value: <strong>{val.toFixed(1)}°C</strong>
                          </div>
                        )}
                        <div style={{ height: 6, width: "100%", background: "#e2e8f0", borderRadius: 3, overflow: "hidden" }}>
                          <div
                            style={{
                              height: "100%",
                              width: `${Math.min(100, weightFrac * 100)}%`,
                              backgroundColor: color,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div>
                  <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 14 }}>
                    Click any cell on the India map to inspect the exact model weight allocation at that geographic coordinate.
                  </p>
                  <div style={{ fontSize: 11, fontWeight: 800, color: "var(--text-muted)", marginBottom: 8, textTransform: "uppercase" }}>
                    Nationwide Mean Contributions:
                  </div>
                  {["Pangu", "GraphCast", "HRES"].map((name) => (
                    <div key={name} className="spec-kv-row">
                      <span className="spec-kv-key">{name} Mean Trust</span>
                      <span className="spec-kv-val">{(mean_weights[name] * 100).toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Scientific Rationale Card */}
          <div className="neu-panel">
            <div className="neu-panel-header">
              <div className="neu-panel-title">
                <IconInfo size={15} color="var(--brand-orange)" />
                <span>Physical Weighting Rationale</span>
              </div>
            </div>
            <div className="neu-panel-body" style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6 }}>
              <p style={{ marginBottom: 10 }}>
                <strong>Dynamic vs Static Blending:</strong> SDW-Net ingests 13 local geographic and operational channels
                (terrain elevation, slope, land-sea mask, inter-model spread, and rolling lead skill) together with 3 synoptic weather regime fields (Z500, T850, MSLP).
              </p>
              <p>
                In coastal sectors and complex Himalayan terrain, physical thermodynamic boundaries often prioritize HRES physics.
                Across the interior Deccan Plateau and Northern Indo-Gangetic Plains, Pangu and GraphCast frequently receive higher weight
                due to their superior low-bias geopotential tracking.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WhyAuraBlend;

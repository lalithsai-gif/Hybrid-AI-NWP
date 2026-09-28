import React, { useState } from "react";
import { GridPayload, WeightsResponse } from "../types";
import { MapViewer } from "./MapViewer";

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
      <div className="sci-card">
        <div className="sci-card-body">
          <p style={{ color: "var(--text-muted)" }}>Loading spatial weight contribution fields...</p>
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
      {/* Top Narrative Card: Explaining the Forecaster Question */}
      <div className="sci-card" style={{ borderLeft: "5px solid var(--primary-gold)" }}>
        <div className="sci-card-body">
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>
            "Which model should I trust here, by how much, and why?"
          </h2>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>
            Traditional forecast blending applies a flat arithmetic mean or a single nationwide scalar weight.
            In reality, model skill is non-uniform: <strong>physical NWP (HRES)</strong> captures complex orography and land-sea contrasts,
            while <strong>deep learning models (GraphCast & Pangu)</strong> excel in large-scale geopotential dynamics and synoptic advection.
            AURA-BLEND uses <strong>Spatial Dynamic Weighting (SDW-Net)</strong> to infer localized trust scores at every single grid cell.
          </p>
        </div>
      </div>

      {/* Model Selector Bar */}
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
          Inspect Spatial Weights:
        </span>
        {(["Pangu", "GraphCast", "HRES"] as const).map((m) => (
          <button
            key={m}
            className={`map-mode-btn ${activeModel === m ? "active" : ""}`}
            style={{ padding: "6px 16px", fontSize: 13 }}
            onClick={() => setActiveModel(m)}
          >
            {m} Contribution Map (Mean: {(mean_weights[m] * 100).toFixed(1)}%)
          </button>
        ))}
      </div>

      {/* Main Grid: Map on Left, Point Inspector & Skill on Right */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 20 }}>
        {/* Map Viewer for Selected Weight */}
        <MapViewer
          grid={currentGrid}
          activeModelKey={activeModel.toLowerCase()}
          setActiveModelKey={() => {}}
          title={`${activeModel} Spatial Contribution Weight [0.0 – 1.0]`}
          selectedCell={selectedCell}
          onSelectCell={onSelectCell}
          height={620}
          showModeBar={false}
        />

        {/* Right Inspector Sidebar */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Selected Cell Breakdown Card */}
          <div className="sci-card">
            <div className="sci-card-header">
              <div className="sci-card-title">
                <span>Grid Cell Trust Breakdown</span>
              </div>
              {selectedCell ? (
                <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>
                  {selectedCell.lat.toFixed(1)}°N, {selectedCell.lon.toFixed(1)}°E
                </span>
              ) : (
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Domain Average</span>
              )}
            </div>

            <div className="sci-card-body">
              {selectedCell ? (
                <div>
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
                      Consensus Forecast Value
                    </div>
                    <div style={{ display: "flex", alignItems: "baseline" }}>
                      <span className="metric-value-huge">
                        {consensusVal !== undefined ? consensusVal.toFixed(1) : selectedCell.val?.toFixed(1) ?? "—"}
                      </span>
                      <span className="metric-unit">°C</span>
                    </div>
                  </div>

                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 8, textTransform: "uppercase" }}>
                    Candidate Model Contributions:
                  </div>

                  {["Pangu", "GraphCast", "HRES"].map((name) => {
                    const weightFrac = cellWeights[name] ?? mean_weights[name];
                    const val = candidateValues ? candidateValues[name] : null;
                    return (
                      <div key={name} style={{ marginBottom: 10, padding: 8, background: "#f8fafc", borderRadius: 4, border: "1px solid #e2e8f0" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                          <span style={{ fontWeight: 600, fontSize: 13 }}>{name}</span>
                          <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--primary-gold-dark)", fontSize: 13 }}>
                            {(weightFrac * 100).toFixed(1)}% weight
                          </span>
                        </div>
                        {val !== null && val !== undefined && (
                          <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                            Candidate Forecast Value: <strong>{val.toFixed(1)}°C</strong>
                          </div>
                        )}
                        <div style={{ height: 6, width: "100%", background: "#e2e8f0", borderRadius: 3, overflow: "hidden", marginTop: 4 }}>
                          <div
                            style={{
                              height: "100%",
                              width: `${Math.min(100, weightFrac * 100)}%`,
                              background: name === "Pangu" ? "#d97706" : name === "GraphCast" ? "#0284c7" : "#15803d",
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div>
                  <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 12 }}>
                    Click any grid cell on the India map to inspect the exact model weight allocation at that specific geographic coordinate.
                  </p>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 8, textTransform: "uppercase" }}>
                    Nationwide Mean Contributions:
                  </div>
                  {["Pangu", "GraphCast", "HRES"].map((name) => (
                    <div key={name} className="key-value-row">
                      <span className="key">{name} Mean Trust</span>
                      <span className="value">{(mean_weights[name] * 100).toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Scientific Rationale Card */}
          <div className="sci-card">
            <div className="sci-card-header">
              <div className="sci-card-title">
                <span>Spatial Weighting Rationale</span>
              </div>
            </div>
            <div className="sci-card-body" style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>
              <p style={{ marginBottom: 8 }}>
                <strong>Weights are not static constants:</strong> SDW-Net ingests 13 local feature channels (terrain elevation, land-sea boundary, slope, inter-model spread, and lead-time skill) plus 3 synoptic weather regime channels.
              </p>
              <p>
                In coastal sectors and complex Himalayan foothills, physical boundary constraints often elevate HRES trust. Over open interior plateaus and plains, Pangu and GraphCast frequently receive higher weight due to superior low-bias thermal tracking.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

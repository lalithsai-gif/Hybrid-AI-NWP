import React from "react";
import { ModelInfo } from "../types";

interface ProcessingPipelineProps {
  modelInfo: ModelInfo | null;
}

export const ProcessingPipeline: React.FC<ProcessingPipelineProps> = ({ modelInfo }) => {
  const stages = [
    {
      step: 1,
      name: "Input Forecasts",
      badge: "Ingestion Layer",
      color: "#2563eb",
      desc: "Heterogeneous multi-model inputs: ECMWF HRES (0.1° physics NWP), DeepMind GraphCast (0.25° GNN), and Huawei Pangu-Weather (0.25° 3D-ViT).",
      specs: ["HRES (NWP)", "GraphCast (AI)", "Pangu (AI)", "Lead: 24, 48, 72, 120h"],
    },
    {
      step: 2,
      name: "Common Grid Projection",
      badge: "Pre-processing",
      color: "#0891b2",
      desc: "Bilinear regridding to standard operational WeatherBench 2 India domain (6.0°N–38.5°N, 68.0°E–98.5°E) at 1.5° resolution (21×20 grid).",
      specs: ["Domain: India Subcontinent", "Grid shape: 21 × 20", "Uniform spatial alignment"],
    },
    {
      step: 3,
      name: "Feature Extraction & Stacking",
      badge: "Contextual Conditioning",
      color: "#059669",
      desc: "Extracts 13 local channels (inter-model spread, range, lead-specific rolling skill, static geography: orography, slope, land-sea mask) + 3 synoptic weather regime channels (Z500, T850, MSLP).",
      specs: ["13 Local Extra Channels", "3 Global Regime Channels", "Lead & DOY Temporal Encodings"],
    },
    {
      step: 4,
      name: "SDW-Net Architecture",
      badge: "Deep Learning Core",
      color: "#d97706",
      desc: "Spatial Dynamic Weighting Network: Local convolutional blocks + Global context encoder fused via 8-head Cross-Attention mechanism to determine localized model reliability.",
      specs: ["1,198,547 parameters", "8-head Cross-Attention", "GroupNorm + GELU activations", "Dropout = 0.12"],
    },
    {
      step: 5,
      name: "Adaptive Spatial Weights",
      badge: "Spatial Trust Map",
      color: "#ea580c",
      desc: "Spatial Softmax head yields convex gating coefficients summing to 1.0 at every grid point: W_hres(x,y) + W_graphcast(x,y) + W_pangu(x,y) = 1. Dynamically renormalizable under degraded feeds.",
      specs: ["Per-cell weights [0, 1]", "Sum to 1.0 everywhere", "Degraded-mode dynamic renormalization"],
    },
    {
      step: 6,
      name: "EVP + Kelvin Guardrails",
      badge: "Physical Regulation",
      color: "#dc2626",
      desc: "Extreme Value Preservation (EVP with α = 0.75) restores physical upper tails smoothed out by convex averaging; Kelvin guardrail strictly clips unphysical values outside [180.0 K, 340.0 K].",
      specs: ["EVP α = 0.75", "Extreme threshold = 1.645σ", "Kelvin clip: [180K, 340K]"],
    },
    {
      step: 7,
      name: "Consensus Forecast Product",
      badge: "Operational Output",
      color: "#7c3aed",
      desc: "Final calibrated 2m temperature consensus forecast delivering 7.78% RMSE reduction over naive arithmetic mean and improved spatial coherence across India.",
      specs: ["RMSE = 1.434°C (vs 1.555°C Mean)", "ACC = 0.9964", "FSS = 0.741"],
    },
    {
      step: 8,
      name: "Forecaster Decision Support",
      badge: "Dashboard Layer",
      color: "#b45309",
      desc: "Forecaster-centric interactive console providing synchronized model comparison, difference maps, transparent spatial contribution inspection, and extreme hazard guidance.",
      specs: ["Point Inspector", "Synchronized Multi-Maps", "Zero Hallucinated Metrics"],
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Overview Banner */}
      <div className="sci-card" style={{ borderLeft: "5px solid var(--primary-gold)" }}>
        <div className="sci-card-body">
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>
            AURA-BLEND Operational Processing Pipeline
          </h2>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>
            The pipeline transforms raw heterogeneous deterministic NWP and AI forecasts into a calibrated, physically bounded consensus field with explicit spatial explainability.
          </p>
        </div>
      </div>

      {/* Visual Pipeline Stages */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {stages.map((st, idx) => (
          <React.Fragment key={st.step}>
            <div
              className="sci-card"
              style={{
                display: "grid",
                gridTemplateColumns: "70px 1fr 280px",
                alignItems: "center",
                padding: "16px 20px",
                gap: 16,
                borderLeft: `4px solid ${st.color}`,
              }}
            >
              {/* Step circle */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: "50%",
                    backgroundColor: st.color,
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 800,
                    fontSize: 15,
                  }}
                >
                  {st.step}
                </div>
              </div>

              {/* Description */}
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>{st.name}</h3>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: 999,
                      backgroundColor: "#f3f4f6",
                      color: st.color,
                      border: `1px solid ${st.color}40`,
                      textTransform: "uppercase",
                    }}
                  >
                    {st.badge}
                  </span>
                </div>
                <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.4 }}>{st.desc}</p>
              </div>

              {/* Specs Pills */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, justifyContent: "flex-end" }}>
                {st.specs.map((spec, sIdx) => (
                  <span
                    key={sIdx}
                    style={{
                      fontSize: 11,
                      backgroundColor: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      padding: "3px 8px",
                      borderRadius: 4,
                      color: "var(--text-secondary)",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {spec}
                  </span>
                ))}
              </div>
            </div>

            {idx < stages.length - 1 && (
              <div style={{ display: "flex", justifyContent: "center", margin: "-6px 0" }}>
                <span style={{ color: "var(--primary-gold)", fontSize: 16, fontWeight: 900 }}>↓</span>
              </div>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Model Specs Card */}
      {modelInfo && (
        <div className="sci-card">
          <div className="sci-card-header">
            <div className="sci-card-title">
              <span>Architecture Metadata (aura_blend_sdw_net.pt)</span>
            </div>
          </div>
          <div className="sci-card-body">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              <div className="key-value-row">
                <span className="key">Trainable Parameters</span>
                <span className="value">{modelInfo.architecture.parameters.toLocaleString()}</span>
              </div>
              <div className="key-value-row">
                <span className="key">Lead Hours</span>
                <span className="value">{modelInfo.lead_hours.join(", ")} h</span>
              </div>
              <div className="key-value-row">
                <span className="key">Validation Tuning</span>
                <span className="value">EVP α = {modelInfo.evp_alpha}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

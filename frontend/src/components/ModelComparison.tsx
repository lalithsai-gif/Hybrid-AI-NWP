import React, { useState } from "react";
import { ComparisonResponse } from "../types";
import { MapViewer } from "./MapViewer";
import {
  IconBarChart,
  IconCheck,
  IconSparkles,
  IconInfo,
} from "./Icons";

interface ModelComparisonProps {
  comparisonData: ComparisonResponse | null;
  ablationsData: Array<{ Ablation: string; RMSE_C?: string; MAE_C?: string; RMSE?: string; MAE?: string }> | null;
  selectedCell: { r: number; c: number; lat: number; lon: number; val: number | null } | null;
  onSelectCell: (cell: { r: number; c: number; lat: number; lon: number; val: number | null }) => void;
}

export const ModelComparison: React.FC<ModelComparisonProps> = ({
  comparisonData,
  ablationsData,
  selectedCell,
  onSelectCell,
}) => {
  const [activeSubMap, setActiveSubMap] = useState<string>("AURA-BLEND");

  if (!comparisonData) {
    return (
      <div className="neu-panel">
        <div className="neu-panel-body" style={{ textAlign: "center", padding: 40 }}>
          <p style={{ color: "var(--text-muted)", fontWeight: 600 }}>Loading multi-model benchmark telemetry...</p>
        </div>
      </div>
    );
  }

  const { maps, locked_test_metrics, sample_metrics } = comparisonData;
  const currentGrid = maps[activeSubMap] || maps["AURA-BLEND"];

  const modelsList = [
    { key: "AURA-BLEND", label: "★ AURA-BLEND (Consensus)" },
    { key: "Arithmetic Mean", label: "Arithmetic Mean" },
    { key: "HRES", label: "HRES (ECMWF)" },
    { key: "GraphCast", label: "GraphCast (DeepMind)" },
    { key: "Pangu", label: "Pangu (Huawei)" },
    { key: "truth", label: "ERA5 Truth" },
    { key: "disagreement", label: "Model Disagreement (Spread)" },
    { key: "diff_mean", label: "AURA − Mean Difference" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* 1. Benchmark Highlight Banner */}
      <div className="neu-panel" style={{ borderLeft: "5px solid var(--brand-orange)" }}>
        <div className="neu-panel-body" style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <IconBarChart size={18} color="var(--brand-orange)" />
              <h2 style={{ fontSize: 16, fontWeight: 800, color: "var(--text-primary)" }}>
                WeatherBench 2 Locked Test Benchmark Verification
              </h2>
            </div>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>
              Strict out-of-sample evaluation across 588 independent test cycles over the India domain.
              AURA-BLEND demonstrates statistically significant skill gains over both numerical NWP and individual AI foundation models.
            </p>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              backgroundColor: "var(--bg-surface-inset)",
              padding: "8px 16px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <div>
              <div style={{ fontSize: 10, fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase" }}>
                Skill Gain vs Naive Mean
              </div>
              <div style={{ fontSize: 20, fontWeight: 900, fontFamily: "var(--font-mono)", color: "var(--status-green)" }}>
                −7.78% RMSE
              </div>
            </div>
            <div style={{ width: 1, height: 32, backgroundColor: "var(--border-subtle)" }} />
            <div>
              <div style={{ fontSize: 10, fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase" }}>
                Correlation ACC
              </div>
              <div style={{ fontSize: 20, fontWeight: 900, fontFamily: "var(--font-mono)", color: "var(--brand-orange)" }}>
                0.9964
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Synchronized Field Selector */}
      <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>
          Inspect Synchronized Field:
        </span>
        {modelsList.map((m) => {
          const isActive = activeSubMap === m.key;
          return (
            <button
              key={m.key}
              type="button"
              className={`sub-model-pill ${isActive ? "active" : ""}`}
              onClick={() => setActiveSubMap(m.key)}
            >
              {m.label}
            </button>
          );
        })}
      </div>

      {/* 3. Split Grid: Map Left, Tables Right */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 460px", gap: 20 }}>
        {/* Synchronized Map */}
        <MapViewer
          grid={currentGrid}
          activeModelKey={activeSubMap}
          setActiveModelKey={setActiveSubMap}
          title={`${activeSubMap} Field (${comparisonData.date} +${comparisonData.lead_hours}h)`}
          selectedCell={selectedCell}
          onSelectCell={onSelectCell}
          height={660}
          showModeBar={false}
        />

        {/* Tables Column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* A. Current Sample Quick Verification */}
          <div className="neu-panel">
            <div className="neu-panel-header">
              <div className="neu-panel-title">
                <span>Per-Sample Verification ({comparisonData.date} +{comparisonData.lead_hours}h)</span>
              </div>
            </div>
            <div className="neu-panel-body" style={{ padding: 0 }}>
              <div className="neu-table-wrapper">
                <table className="neu-table">
                  <thead>
                    <tr>
                      <th>Model</th>
                      <th>RMSE (°C)</th>
                      <th>MAE (°C)</th>
                      <th>Bias (°C)</th>
                      <th>ACC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(sample_metrics).map(([name, m]) => {
                      const isAura = name.includes("AURA");
                      return (
                        <tr key={name} className={isAura ? "highlight-consensus-row" : ""}>
                          <td style={{ fontWeight: isAura ? 800 : 600, color: isAura ? "var(--brand-orange)" : "inherit" }}>
                            {name}
                          </td>
                          <td style={{ fontFamily: "var(--font-mono)", fontWeight: 700 }}>{m.RMSE_C.toFixed(3)}</td>
                          <td style={{ fontFamily: "var(--font-mono)" }}>{m.MAE_C.toFixed(3)}</td>
                          <td style={{ fontFamily: "var(--font-mono)" }}>{m.Bias_C.toFixed(3)}</td>
                          <td style={{ fontFamily: "var(--font-mono)" }}>{m.ACC.toFixed(4)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* B. Locked Benchmark Verification (final_metrics.csv) */}
          <div className="neu-panel" style={{ borderTop: "3px solid var(--brand-orange)" }}>
            <div className="neu-panel-header">
              <div className="neu-panel-title">
                <span>Locked Benchmark (final_metrics.csv)</span>
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)" }}>588 Samples</span>
            </div>
            <div className="neu-panel-body" style={{ padding: 0 }}>
              <div className="neu-table-wrapper">
                <table className="neu-table">
                  <thead>
                    <tr>
                      <th>Model</th>
                      <th>RMSE (°C)</th>
                      <th>MAE (°C)</th>
                      <th>Bias (°C)</th>
                      <th>ACC</th>
                      <th>FSS</th>
                      <th>CSI</th>
                      <th>ETS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {locked_test_metrics.map((row) => {
                      const isAura = row.Model.includes("AURA-Blend");
                      return (
                        <tr key={row.Model} className={isAura ? "highlight-consensus-row" : ""}>
                          <td style={{ fontWeight: isAura ? 800 : 600, whiteSpace: "nowrap", color: isAura ? "var(--brand-orange)" : "inherit" }}>
                            {row.Model}
                          </td>
                          <td style={{ fontFamily: "var(--font-mono)", fontWeight: 700 }}>{Number(row.RMSE_C).toFixed(3)}</td>
                          <td style={{ fontFamily: "var(--font-mono)" }}>{Number(row.MAE_C).toFixed(3)}</td>
                          <td style={{ fontFamily: "var(--font-mono)" }}>{Number(row.Bias_C).toFixed(3)}</td>
                          <td style={{ fontFamily: "var(--font-mono)" }}>{Number(row.ACC).toFixed(4)}</td>
                          <td style={{ fontFamily: "var(--font-mono)" }}>{Number(row.FSS).toFixed(3)}</td>
                          <td style={{ fontFamily: "var(--font-mono)" }}>{Number(row.CSI).toFixed(3)}</td>
                          <td style={{ fontFamily: "var(--font-mono)" }}>{Number(row.ETS).toFixed(3)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* C. Architecture Ablations (ablation_results.csv) */}
          {ablationsData && ablationsData.length > 0 && (
            <div className="neu-panel">
              <div className="neu-panel-header">
                <div className="neu-panel-title">
                  <span>Architecture Ablations (ablation_results.csv)</span>
                </div>
              </div>
              <div className="neu-panel-body" style={{ padding: 0 }}>
                <div className="neu-table-wrapper">
                  <table className="neu-table">
                    <thead>
                      <tr>
                        <th>Configuration</th>
                        <th>RMSE (°C)</th>
                        <th>MAE (°C)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ablationsData.map((row) => (
                        <tr key={row.Ablation}>
                          <td style={{ fontWeight: 600 }}>{row.Ablation}</td>
                          <td style={{ fontFamily: "var(--font-mono)", fontWeight: 700 }}>
                            {row.RMSE_C ? Number(row.RMSE_C).toFixed(4) : row.RMSE ? Number(row.RMSE).toFixed(4) : "—"}
                          </td>
                          <td style={{ fontFamily: "var(--font-mono)" }}>
                            {row.MAE_C ? Number(row.MAE_C).toFixed(4) : row.MAE ? Number(row.MAE).toFixed(4) : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModelComparison;

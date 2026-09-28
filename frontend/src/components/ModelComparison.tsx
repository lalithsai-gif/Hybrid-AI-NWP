import React, { useState } from "react";
import { ComparisonResponse } from "../types";
import { MapViewer } from "./MapViewer";

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
      <div className="sci-card">
        <div className="sci-card-body">
          <p style={{ color: "var(--text-muted)" }}>Loading model comparison data...</p>
        </div>
      </div>
    );
  }

  const { maps, locked_test_metrics, sample_metrics } = comparisonData;
  const currentGrid = maps[activeSubMap] || maps["AURA-BLEND"];

  const modelsList = [
    { key: "AURA-BLEND", label: "AURA-BLEND (Consensus)" },
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
      {/* Synchronized Multi-Map Sub-Selector */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
          Inspect Synchronized Field:
        </span>
        {modelsList.map((m) => (
          <button
            key={m.key}
            className={`map-mode-btn ${activeSubMap === m.key ? "active" : ""}`}
            onClick={() => setActiveSubMap(m.key)}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Main Grid: Interactive Map + Metrics Tables */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 440px", gap: 20 }}>
        {/* Map Viewer */}
        <MapViewer
          grid={currentGrid}
          activeModelKey={activeSubMap}
          setActiveModelKey={setActiveSubMap}
          title={`${activeSubMap} Field (${comparisonData.date} +${comparisonData.lead_hours}h)`}
          selectedCell={selectedCell}
          onSelectCell={onSelectCell}
          height={640}
          showModeBar={false}
        />

        {/* Right Tables Column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Current Sample Quick Metrics */}
          <div className="sci-card">
            <div className="sci-card-header">
              <div className="sci-card-title">
                <span>Per-Sample Verification ({comparisonData.date} +{comparisonData.lead_hours}h)</span>
              </div>
            </div>
            <div className="sci-card-body" style={{ padding: 0 }}>
              <table className="sci-table">
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
                      <tr key={name} className={isAura ? "highlight-row" : ""}>
                        <td style={{ fontWeight: isAura ? 700 : 500 }}>{name}</td>
                        <td style={{ fontFamily: "var(--font-mono)" }}>{m.RMSE_C.toFixed(3)}</td>
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

          {/* Locked-Test Benchmark Metrics Table from final_metrics.csv */}
          <div className="sci-card">
            <div className="sci-card-header">
              <div className="sci-card-title">
                <span>Locked Benchmark Verification (final_metrics.csv)</span>
              </div>
              <span style={{ fontSize: 10, color: "var(--text-muted)" }}>588 Locked Samples</span>
            </div>
            <div className="sci-card-body" style={{ padding: 0, overflowX: "auto" }}>
              <table className="sci-table">
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
                      <tr key={row.Model} className={isAura ? "highlight-row" : ""}>
                        <td style={{ fontWeight: isAura ? 700 : 500, whiteSpace: "nowrap" }}>{row.Model}</td>
                        <td style={{ fontFamily: "var(--font-mono)" }}>{Number(row.RMSE_C).toFixed(3)}</td>
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

          {/* Ablation Results Table from ablation_results.csv */}
          {ablationsData && ablationsData.length > 0 && (
            <div className="sci-card">
              <div className="sci-card-header">
                <div className="sci-card-title">
                  <span>Architecture Ablations (ablation_results.csv)</span>
                </div>
              </div>
              <div className="sci-card-body" style={{ padding: 0 }}>
                <table className="sci-table">
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
                        <td style={{ fontWeight: 500 }}>{row.Ablation}</td>
                        <td style={{ fontFamily: "var(--font-mono)" }}>
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
          )}
        </div>
      </div>
    </div>
  );
};

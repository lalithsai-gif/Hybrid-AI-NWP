import React, { useState, useEffect } from "react";
import { CaseDetail, CaseItem } from "../types";
import { MapViewer } from "./MapViewer";

interface CaseStudyPlaybackProps {
  cases: CaseItem[];
  selectedCell: { r: number; c: number; lat: number; lon: number; val: number | null } | null;
  onSelectCell: (cell: { r: number; c: number; lat: number; lon: number; val: number | null }) => void;
  apiBaseUrl?: string;
}

export const CaseStudyPlayback: React.FC<CaseStudyPlaybackProps> = ({
  cases,
  selectedCell,
  onSelectCell,
  apiBaseUrl = "",
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [caseData, setCaseData] = useState<CaseDetail | null>(null);
  const [activeStepId, setActiveStepId] = useState("aura");
  const [loading, setLoading] = useState(false);

  const currentCase = cases[currentIndex];

  useEffect(() => {
    if (!currentCase) return;
    setLoading(true);
    fetch(`${apiBaseUrl}/api/cases/${currentCase.id}`)
      .then((res) => res.json())
      .then((data: CaseDetail) => {
        setCaseData(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load case detail", err);
        setLoading(false);
      });
  }, [currentCase?.id, apiBaseUrl]);

  if (!cases || cases.length === 0) {
    return (
      <div className="sci-card">
        <div className="sci-card-body">
          <p style={{ color: "var(--text-muted)" }}>Loading case studies...</p>
        </div>
      </div>
    );
  }

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : cases.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < cases.length - 1 ? prev + 1 : 0));
  };

  // Resolve grid based on active step
  let displayGrid = null;
  let displayTitle = "";
  if (caseData && caseData.maps) {
    if (activeStepId === "hres") {
      displayGrid = caseData.maps["HRES"];
      displayTitle = "HRES Forecast (ECMWF Physics)";
    } else if (activeStepId === "graphcast") {
      displayGrid = caseData.maps["GraphCast"];
      displayTitle = "GraphCast Forecast (DeepMind GNN)";
    } else if (activeStepId === "pangu") {
      displayGrid = caseData.maps["Pangu"];
      displayTitle = "Pangu-Weather Forecast (Huawei 3D-ViT)";
    } else if (activeStepId === "mean") {
      displayGrid = caseData.maps["Arithmetic Mean"];
      displayTitle = "Arithmetic Mean Forecast";
    } else if (activeStepId === "disagreement") {
      displayGrid = caseData.maps["disagreement"];
      displayTitle = "Inter-Model Disagreement (Spread in °C)";
    } else if (activeStepId === "difference") {
      displayGrid = caseData.maps["difference"];
      displayTitle = "AURA-BLEND vs Arithmetic Mean Difference (°C)";
    } else if (activeStepId === "weight_pangu") {
      displayGrid = caseData.maps["weights"]?.["Pangu"];
      displayTitle = "Pangu Learned Spatial Weight";
    } else if (activeStepId === "weight_graphcast") {
      displayGrid = caseData.maps["weights"]?.["GraphCast"];
      displayTitle = "GraphCast Learned Spatial Weight";
    } else if (activeStepId === "weight_hres") {
      displayGrid = caseData.maps["weights"]?.["HRES"];
      displayTitle = "HRES Learned Spatial Weight";
    } else {
      displayGrid = caseData.maps["AURA-BLEND"];
      displayTitle = "AURA-BLEND Consensus Forecast";
    }
  }

  const stepsList = [
    { id: "hres", label: "1. HRES" },
    { id: "graphcast", label: "2. GraphCast" },
    { id: "pangu", label: "3. Pangu" },
    { id: "mean", label: "4. Arithmetic Mean" },
    { id: "disagreement", label: "5. Disagreement" },
    { id: "aura", label: "6. AURA-BLEND" },
    { id: "difference", label: "7. Difference Map" },
    { id: "weight_pangu", label: "8. Pangu Weight" },
    { id: "weight_graphcast", label: "9. GraphCast Weight" },
    { id: "weight_hres", label: "10. HRES Weight" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Case Navigator Bar */}
      <div className="sci-card" style={{ borderTop: "3px solid var(--primary-gold)" }}>
        <div className="sci-card-body" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
              Case Playback:
            </span>
            <select
              className="control-select"
              value={currentIndex}
              onChange={(e) => setCurrentIndex(Number(e.target.value))}
            >
              {cases.map((c, idx) => (
                <option key={c.id} value={idx}>
                  Case {idx + 1}: {c.title} ({c.date} +{c.lead_hours}h)
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button className="control-btn" onClick={handlePrev}>
              ← Previous Case
            </button>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", minWidth: 60, textAlign: "center" }}>
              {currentIndex + 1} / {cases.length}
            </span>
            <button className="control-btn" onClick={handleNext}>
              Next Case →
            </button>
          </div>
        </div>
      </div>

      {/* Case Overview & Forecaster Narrative */}
      {currentCase && (
        <div className="sci-card" style={{ background: "#fcfbf7", borderLeft: "4px solid var(--primary-gold)" }}>
          <div className="sci-card-body">
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>
                {currentCase.title}
              </h3>
              <span style={{ fontSize: 12, fontFamily: "var(--font-mono)", fontWeight: 600, color: "var(--primary-gold-dark)" }}>
                Init: {currentCase.init} • Lead: +{currentCase.lead_hours}h
              </span>
            </div>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: 8 }}>
              <strong>Operational Significance:</strong> {currentCase.reason}
            </p>
            {caseData?.narrative && (
              <p style={{ fontSize: 12, color: "var(--text-muted)", fontStyle: "italic" }}>
                {caseData.narrative}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Synchronized Step Sequence Bar */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
          Playback Stage:
        </span>
        {stepsList.map((step) => (
          <button
            key={step.id}
            className={`map-mode-btn ${activeStepId === step.id ? "active" : ""}`}
            style={{ fontSize: 12, padding: "5px 10px" }}
            onClick={() => setActiveStepId(step.id)}
          >
            {step.label}
          </button>
        ))}
      </div>

      {/* Main Grid: Interactive Map + Metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 20 }}>
        {/* Map */}
        <MapViewer
          grid={displayGrid}
          activeModelKey={activeStepId}
          setActiveModelKey={setActiveStepId}
          title={displayTitle}
          selectedCell={selectedCell}
          onSelectCell={onSelectCell}
          height={620}
          showModeBar={false}
        />

        {/* Right Metrics Panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {caseData?.metrics && (
            <div className="sci-card">
              <div className="sci-card-header">
                <div className="sci-card-title">
                  <span>Case Verification Scores</span>
                </div>
              </div>
              <div className="sci-card-body" style={{ padding: 0 }}>
                <table className="sci-table">
                  <thead>
                    <tr>
                      <th>Model</th>
                      <th>RMSE (°C)</th>
                      <th>MAE (°C)</th>
                      <th>ACC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(caseData.metrics).map(([name, m]) => {
                      const isAura = name.includes("AURA");
                      return (
                        <tr key={name} className={isAura ? "highlight-row" : ""}>
                          <td style={{ fontWeight: isAura ? 700 : 500 }}>{name}</td>
                          <td style={{ fontFamily: "var(--font-mono)" }}>{m.RMSE_C.toFixed(3)}</td>
                          <td style={{ fontFamily: "var(--font-mono)" }}>{m.MAE_C.toFixed(3)}</td>
                          <td style={{ fontFamily: "var(--font-mono)" }}>{m.ACC.toFixed(4)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {caseData?.evp && (
            <div className="sci-card">
              <div className="sci-card-header">
                <div className="sci-card-title">
                  <span>EVP & Guardrails In This Case</span>
                </div>
              </div>
              <div className="sci-card-body">
                <div className="key-value-row">
                  <span className="key">EVP Alpha</span>
                  <span className="value">{caseData.evp.evp_alpha}</span>
                </div>
                <div className="key-value-row">
                  <span className="key">EVP Altered Field</span>
                  <span className="value">
                    {caseData.evp.evp_or_guardrail_changed_field ? "Yes" : "No"}
                  </span>
                </div>
                <div className="key-value-row">
                  <span className="key">Kelvin Guardrail Clip</span>
                  <span className="value">
                    {caseData.evp.guardrail_clip_detected ? "Clipped" : "Nominal"}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

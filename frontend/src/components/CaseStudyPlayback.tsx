import React, { useState, useEffect } from "react";
import { CaseDetail, CaseItem } from "../types";
import { MapViewer } from "./MapViewer";
import {
  IconHistory,
  IconChevronLeft,
  IconChevronRight,
  IconShieldAlert,
  IconCheck,
} from "./Icons";

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
      <div className="neu-panel">
        <div className="neu-panel-body" style={{ textAlign: "center", padding: 40 }}>
          <p style={{ color: "var(--text-muted)", fontWeight: 600 }}>Loading historical case studies...</p>
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
      {/* 1. Case Navigator Bar */}
      <div className="neu-panel" style={{ borderTop: "3px solid var(--brand-orange)" }}>
        <div
          className="neu-panel-body"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "12px 20px",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--brand-orange)" }}>
              <IconHistory size={18} color="var(--brand-orange)" />
              <span style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Case Playback:
              </span>
            </div>
            <select
              className="control-select-input"
              value={currentIndex}
              onChange={(e) => setCurrentIndex(Number(e.target.value))}
              aria-label="Select case study"
            >
              {cases.map((c, idx) => (
                <option key={c.id} value={idx}>
                  Case {idx + 1}: {c.title} ({c.date} +{c.lead_hours}h)
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              type="button"
              className="sub-model-pill"
              onClick={handlePrev}
              style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
            >
              <IconChevronLeft size={14} />
              <span>Previous</span>
            </button>
            <span
              style={{
                fontSize: 12,
                fontWeight: 800,
                fontFamily: "var(--font-mono)",
                color: "var(--text-secondary)",
                minWidth: 60,
                textAlign: "center",
              }}
            >
              {currentIndex + 1} / {cases.length}
            </span>
            <button
              type="button"
              className="sub-model-pill"
              onClick={handleNext}
              style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
            >
              <span>Next</span>
              <IconChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Case Synoptic Narrative & Significance */}
      {currentCase && (
        <div className="neu-panel" style={{ borderLeft: "5px solid var(--brand-orange)" }}>
          <div className="neu-panel-body" style={{ padding: "16px 20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, flexWrap: "wrap", gap: 8 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: "var(--text-primary)" }}>
                {currentCase.title}
              </h3>
              <span
                style={{
                  fontSize: 11,
                  fontFamily: "var(--font-mono)",
                  fontWeight: 800,
                  color: "var(--brand-orange)",
                  backgroundColor: "var(--brand-orange-soft)",
                  padding: "3px 8px",
                  borderRadius: "var(--radius-xs)",
                  border: "1px solid var(--border-orange)",
                }}
              >
                Init: {currentCase.init} • +{currentCase.lead_hours}h Lead
              </span>
            </div>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: 6 }}>
              <strong>Operational Significance:</strong> {currentCase.reason}
            </p>
            {caseData?.narrative && (
              <p style={{ fontSize: 12, color: "var(--text-muted)", fontStyle: "italic", lineHeight: 1.5 }}>
                {caseData.narrative}
              </p>
            )}
          </div>
        </div>
      )}

      {/* 3. Synchronized Step Sequence Scrubber */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>
          Playback Stage:
        </span>
        {stepsList.map((step) => {
          const isActive = activeStepId === step.id;
          return (
            <button
              key={step.id}
              type="button"
              className={`sub-model-pill ${isActive ? "active" : ""}`}
              style={{ fontSize: 11, padding: "5px 11px" }}
              onClick={() => setActiveStepId(step.id)}
            >
              {step.label}
            </button>
          );
        })}
      </div>

      {/* 4. Split Grid: Map + Incident Verification Scores */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 400px", gap: 20 }}>
        {/* Map */}
        <MapViewer
          grid={displayGrid}
          activeModelKey={activeStepId}
          setActiveModelKey={setActiveStepId}
          title={displayTitle}
          selectedCell={selectedCell}
          onSelectCell={onSelectCell}
          height={640}
          showModeBar={false}
        />

        {/* Right Incident Scores Panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {caseData?.metrics && (
            <div className="neu-panel" style={{ borderTop: "3px solid var(--brand-orange)" }}>
              <div className="neu-panel-header">
                <div className="neu-panel-title">
                  <span>Incident Verification Scores</span>
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
                        <th>ACC</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(caseData.metrics).map(([name, m]) => {
                        const isAura = name.includes("AURA");
                        return (
                          <tr key={name} className={isAura ? "highlight-consensus-row" : ""}>
                            <td style={{ fontWeight: isAura ? 800 : 600, color: isAura ? "var(--brand-orange)" : "inherit" }}>
                              {name}
                            </td>
                            <td style={{ fontFamily: "var(--font-mono)", fontWeight: 700 }}>{m.RMSE_C.toFixed(3)}</td>
                            <td style={{ fontFamily: "var(--font-mono)" }}>{m.MAE_C.toFixed(3)}</td>
                            <td style={{ fontFamily: "var(--font-mono)" }}>{m.ACC.toFixed(4)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {caseData?.evp && (
            <div className="neu-panel">
              <div className="neu-panel-header">
                <div className="neu-panel-title">
                  <IconShieldAlert size={15} color="var(--brand-orange)" />
                  <span>EVP & Physical Guardrail Status</span>
                </div>
              </div>
              <div className="neu-panel-body">
                <div className="spec-kv-row">
                  <span className="spec-kv-key">EVP Alpha Parameter</span>
                  <span className="spec-kv-val">{caseData.evp.evp_alpha}</span>
                </div>
                <div className="spec-kv-row">
                  <span className="spec-kv-key">Upper Tail Modulated</span>
                  <span className="spec-kv-val" style={{ color: caseData.evp.evp_or_guardrail_changed_field ? "var(--brand-orange)" : "inherit" }}>
                    {caseData.evp.evp_or_guardrail_changed_field ? "Yes (Tail Preserved)" : "No (Within Bounds)"}
                  </span>
                </div>
                <div className="spec-kv-row">
                  <span className="spec-kv-key">Kelvin Guardrail Clip</span>
                  <span className="spec-kv-val">
                    {caseData.evp.guardrail_clip_detected ? "Clipped" : "Physical Nominal"}
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

export default CaseStudyPlayback;

import React, { useState, useEffect } from "react";
import { Header } from "./components/Header";
import { ControlBar } from "./components/ControlBar";
import { MapViewer, MapMode } from "./components/MapViewer";
import { SelectedLocationPanel } from "./components/SelectedLocationPanel";
import { WhyAuraBlend } from "./components/WhyAuraBlend";
import { ModelComparison } from "./components/ModelComparison";
import { CaseStudyPlayback } from "./components/CaseStudyPlayback";
import { ExtremeEventPanel } from "./components/ExtremeEventPanel";
import { ProcessingPipeline } from "./components/ProcessingPipeline";
import {
  CaseItem,
  ComparisonResponse,
  ForecastResponse,
  ModelInfo,
  WeightsResponse,
} from "./types";

const API_BASE = "";

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState("operations");

  // 5 Primary Map Modes (Section 3 of Specification)
  const [mapMode, setMapMode] = useState<MapMode>("FORECAST");
  const [subModelKey, setSubModelKey] = useState<string>("aura");

  // Date and Lead controls
  const [dates, setDates] = useState<Array<{ date: string; leads: number[] }>>([]);
  const [selectedDate, setSelectedDate] = useState<string>("2020-01-01");
  const [leads, setLeads] = useState<number[]>([24, 48, 72, 120]);
  const [selectedLead, setSelectedLead] = useState<number>(24);

  // Missing source input health
  const [missingHres, setMissingHres] = useState(false);
  const [missingGraphCast, setMissingGraphCast] = useState(false);
  const [missingPangu, setMissingPangu] = useState(false);

  // Selected Location Grid Cell (Default: New Delhi region ~28.5N, 77.2E)
  const [selectedCell, setSelectedCell] = useState<{
    r: number;
    c: number;
    lat: number;
    lon: number;
    val: number | null;
  } | null>({
    r: 6,
    c: 5,
    lat: 28.5,
    lon: 76.5,
    val: 22.4,
  });

  // Data endpoints
  const [forecast, setForecast] = useState<ForecastResponse | null>(null);
  const [weightsData, setWeightsData] = useState<WeightsResponse | null>(null);
  const [comparisonData, setComparisonData] = useState<ComparisonResponse | null>(null);
  const [casesList, setCasesList] = useState<CaseItem[]>([]);
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null);
  const [ablations, setAblations] = useState<any[]>([]);

  // 1. Initial metadata loading
  useEffect(() => {
    fetch(`${API_BASE}/api/forecast/dates`)
      .then((r) => r.json())
      .then((data) => {
        if (data.dates && data.dates.length > 0) {
          setDates(data.dates);
          setSelectedDate(data.dates[0].date);
          if (data.dates[0].leads && data.dates[0].leads.length > 0) {
            setLeads(data.dates[0].leads);
            setSelectedLead(data.dates[0].leads[0]);
          }
        }
      })
      .catch((err) => console.error("Failed to load dates", err));

    fetch(`${API_BASE}/api/cases`)
      .then((r) => r.json())
      .then((data) => setCasesList(data.cases || []))
      .catch((err) => console.error("Failed to load cases", err));

    fetch(`${API_BASE}/api/model/info`)
      .then((r) => r.json())
      .then((data) => setModelInfo(data))
      .catch((err) => console.error("Failed to load model info", err));

    fetch(`${API_BASE}/api/metrics/ablations`)
      .then((r) => r.json())
      .then((data) => setAblations(data.rows || []))
      .catch((err) => console.error("Failed to load ablations", err));
  }, []);

  // Update available leads when date changes
  useEffect(() => {
    const match = dates.find((d) => d.date === selectedDate);
    if (match && match.leads.length > 0) {
      setLeads(match.leads);
      if (!match.leads.includes(selectedLead)) {
        setSelectedLead(match.leads[0]);
      }
    }
  }, [selectedDate, dates]);

  // 2. Fetch forecast on date/lead/model/health change
  useEffect(() => {
    if (!selectedDate || !selectedLead) return;

    const url = new URL(`${window.location.origin}/api/forecast`);
    url.searchParams.set("date", selectedDate);
    url.searchParams.set("lead", String(selectedLead));
    url.searchParams.set("model", subModelKey);
    url.searchParams.set("missing_hres", missingHres ? "1" : "0");
    url.searchParams.set("missing_graphcast", missingGraphCast ? "1" : "0");
    url.searchParams.set("missing_pangu", missingPangu ? "1" : "0");

    fetch(url.toString())
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP error ${r.status}`);
        return r.json();
      })
      .then((data: ForecastResponse) => setForecast(data))
      .catch((err) => console.error("Failed to fetch forecast", err));
  }, [selectedDate, selectedLead, subModelKey, missingHres, missingGraphCast, missingPangu]);

  // 3. Fetch weights
  useEffect(() => {
    if (!selectedDate || !selectedLead) return;
    fetch(`${API_BASE}/api/forecast/weights?date=${selectedDate}&lead=${selectedLead}`)
      .then((r) => r.json())
      .then((data: WeightsResponse) => setWeightsData(data))
      .catch((err) => console.error("Failed to load weights", err));
  }, [selectedDate, selectedLead]);

  // 4. Fetch comparison
  useEffect(() => {
    if (!selectedDate || !selectedLead) return;
    fetch(`${API_BASE}/api/forecast/comparison?date=${selectedDate}&lead=${selectedLead}`)
      .then((r) => r.json())
      .then((data: ComparisonResponse) => setComparisonData(data))
      .catch((err) => console.error("Failed to load comparison", err));
  }, [selectedDate, selectedLead]);

  // Point inspector values from comparison
  const candidatePointValues: Record<string, number | null> = {};
  let pointSpread: number | null = null;
  let consensusPointVal: number | null = null;

  if (selectedCell && comparisonData?.maps) {
    const { r, c } = selectedCell;
    for (const name of ["HRES", "GraphCast", "Pangu", "Arithmetic Mean", "AURA-BLEND", "truth"]) {
      if (comparisonData.maps[name]?.values?.[r]) {
        candidatePointValues[name] = comparisonData.maps[name].values[r][c];
      }
    }
    if (comparisonData.maps["disagreement"]?.values?.[r]) {
      pointSpread = comparisonData.maps["disagreement"].values[r][c];
    }
    if (comparisonData.maps["AURA-BLEND"]?.values?.[r]) {
      consensusPointVal = comparisonData.maps["AURA-BLEND"].values[r][c];
    }
  }

  // Selected cell weights
  const cellWeights: Record<string, number> = {};
  if (selectedCell && weightsData?.weights) {
    const { r, c } = selectedCell;
    for (const name of ["HRES", "GraphCast", "Pangu"]) {
      if (weightsData.weights[name]?.values?.[r]) {
        cellWeights[name] = Number(weightsData.weights[name].values[r][c] ?? 0);
      }
    }
  }

  // Calculate difference statistics for DIFFERENCE mode
  let diffStats = undefined;
  if (mapMode === "DIFFERENCE" && forecast?.grid) {
    const minDiff = forecast.grid.min;
    const maxDiff = forecast.grid.max;
    const cellVal = selectedCell && forecast.grid.values[selectedCell.r]
      ? forecast.grid.values[selectedCell.r][selectedCell.c]
      : null;
    diffStats = {
      min: minDiff,
      max: maxDiff,
      selectedVal: cellVal,
    };
  }

  return (
    <div className="dashboard-root">
      {/* Header */}
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Global Synchronized Controls */}
      <ControlBar
        dates={dates}
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        leads={leads}
        selectedLead={selectedLead}
        setSelectedLead={setSelectedLead}
        missingHres={missingHres}
        setMissingHres={setMissingHres}
        missingGraphCast={missingGraphCast}
        setMissingGraphCast={setMissingGraphCast}
        missingPangu={missingPangu}
        setMissingPangu={setMissingPangu}
      />

      {/* Main Content Areas */}
      <main className={`main-content ${activeTab !== "operations" ? "full-width" : ""}`}>
        {activeTab === "operations" && (
          <>
            {/* CENTRAL PRIMARY INDIA MAP */}
            <MapViewer
              grid={forecast?.grid || null}
              mapMode={mapMode}
              setMapMode={setMapMode}
              subModelKey={subModelKey}
              setSubModelKey={setSubModelKey}
              title={`India Operational Forecast • ${forecast?.model || "AURA-BLEND"} (+${selectedLead}h)`}
              selectedCell={selectedCell}
              onSelectCell={setSelectedCell}
              height={700}
              selectedCellWeights={cellWeights}
              selectedCellConsensusVal={consensusPointVal}
              diffStats={diffStats}
            />

            {/* RIGHT SIDEBAR: SELECTED LOCATION & TELEMETRY */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Selected Location / Grid Cell Panel (Section 4 of Request) */}
              <SelectedLocationPanel
                selectedCell={selectedCell}
                candidateValues={candidatePointValues}
                weights={cellWeights}
                metricsRows={comparisonData?.locked_test_metrics || []}
                evpStatus={forecast?.evp || null}
                inputHealthStatus={forecast?.input_health?.status || (missingHres || missingGraphCast || missingPangu ? "DEGRADED INPUT" : "FULL INPUT")}
                leadHours={selectedLead}
                initTime={forecast?.init || "2020-01-01T00:00:00Z"}
              />

              {/* Extreme Event Guidance Panel */}
              <ExtremeEventPanel
                evp={forecast?.evp || null}
                grid={forecast?.grid || null}
                selectedCell={selectedCell}
                interModelSpread={pointSpread}
              />
            </div>
          </>
        )}

        {activeTab === "why-aura" && (
          <WhyAuraBlend
            weightsData={weightsData}
            selectedCell={selectedCell}
            onSelectCell={setSelectedCell}
            candidateValues={candidatePointValues}
            consensusVal={consensusPointVal ?? undefined}
          />
        )}

        {activeTab === "comparison" && (
          <ModelComparison
            comparisonData={comparisonData}
            ablationsData={ablations}
            selectedCell={selectedCell}
            onSelectCell={setSelectedCell}
          />
        )}

        {activeTab === "cases" && (
          <CaseStudyPlayback
            cases={casesList}
            selectedCell={selectedCell}
            onSelectCell={setSelectedCell}
            apiBaseUrl={API_BASE}
          />
        )}

        {activeTab === "pipeline" && (
          <ProcessingPipeline modelInfo={modelInfo} />
        )}
      </main>
    </div>
  );
};

export default App;

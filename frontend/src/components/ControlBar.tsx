import React from "react";
import {
  IconCalendar,
  IconClock,
  IconActivity,
  IconCheck,
  IconX,
  IconCompass,
  IconShieldAlert,
} from "./Icons";

interface ControlBarProps {
  dates: Array<{ date: string; leads: number[] }>;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  leads: number[];
  selectedLead: number;
  setSelectedLead: (lead: number) => void;
  missingHres: boolean;
  setMissingHres: (missing: boolean) => void;
  missingGraphCast: boolean;
  setMissingGraphCast: (missing: boolean) => void;
  missingPangu: boolean;
  setMissingPangu: (missing: boolean) => void;
  regimeInfo?: string;
  onSelectCity?: (city: { name: string; lat: number; lon: number }) => void;
  selectedCityName?: string;
}

const INDIAN_QUICK_CITIES = [
  { name: "New Delhi", lat: 28.6139, lon: 77.2090 },
  { name: "Mumbai", lat: 19.0760, lon: 72.8777 },
  { name: "Bengaluru", lat: 12.9716, lon: 77.5946 },
  { name: "Kolkata", lat: 22.5726, lon: 88.3639 },
  { name: "Chennai", lat: 13.0827, lon: 80.2707 },
  { name: "Ahmedabad", lat: 23.0225, lon: 72.5714 },
  { name: "Hyderabad", lat: 17.3850, lon: 78.4867 },
  { name: "Guwahati", lat: 26.1445, lon: 91.7362 },
  { name: "Srinagar", lat: 34.0837, lon: 74.7973 },
  { name: "Nagpur", lat: 21.1458, lon: 79.0882 },
];

export const ControlBar: React.FC<ControlBarProps> = ({
  dates,
  selectedDate,
  setSelectedDate,
  leads,
  selectedLead,
  setSelectedLead,
  missingHres,
  setMissingHres,
  missingGraphCast,
  setMissingGraphCast,
  missingPangu,
  setMissingPangu,
  regimeInfo = "Z500 Monsoonal Trough / T850 Thermal Gradient / MSLP Depressions",
  onSelectCity,
  selectedCityName,
}) => {
  const isDegraded = missingHres || missingGraphCast || missingPangu;

  return (
    <div className="aura-control-bar">
      <div className="aura-control-inner">
        {/* Top Control Horizon Row */}
        <div className="control-primary-row">
          <div className="control-inputs-cluster">
            {/* Initialization Date */}
            <div className="control-field-block">
              <label className="control-field-label">
                <IconCalendar size={13} color="var(--brand-orange)" />
                <span>Initialization Date</span>
              </label>
              <select
                className="control-select-input"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                aria-label="Select initialization date"
              >
                {dates.map((d) => (
                  <option key={d.date} value={d.date}>
                    {d.date} (00:00 UTC)
                  </option>
                ))}
              </select>
            </div>

            {/* Lead Time Horizon Scrubber */}
            <div className="control-field-block">
              <label className="control-field-label">
                <IconClock size={13} color="var(--brand-orange)" />
                <span>Forecast Lead Horizon</span>
              </label>
              <div className="lead-scrubber-track" role="radiogroup" aria-label="Forecast Lead Horizon">
                {leads.map((l) => {
                  const isActive = selectedLead === l;
                  return (
                    <button
                      key={l}
                      type="button"
                      className={`lead-chip-btn ${isActive ? "active" : ""}`}
                      onClick={() => setSelectedLead(l)}
                      aria-checked={isActive}
                      role="radio"
                    >
                      +{l}h ({l / 24}D)
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Target Meteorological Variable */}
            <div className="control-field-block">
              <label className="control-field-label">
                <IconActivity size={13} color="var(--meteo-blue)" />
                <span>Target Field</span>
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: 6, height: 32 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
                  2m Temperature (T2M)
                </span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    backgroundColor: "var(--bg-surface-inset)",
                    color: "var(--text-muted)",
                    padding: "2px 6px",
                    borderRadius: "var(--radius-xs)",
                    border: "1px solid var(--border-subtle)",
                    textTransform: "uppercase",
                  }}
                >
                  Locked
                </span>
              </div>
            </div>

            {/* Synoptic Regime Context */}
            <div className="control-field-block" style={{ maxWidth: 300 }}>
              <label className="control-field-label">
                <IconCompass size={13} color="var(--text-muted)" />
                <span>Synoptic Regime Context</span>
              </label>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--text-secondary)",
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  height: 32,
                  display: "flex",
                  alignItems: "center",
                }}
                title={regimeInfo}
              >
                {regimeInfo}
              </div>
            </div>
          </div>

          {/* Feed Health Switchboard */}
          <div className="feed-switchboard">
            <div style={{ display: "flex", flexDirection: "column", gap: 1, marginRight: 4 }}>
              <span style={{ fontSize: 9, fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>
                Feed Health
              </span>
              <span className={`feed-status-tag ${isDegraded ? "degraded" : "full"}`}>
                {isDegraded ? "Degraded Renorm" : "Full Input"}
              </span>
            </div>

            <button
              type="button"
              className={`feed-toggle-pill ${!missingHres ? "nominal" : "outage"}`}
              onClick={() => setMissingHres(!missingHres)}
              title="Click to toggle ECMWF HRES feed availability"
            >
              {!missingHres ? <IconCheck size={12} color="var(--status-green)" /> : <IconX size={12} color="var(--status-red)" />}
              <span>HRES</span>
            </button>

            <button
              type="button"
              className={`feed-toggle-pill ${!missingGraphCast ? "nominal" : "outage"}`}
              onClick={() => setMissingGraphCast(!missingGraphCast)}
              title="Click to toggle DeepMind GraphCast feed availability"
            >
              {!missingGraphCast ? <IconCheck size={12} color="var(--status-green)" /> : <IconX size={12} color="var(--status-red)" />}
              <span>GraphCast</span>
            </button>

            <button
              type="button"
              className={`feed-toggle-pill ${!missingPangu ? "nominal" : "outage"}`}
              onClick={() => setMissingPangu(!missingPangu)}
              title="Click to toggle Huawei Pangu feed availability"
            >
              {!missingPangu ? <IconCheck size={12} color="var(--status-green)" /> : <IconX size={12} color="var(--status-red)" />}
              <span>Pangu</span>
            </button>
          </div>
        </div>

        {/* Quick City Jump Bar */}
        {onSelectCity && (
          <div className="city-quick-jump-bar">
            <span className="city-jump-label">
              <IconCompass size={11} color="var(--brand-orange)" />
              <span>Inspect City:</span>
            </span>
            {INDIAN_QUICK_CITIES.map((c) => {
              const isSelected = selectedCityName === c.name;
              return (
                <button
                  key={c.name}
                  type="button"
                  className={`city-chip ${isSelected ? "active" : ""}`}
                  onClick={() => onSelectCity(c)}
                >
                  {c.name}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ControlBar;

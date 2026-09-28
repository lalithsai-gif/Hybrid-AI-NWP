import React from "react";

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
}

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
}) => {
  const isDegraded = missingHres || missingGraphCast || missingPangu;

  return (
    <div className="control-bar">
      <div className="controls-group">
        <div className="control-item">
          <label className="control-label">Initialization Date</label>
          <select
            className="control-select"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          >
            {dates.map((d) => (
              <option key={d.date} value={d.date}>
                {d.date} (UTC)
              </option>
            ))}
          </select>
        </div>

        <div className="control-item">
          <label className="control-label">Lead Time (Hours)</label>
          <select
            className="control-select"
            value={selectedLead}
            onChange={(e) => setSelectedLead(Number(e.target.value))}
          >
            {leads.map((l) => (
              <option key={l} value={l}>
                +{l}h ({l / 24} Day{l > 24 ? "s" : ""})
              </option>
            ))}
          </select>
        </div>

        <div className="control-item">
          <label className="control-label">Variable</label>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
              2m Temperature (T2M)
            </span>
            <span style={{ fontSize: 10, backgroundColor: "#f3f4f6", padding: "2px 6px", borderRadius: 3, color: "var(--text-muted)", border: "1px solid #e5e7eb" }}>
              LOCKED BENCHMARK
            </span>
          </div>
        </div>

        <div className="control-item">
          <label className="control-label">Synoptic Regime Context</label>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 500, maxWidth: 320, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={regimeInfo}>
            {regimeInfo}
          </div>
        </div>
      </div>

      {/* Input Health Toggles */}
      <div className="feed-health-group">
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
            Input Health
          </span>
          <span className={`health-status-badge ${isDegraded ? "degraded" : "full"}`}>
            {isDegraded ? "Degraded Input" : "Full Input"}
          </span>
        </div>

        <button
          type="button"
          className={`feed-toggle ${!missingHres ? "available" : "unavailable"}`}
          onClick={() => setMissingHres(!missingHres)}
          title="Click to toggle HRES feed availability"
        >
          <span>{!missingHres ? "✓" : "✗"}</span> HRES
        </button>

        <button
          type="button"
          className={`feed-toggle ${!missingGraphCast ? "available" : "unavailable"}`}
          onClick={() => setMissingGraphCast(!missingGraphCast)}
          title="Click to toggle GraphCast feed availability"
        >
          <span>{!missingGraphCast ? "✓" : "✗"}</span> GraphCast
        </button>

        <button
          type="button"
          className={`feed-toggle ${!missingPangu ? "available" : "unavailable"}`}
          onClick={() => setMissingPangu(!missingPangu)}
          title="Click to toggle Pangu-Weather feed availability"
        >
          <span>{!missingPangu ? "✓" : "✗"}</span> Pangu
        </button>
      </div>
    </div>
  );
};

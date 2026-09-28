import React from "react";

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  systemTitle?: string;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab, systemTitle = "AURA-BLEND" }) => {
  const tabs = [
    { id: "operations", label: "Forecast Operations (Central Map)" },
    { id: "why-aura", label: "Why AURA-BLEND?" },
    { id: "comparison", label: "Model Comparison & Metrics" },
    { id: "cases", label: "Case Study Playback" },
    { id: "pipeline", label: "Processing Pipeline" },
  ];

  return (
    <header className="ops-header">
      <div className="brand-section">
        <div className="brand-mark">{systemTitle}</div>
        <div className="brand-titles">
          <h1>Adaptive Weather Forecast Decision Support</h1>
          <p>Operational Indian Meteorology System • SIH 2026</p>
        </div>
        <div className="header-status-badge">
          <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", backgroundColor: "var(--primary-gold)" }}></span>
          HISTORICAL BENCHMARK DEMO
        </div>
      </div>

      <nav className="nav-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`nav-tab-btn ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </header>
  );
};

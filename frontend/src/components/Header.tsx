import React, { useState, useEffect } from "react";
import {
  IconMap,
  IconSparkles,
  IconBarChart,
  IconHistory,
  IconCpu,
  IconClock,
  IconActivity,
} from "./Icons";

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  systemTitle?: string;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  systemTitle = "AURA-BLEND",
}) => {
  const [timeStr, setTimeStr] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const utc = now.toISOString().substring(11, 19) + " UTC";
      setTimeStr(utc);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const tabs = [
    {
      id: "operations",
      label: "Forecast Operations",
      sublabel: "Central Map",
      icon: <IconMap size={16} />,
    },
    {
      id: "why-aura",
      label: "Spatial Trust",
      sublabel: "Why AURA?",
      icon: <IconSparkles size={16} />,
    },
    {
      id: "comparison",
      label: "Model Benchmark",
      sublabel: "Verification",
      icon: <IconBarChart size={16} />,
    },
    {
      id: "cases",
      label: "Case Studies",
      sublabel: "Incident Playback",
      icon: <IconHistory size={16} />,
    },
    {
      id: "pipeline",
      label: "Processing Pipeline",
      sublabel: "SDW-Net Core",
      icon: <IconCpu size={16} />,
    },
  ];

  return (
    <header className="aura-header">
      <div className="aura-header-inner">
        {/* Brand Cluster */}
        <div className="aura-brand-cluster">
          <div className="brand-symbol-badge">
            <span>{systemTitle}</span>
          </div>
          <div className="brand-meta-titles">
            <div className="brand-system-name">
              <span>Adaptive NWP Decision Support</span>
              <span className="brand-system-badge">SIH 81</span>
            </div>
            <span className="brand-subtitle">
              WeatherBench 2 Benchmark • Ministry of Earth Sciences / IMD
            </span>
          </div>
        </div>

        {/* Central Segmented Navigation */}
        <nav className="aura-nav-track" aria-label="Main Navigation">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                className={`aura-nav-pill ${isActive ? "active" : ""}`}
                onClick={() => setActiveTab(tab.id)}
                title={tab.label}
              >
                {React.cloneElement(tab.icon, {
                  color: isActive ? "var(--brand-orange)" : "var(--text-secondary)",
                })}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right Status & Telemetry Indicators */}
        <div className="aura-header-telemetry">
          <div className="pulse-status-chip" title="Live operational benchmark feed nominal">
            <span className="pulse-dot"></span>
            <span>Live Benchmark</span>
          </div>

          <div className="header-clock-pill" title="Synchronized UTC Clock">
            <IconClock size={13} color="var(--text-muted)" />
            <span>{timeStr || "00:00:00 UTC"}</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;

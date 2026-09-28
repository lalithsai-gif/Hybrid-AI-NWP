import React, { useState, useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { GridPayload } from "../types";

export type MapMode = "FORECAST" | "CONTRIBUTION" | "DIFFERENCE" | "EXTREME_EVENT" | "VERIFICATION";

export type BaseMapStyle = "roadmap" | "satellite" | "terrain" | "osm";

interface MapViewerProps {
  grid: GridPayload | null;
  mapMode?: MapMode;
  setMapMode?: (mode: MapMode) => void;
  subModelKey?: string;
  setSubModelKey?: (key: string) => void;
  activeModelKey?: string;
  setActiveModelKey?: (key: string) => void;
  title: string;
  selectedCell: { r: number; c: number; lat: number; lon: number; val: number | null } | null;
  onSelectCell: (cell: { r: number; c: number; lat: number; lon: number; val: number | null }) => void;
  height?: number;
  showModeBar?: boolean;
  selectedCellWeights?: Record<string, number>;
  selectedCellConsensusVal?: number | null;
  diffStats?: { min: number; max: number; selectedVal: number | null };
}

// Major Indian meteorological stations / reference cities
const INDIAN_CITIES = [
  { name: "New Delhi", lat: 28.6139, lon: 77.2090 },
  { name: "Mumbai", lat: 19.0760, lon: 72.8777 },
  { name: "Kolkata", lat: 22.5726, lon: 88.3639 },
  { name: "Chennai", lat: 13.0827, lon: 80.2707 },
  { name: "Bengaluru", lat: 12.9716, lon: 77.5946 },
  { name: "Hyderabad", lat: 17.3850, lon: 78.4867 },
  { name: "Ahmedabad", lat: 23.0225, lon: 72.5714 },
  { name: "Guwahati", lat: 26.1445, lon: 91.7362 },
  { name: "Srinagar", lat: 34.0837, lon: 74.7973 },
  { name: "Nagpur", lat: 21.1458, lon: 79.0882 },
];

const BASE_MAPS: Record<BaseMapStyle, { name: string; url: string; options: L.TileLayerOptions }> = {
  roadmap: {
    name: "Google Map",
    url: "https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}",
    options: {
      maxZoom: 20,
      attribution: '&copy; Google Maps',
      subdomains: ["mt0", "mt1", "mt2", "mt3"],
    },
  },
  satellite: {
    name: "Satellite",
    url: "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
    options: {
      maxZoom: 20,
      attribution: '&copy; Google Maps Satellite',
      subdomains: ["mt0", "mt1", "mt2", "mt3"],
    },
  },
  terrain: {
    name: "Terrain",
    url: "https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}",
    options: {
      maxZoom: 20,
      attribution: '&copy; Google Maps Terrain',
      subdomains: ["mt0", "mt1", "mt2", "mt3"],
    },
  },
  osm: {
    name: "OSM",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    options: {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    },
  },
};

// Color mapping functions
function getTemperatureColor(val: number): string {
  // Domain 2m temp range in India approx 0C to 45C
  const min = 0;
  const max = 45;
  const t = Math.max(0, Math.min(1, (val - min) / (max - min)));

  if (t < 0.15) return "#1e3a8a"; // deep blue
  if (t < 0.3) return "#0284c7"; // cyan/blue
  if (t < 0.45) return "#059669"; // emerald green
  if (t < 0.6) return "#facc15"; // yellow
  if (t < 0.75) return "#f97316"; // orange
  if (t < 0.9) return "#ef4444"; // red
  return "#7f1d1d"; // deep crimson
}

function getDifferenceColor(val: number): string {
  // Diverging range: -3.0C to +3.0C centered at 0
  const maxAbs = 3.0;
  const clamped = Math.max(-maxAbs, Math.min(maxAbs, val));
  const t = clamped / maxAbs; // -1.0 to +1.0

  if (t < -0.6) return "#1d4ed8";
  if (t < -0.2) return "#60a5fa";
  if (t < -0.05) return "#bfdbfe";
  if (t <= 0.05) return "#f8fafc"; // near zero: neutral light
  if (t <= 0.2) return "#fecaca";
  if (t <= 0.6) return "#f87171";
  return "#b91c1c";
}

function getWeightColor(val: number): string {
  // Fraction 0.0 to 1.0 or Percentage 0 to 100
  const fraction = val > 1.0 ? val / 100.0 : val;
  const t = Math.max(0, Math.min(1, fraction));
  if (t < 0.15) return "#fefce8";
  if (t < 0.3) return "#fef08a";
  if (t < 0.45) return "#fde047";
  if (t < 0.6) return "#eab308";
  if (t < 0.75) return "#ca8a04";
  return "#78350f";
}

function getVerificationErrorColor(val: number): string {
  // Absolute Error in degC (0.0 to 3.0)
  const t = Math.max(0, Math.min(1, val / 3.0));
  if (t < 0.2) return "#15803d"; // low error (green)
  if (t < 0.4) return "#84cc16"; // modest error
  if (t < 0.6) return "#eab308"; // moderate error
  if (t < 0.8) return "#f97316"; // high error
  return "#dc2626"; // severe error (red)
}

function getCellFillColor(val: number | null, mode: MapMode, units: string): string {
  if (val === null || !Number.isFinite(val)) return "#cbd5e1";

  if (mode === "CONTRIBUTION" || units.includes("contribution") || units.includes("fraction")) {
    return getWeightColor(val);
  }
  if (mode === "DIFFERENCE" || units.includes("difference")) {
    return getDifferenceColor(val);
  }
  if (mode === "VERIFICATION" || units.includes("error")) {
    return getVerificationErrorColor(val);
  }
  if (mode === "EXTREME_EVENT") {
    if (val >= 42.0) return "#7f1d1d";
    if (val >= 38.0) return "#dc2626";
    if (val >= 32.0) return "#f97316";
    return "#fed7aa";
  }
  return getTemperatureColor(val);
}

export const MapViewer: React.FC<MapViewerProps> = ({
  grid,
  mapMode = "FORECAST",
  setMapMode,
  subModelKey,
  setSubModelKey,
  activeModelKey,
  setActiveModelKey,
  title: _title,
  selectedCell,
  onSelectCell,
  height = 700,
  showModeBar = true,
  selectedCellWeights,
  selectedCellConsensusVal,
  diffStats,
}) => {
  const currentMode = mapMode || "FORECAST";
  const currentSubKey = subModelKey || activeModelKey || "aura";
  const handleSetSubKey = (k: string) => {
    if (setSubModelKey) setSubModelKey(k);
    if (setActiveModelKey) setActiveModelKey(k);
  };

  const [hoveredCell, setHoveredCell] = useState<{
    r: number;
    c: number;
    lat: number;
    lon: number;
    val: number | null;
  } | null>(null);

  const [baseMapStyle, setBaseMapStyle] = useState<BaseMapStyle>("roadmap");
  const [layerOpacity, setLayerOpacity] = useState<number>(0.65);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const baseTileLayerRef = useRef<L.TileLayer | null>(null);
  const gridLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const citiesLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const targetLayerGroupRef = useRef<L.LayerGroup | null>(null);

  // Initialize Leaflet Map on Mount
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (leafletMapRef.current) return;

    // Center on India [22.5 N, 80.0 E], Zoom 5
    const map = L.map(mapContainerRef.current, {
      center: [22.5, 80.0],
      zoom: 5,
      minZoom: 4,
      maxZoom: 14,
      zoomControl: false,
    });

    leafletMapRef.current = map;

    // Create custom panes for meteorological layers to always render on top of tiles
    const gridPane = map.createPane("meteorologicalGridPane");
    gridPane.style.zIndex = "450";

    const citiesPane = map.createPane("meteorologicalCitiesPane");
    citiesPane.style.zIndex = "550";

    const targetPane = map.createPane("meteorologicalTargetPane");
    targetPane.style.zIndex = "600";

    // Initial Base Tile Layer
    const baseConfig = BASE_MAPS[baseMapStyle];
    const tileLayer = L.tileLayer(baseConfig.url, baseConfig.options).addTo(map);
    baseTileLayerRef.current = tileLayer;

    // Feature Layer Groups
    gridLayerGroupRef.current = L.layerGroup().addTo(map);
    citiesLayerGroupRef.current = L.layerGroup().addTo(map);
    targetLayerGroupRef.current = L.layerGroup().addTo(map);

    // Initial India bounds fit
    map.fitBounds([
      [6.0, 68.0],
      [38.5, 98.5],
    ]);

    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      clearTimeout(timer);
      map.remove();
      leafletMapRef.current = null;
      baseTileLayerRef.current = null;
      gridLayerGroupRef.current = null;
      citiesLayerGroupRef.current = null;
      targetLayerGroupRef.current = null;
    };
  }, []);

  // Update Base Tile Layer when style changes
  useEffect(() => {
    const map = leafletMapRef.current;
    if (!map) return;

    if (baseTileLayerRef.current) {
      map.removeLayer(baseTileLayerRef.current);
    }

    const baseConfig = BASE_MAPS[baseMapStyle];
    const newTile = L.tileLayer(baseConfig.url, baseConfig.options).addTo(map);
    baseTileLayerRef.current = newTile;
  }, [baseMapStyle]);

  // Redraw Meteorological 2D Grid Cells on map
  useEffect(() => {
    const group = gridLayerGroupRef.current;
    if (!group || !grid || !grid.values || grid.values.length === 0) return;

    group.clearLayers();

    const rows = grid.values.length;
    const cols = grid.values[0].length;
    const isFractionOrPct = currentMode === "CONTRIBUTION" || grid.units.includes("contribution") || grid.units.includes("fraction");
    const isDiff = currentMode === "DIFFERENCE" || grid.units.includes("difference");

    const halfLat = rows > 1 ? Math.abs(grid.latitudes[1] - grid.latitudes[0]) / 2 : 0.8;
    const halfLon = cols > 1 ? Math.abs(grid.longitudes[1] - grid.longitudes[0]) / 2 : 0.8;

    for (let r = 0; r < rows; r++) {
      const lat = grid.latitudes[r];
      const rowVals = grid.values[r];

      for (let c = 0; c < cols; c++) {
        const lon = grid.longitudes[c];
        const val = rowVals[c];

        const isSelected = selectedCell && selectedCell.r === r && selectedCell.c === c;
        const fillColor = getCellFillColor(val, currentMode, grid.units);

        const bounds: L.LatLngBoundsLiteral = [
          [lat - halfLat, lon - halfLon],
          [lat + halfLat, lon + halfLon],
        ];

        const rect = L.rectangle(bounds, {
          pane: "meteorologicalGridPane",
          fillColor,
          fillOpacity: layerOpacity,
          color: isSelected ? "#0f172a" : "rgba(255, 255, 255, 0.35)",
          weight: isSelected ? 3 : 0.6,
          interactive: true,
        });

        // Hover tooltip for meteorologist
        const valText = val !== null && Number.isFinite(val)
          ? `${val.toFixed(2)}${isFractionOrPct ? "%" : isDiff ? "°C diff" : "°C"}`
          : "NaN";

        rect.bindTooltip(
          `<div><strong>${lat.toFixed(1)}°N, ${lon.toFixed(1)}°E</strong><br/><span>${valText}</span></div>`,
          {
            sticky: true,
            direction: "top",
            className: "leaflet-meteorological-tooltip",
          }
        );

        // Interaction handlers
        rect.on("mouseover", () => {
          rect.setStyle({
            color: "#ffffff",
            weight: 2,
            fillOpacity: Math.min(1.0, layerOpacity + 0.15),
          });
          setHoveredCell({ r, c, lat, lon, val });
        });

        rect.on("mouseout", () => {
          rect.setStyle({
            color: isSelected ? "#0f172a" : "rgba(255, 255, 255, 0.35)",
            weight: isSelected ? 3 : 0.6,
            fillOpacity: layerOpacity,
          });
          setHoveredCell(null);
        });

        rect.on("click", () => {
          onSelectCell({ r, c, lat, lon, val });
        });

        group.addLayer(rect);
      }
    }
  }, [grid, currentMode, layerOpacity, selectedCell]);

  // Major Indian Cities Markers (Clickable pin to select closest grid cell)
  useEffect(() => {
    const group = citiesLayerGroupRef.current;
    if (!group || !grid) return;

    group.clearLayers();

    INDIAN_CITIES.forEach((city) => {
      const icon = L.divIcon({
        className: "city-div-pin-container",
        html: `
          <div class="city-div-pin" title="Click to inspect ${city.name}">
            <span class="city-pin-dot"></span>
            <span class="city-pin-label">${city.name}</span>
          </div>
        `,
        iconSize: [0, 0],
        iconAnchor: [4, 10],
      });

      const marker = L.marker([city.lat, city.lon], {
        pane: "meteorologicalCitiesPane",
        icon,
        interactive: true,
      });

      marker.on("click", () => {
        // Find nearest grid cell to this city
        if (!grid.latitudes || !grid.longitudes) return;

        let bestR = 0;
        let minLatDiff = Math.abs(grid.latitudes[0] - city.lat);
        for (let r = 1; r < grid.latitudes.length; r++) {
          const diff = Math.abs(grid.latitudes[r] - city.lat);
          if (diff < minLatDiff) {
            minLatDiff = diff;
            bestR = r;
          }
        }

        let bestC = 0;
        let minLonDiff = Math.abs(grid.longitudes[0] - city.lon);
        for (let c = 1; c < grid.longitudes.length; c++) {
          const diff = Math.abs(grid.longitudes[c] - city.lon);
          if (diff < minLonDiff) {
            minLonDiff = diff;
            bestC = c;
          }
        }

        onSelectCell({
          r: bestR,
          c: bestC,
          lat: grid.latitudes[bestR],
          lon: grid.longitudes[bestC],
          val: grid.values[bestR]?.[bestC] ?? null,
        });
      });

      group.addLayer(marker);
    });
  }, [grid]);

  // Selected Location Target Crosshair Marker
  useEffect(() => {
    const group = targetLayerGroupRef.current;
    if (!group) return;

    group.clearLayers();

    if (selectedCell) {
      const targetIcon = L.divIcon({
        className: "selected-cell-target-container",
        html: `
          <div class="selected-cell-target">
            <div class="target-outer-ring"></div>
            <div class="target-center-dot"></div>
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const targetMarker = L.marker([selectedCell.lat, selectedCell.lon], {
        pane: "meteorologicalTargetPane",
        icon: targetIcon,
        interactive: false,
      });

      group.addLayer(targetMarker);
    }
  }, [selectedCell]);

  // Sub-selectors based on active Map Mode
  const renderSubControls = () => {
    if (!showModeBar) return null;

    if (currentMode === "FORECAST") {
      const models = [
        { key: "aura", label: "★ AURA-BLEND (Consensus)" },
        { key: "hres", label: "HRES (ECMWF Physics)" },
        { key: "graphcast", label: "GraphCast (DeepMind)" },
        { key: "pangu", label: "Pangu-Weather (Huawei)" },
        { key: "mean", label: "Arithmetic Mean" },
        { key: "truth", label: "ERA5 Ground Truth" },
      ];
      return (
        <div className="sub-mode-bar">
          <span className="mode-sub-label">Model Field:</span>
          {models.map((m) => (
            <button
              key={m.key}
              className={`map-mode-btn ${currentSubKey === m.key ? "active" : ""}`}
              onClick={() => handleSetSubKey(m.key)}
            >
              {m.label}
            </button>
          ))}
        </div>
      );
    }

    if (currentMode === "CONTRIBUTION") {
      const contribs = [
        { key: "weight_pangu", label: "Pangu Contribution %" },
        { key: "weight_graphcast", label: "GraphCast Contribution %" },
        { key: "weight_hres", label: "HRES Contribution %" },
      ];
      return (
        <div className="sub-mode-bar">
          <span className="mode-sub-label" style={{ color: "var(--primary-gold-dark)" }}>
            "Why AURA-BLEND trusts each model":
          </span>
          {contribs.map((m) => (
            <button
              key={m.key}
              className={`map-mode-btn ${currentSubKey === m.key ? "active" : ""}`}
              onClick={() => handleSetSubKey(m.key)}
            >
              {m.label}
            </button>
          ))}
        </div>
      );
    }

    if (currentMode === "DIFFERENCE") {
      const diffs = [
        { key: "diff_mean", label: "AURA-BLEND − Arithmetic Mean" },
        { key: "diff_hres", label: "AURA-BLEND − HRES" },
        { key: "diff_graphcast", label: "AURA-BLEND − GraphCast" },
        { key: "diff_pangu", label: "AURA-BLEND − Pangu" },
      ];
      return (
        <div className="sub-mode-bar">
          <span className="mode-sub-label">Diverging Difference:</span>
          {diffs.map((d) => (
            <button
              key={d.key}
              className={`map-mode-btn ${currentSubKey === d.key ? "active" : ""}`}
              onClick={() => handleSetSubKey(d.key)}
            >
              {d.label}
            </button>
          ))}
        </div>
      );
    }

    if (currentMode === "EXTREME_EVENT") {
      return (
        <div className="sub-mode-bar">
          <span className="mode-sub-label" style={{ color: "var(--status-amber)" }}>
            Extreme Weather Guidance Layer:
          </span>
          <span style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 500 }}>
            EVP Upper-Tail Restored Temperature Field (α = 0.75, Threshold = 1.645σ)
          </span>
        </div>
      );
    }

    if (currentMode === "VERIFICATION") {
      const verifs = [
        { key: "verification", label: "AURA-BLEND Absolute Error (|AURA − ERA5|)" },
        { key: "error_aura", label: "AURA-BLEND Bias Map (AURA − ERA5)" },
      ];
      return (
        <div className="sub-mode-bar">
          <span className="mode-sub-label">Spatial Verification:</span>
          {verifs.map((v) => (
            <button
              key={v.key}
              className={`map-mode-btn ${currentSubKey === v.key ? "active" : ""}`}
              onClick={() => handleSetSubKey(v.key)}
            >
              {v.label}
            </button>
          ))}
        </div>
      );
    }

    return null;
  };

  if (!grid || !grid.values || grid.values.length === 0) {
    return (
      <div className="sci-card" style={{ height }}>
        <div className="sci-card-body" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          <p style={{ color: "var(--text-muted)" }}>Loading India meteorological grid...</p>
        </div>
      </div>
    );
  }

  const isFractionOrPct = currentMode === "CONTRIBUTION" || grid.units.includes("contribution") || grid.units.includes("fraction");
  const isDiff = currentMode === "DIFFERENCE" || grid.units.includes("difference");
  const isVerif = currentMode === "VERIFICATION" || grid.units.includes("error");

  return (
    <div className="sci-card map-container-wrapper" style={{ height }}>
      {/* 1. Primary Map-Mode Selector Header */}
      {showModeBar && (
        <div className="primary-map-mode-header">
          <div className="map-mode-tabs-row">
            {(["FORECAST", "CONTRIBUTION", "DIFFERENCE", "EXTREME_EVENT", "VERIFICATION"] as const).map((mode) => (
              <button
                key={mode}
                className={`primary-mode-tab-btn ${currentMode === mode ? "active" : ""}`}
                onClick={() => {
                  if (setMapMode) setMapMode(mode);
                  if (mode === "FORECAST" && !["aura", "hres", "graphcast", "pangu", "mean", "truth"].includes(currentSubKey)) {
                    handleSetSubKey("aura");
                  } else if (mode === "CONTRIBUTION" && !currentSubKey.startsWith("weight_")) {
                    handleSetSubKey("weight_pangu");
                  } else if (mode === "DIFFERENCE" && !currentSubKey.startsWith("diff_")) {
                    handleSetSubKey("diff_mean");
                  } else if (mode === "EXTREME_EVENT") {
                    handleSetSubKey("extreme_guidance");
                  } else if (mode === "VERIFICATION" && !["verification", "error_aura"].includes(currentSubKey)) {
                    handleSetSubKey("verification");
                  }
                }}
              >
                {mode.replace("_", " ")}
              </button>
            ))}
          </div>

          {/* Map Controls: Base Map Switcher, Opacity, Telemetry & Zoom */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {/* Google Base Map Switcher */}
            <div className="map-baselayer-bar">
              {(Object.keys(BASE_MAPS) as BaseMapStyle[]).map((style) => (
                <button
                  key={style}
                  className={`map-baselayer-btn ${baseMapStyle === style ? "active" : ""}`}
                  onClick={() => setBaseMapStyle(style)}
                  title={`Switch to ${BASE_MAPS[style].name}`}
                >
                  {BASE_MAPS[style].name}
                </button>
              ))}
            </div>

            {/* Meteorological Layer Opacity Slider */}
            <div className="map-opacity-control" title="Adjust Meteorological Grid Opacity">
              <span>Grid: {Math.round(layerOpacity * 100)}%</span>
              <input
                type="range"
                min="0.2"
                max="0.95"
                step="0.05"
                value={layerOpacity}
                onChange={(e) => setLayerOpacity(parseFloat(e.target.value))}
                className="map-opacity-slider"
              />
            </div>

            {/* Live Hover Telemetry */}
            {hoveredCell && (
              <div className="hover-telemetry-badge">
                <span>{hoveredCell.lat.toFixed(1)}°N, {hoveredCell.lon.toFixed(1)}°E</span>:
                <strong>
                  {hoveredCell.val !== null
                    ? `${hoveredCell.val.toFixed(1)}${isFractionOrPct ? "%" : isDiff ? "°C diff" : "°C"}`
                    : "NaN"}
                </strong>
              </div>
            )}

            {/* Zoom Controls */}
            <div className="zoom-btn-group">
              <button
                className="control-btn-icon"
                onClick={() => leafletMapRef.current?.zoomIn()}
                title="Zoom In"
              >
                +
              </button>
              <button
                className="control-btn-icon"
                onClick={() =>
                  leafletMapRef.current?.fitBounds([
                    [6.0, 68.0],
                    [38.5, 98.5],
                  ])
                }
                title="Fit India Domain"
              >
                1:1
              </button>
              <button
                className="control-btn-icon"
                onClick={() => leafletMapRef.current?.zoomOut()}
                title="Zoom Out"
              >
                −
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Sub-controls row */}
      {showModeBar && renderSubControls()}

      {/* 3. DIFFERENCE MODE Stats Banner */}
      {currentMode === "DIFFERENCE" && diffStats && (
        <div className="diff-stats-banner">
          <div>
            <span className="diff-stat-lbl">Domain Min Difference: </span>
            <span className="diff-stat-val" style={{ color: "#1d4ed8" }}>{diffStats.min.toFixed(2)}°C</span>
          </div>
          <div>
            <span className="diff-stat-lbl">Domain Max Difference: </span>
            <span className="diff-stat-val" style={{ color: "#b91c1c" }}>+{diffStats.max.toFixed(2)}°C</span>
          </div>
          <div>
            <span className="diff-stat-lbl">Selected Cell Difference: </span>
            <span className="diff-stat-val" style={{ color: diffStats.selectedVal !== null && diffStats.selectedVal >= 0 ? "#b91c1c" : "#1d4ed8" }}>
              {diffStats.selectedVal !== null ? `${diffStats.selectedVal > 0 ? "+" : ""}${diffStats.selectedVal.toFixed(2)}°C` : "Click cell"}
            </span>
          </div>
        </div>
      )}

      {/* 4. CONTRIBUTION MODE Cell Weights Banner */}
      {currentMode === "CONTRIBUTION" && selectedCell && selectedCellWeights && (
        <div className="diff-stats-banner" style={{ backgroundColor: "#fefce8", borderColor: "#fde047" }}>
          <div>
            <span className="diff-stat-lbl">AURA-BLEND Value: </span>
            <span className="diff-stat-val">
              {selectedCellConsensusVal !== null && selectedCellConsensusVal !== undefined
                ? `${selectedCellConsensusVal.toFixed(1)}°C`
                : "—"}
            </span>
          </div>
          <div>
            <span className="diff-stat-lbl">HRES Weight: </span>
            <span className="diff-stat-val" style={{ color: "#15803d" }}>
              {((selectedCellWeights["HRES"] ?? 0) * 100).toFixed(1)}%
            </span>
          </div>
          <div>
            <span className="diff-stat-lbl">GraphCast Weight: </span>
            <span className="diff-stat-val" style={{ color: "#0284c7" }}>
              {((selectedCellWeights["GraphCast"] ?? 0) * 100).toFixed(1)}%
            </span>
          </div>
          <div>
            <span className="diff-stat-lbl">Pangu Weight: </span>
            <span className="diff-stat-val" style={{ color: "var(--primary-gold-dark)" }}>
              {((selectedCellWeights["Pangu"] ?? 0) * 100).toFixed(1)}%
            </span>
          </div>
        </div>
      )}

      {/* 5. EXTREME EVENT MODE Warning Banner */}
      {currentMode === "EXTREME_EVENT" && (
        <div className="diff-stats-banner" style={{ backgroundColor: "#fff7ed", borderColor: "#fdba74" }}>
          <span style={{ fontSize: 12, color: "#9a3412", fontWeight: 600 }}>
            ⚠️ Operational Notice: Extreme-event probability not available for current benchmark variable. Upper-tail 2m temperature modulation shown via EVP.
          </span>
        </div>
      )}

      {/* 6. Central Real-World Interactive Leaflet Map Area */}
      <div className="map-canvas-area" style={{ position: "relative" }}>
        {/* Real World Leaflet Map Container */}
        <div ref={mapContainerRef} className="real-map-container" />

        {/* 7. Floating Dynamic Color Legend */}
        <div className="floating-map-legend" style={{ zIndex: 1000 }}>
          <div style={{ fontWeight: 700, marginBottom: 4, color: "var(--text-primary)" }}>
            {isFractionOrPct ? "Model Contribution (%)" : isDiff ? "Diverging Difference (°C)" : isVerif ? "Absolute Error (°C)" : "2m Temperature (°C)"}
          </div>

          <div
            style={{
              height: 10,
              borderRadius: 2,
              background: isFractionOrPct
                ? "linear-gradient(to right, #fefce8, #fef08a, #fde047, #eab308, #ca8a04, #78350f)"
                : isDiff
                ? "linear-gradient(to right, #1d4ed8, #60a5fa, #f8fafc, #f87171, #b91c1c)"
                : isVerif
                ? "linear-gradient(to right, #15803d, #84cc16, #eab308, #f97316, #dc2626)"
                : "linear-gradient(to right, #1e3a8a, #0284c7, #059669, #facc15, #f97316, #ef4444, #7f1d1d)",
              marginBottom: 4,
            }}
          />

          <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-secondary)", fontFamily: "var(--font-mono)", fontSize: 10 }}>
            <span>{isFractionOrPct ? "0%" : isDiff ? "-3.0°" : isVerif ? "0.0°" : "0°C"}</span>
            <span>{isFractionOrPct ? "50%" : isDiff ? "0.0°" : isVerif ? "1.5°" : "25°C"}</span>
            <span>{isFractionOrPct ? "100%" : isDiff ? "+3.0°" : isVerif ? "3.0°" : "45°C"}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

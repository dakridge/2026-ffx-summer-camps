import React, { useState, useEffect, useMemo } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

interface ParsedDate {
  iso: string;
  year: number;
  month: number;
  day: number;
  dayOfWeek: number;
  dayName: string;
  monthName: string;
}

interface ParsedTime {
  formatted: string;
  hour: number;
  minute: number;
  minutesSinceMidnight: number;
  period: "AM" | "PM";
}

interface Camp {
  title: string;
  category: string;
  catalogId: string;
  community: string;
  location: string;
  fee: number;
  startDate: ParsedDate;
  endDate: ParsedDate;
  startTime: ParsedTime;
  endTime: ParsedTime;
  minAge: number;
  maxAge: number;
  dateRange: string;
  status: string;
  durationHours: number;
  durationDays: number;
  coordinates?: { lat: number; lng: number };
}

interface CampsData {
  camps: Camp[];
  metadata: {
    totalCamps: number;
    enums: {
      categories: string[];
      communities: string[];
      locations: string[];
      dateRanges: string[];
    };
  };
}

interface Filters {
  search: string;
  categories: string[];
  communities: string[];
  dateRanges: string[];
  minAge: number | null;
  maxAge: number | null;
  maxFee: number | null;
  startHour: number | null;
  endHour: number | null;
}

const initialFilters: Filters = {
  search: "",
  categories: [],
  communities: [],
  dateRanges: [],
  minAge: null,
  maxAge: null,
  maxFee: null,
  startHour: null,
  endHour: null,
};

function App() {
  const [data, setData] = useState<CampsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [view, setView] = useState<"list" | "map">("list");
  const [selectedCamp, setSelectedCamp] = useState<Camp | null>(null);

  useEffect(() => {
    fetch("/api/camps")
      .then((res) => res.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      });
  }, []);

  const filteredCamps = useMemo(() => {
    if (!data) return [];

    return data.camps.filter((camp) => {
      // Search filter
      if (filters.search) {
        const search = filters.search.toLowerCase();
        const matchesSearch =
          camp.title.toLowerCase().includes(search) ||
          camp.location.toLowerCase().includes(search) ||
          camp.catalogId.toLowerCase().includes(search);
        if (!matchesSearch) return false;
      }

      // Category filter
      if (filters.categories.length > 0 && !filters.categories.includes(camp.category)) {
        return false;
      }

      // Community filter
      if (filters.communities.length > 0 && !filters.communities.includes(camp.community)) {
        return false;
      }

      // Date range filter
      if (filters.dateRanges.length > 0 && !filters.dateRanges.includes(camp.dateRange)) {
        return false;
      }

      // Age filter
      if (filters.minAge !== null && camp.maxAge < filters.minAge) return false;
      if (filters.maxAge !== null && camp.minAge > filters.maxAge) return false;

      // Fee filter
      if (filters.maxFee !== null && camp.fee > filters.maxFee) return false;

      // Time filter
      if (filters.startHour !== null && camp.startTime.hour < filters.startHour) return false;
      if (filters.endHour !== null && camp.endTime.hour > filters.endHour) return false;

      return true;
    });
  }, [data, filters]);

  const toggleFilter = (type: "categories" | "communities" | "dateRanges", value: string) => {
    setFilters((prev) => {
      const current = prev[type];
      const updated = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, [type]: updated };
    });
  };

  const clearFilters = () => setFilters(initialFilters);

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
        Loading camps...
      </div>
    );
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1>FCPA Camp Finder</h1>
          <p>Find the perfect summer camp for your child</p>
        </div>

        <div className="filters">
          <div className="filter-group">
            <label>Search</label>
            <input
              type="text"
              placeholder="Search camps, locations..."
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
            />
          </div>

          <div className="filter-group">
            <label>Child's Age</label>
            <div className="range-inputs">
              <input
                type="number"
                placeholder="Min"
                min={3}
                max={18}
                value={filters.minAge ?? ""}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    minAge: e.target.value ? parseInt(e.target.value) : null,
                  }))
                }
              />
              <span>to</span>
              <input
                type="number"
                placeholder="Max"
                min={3}
                max={18}
                value={filters.maxAge ?? ""}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    maxAge: e.target.value ? parseInt(e.target.value) : null,
                  }))
                }
              />
            </div>
          </div>

          <div className="filter-group">
            <label>Max Price</label>
            <input
              type="number"
              placeholder="Max fee ($)"
              value={filters.maxFee ?? ""}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  maxFee: e.target.value ? parseInt(e.target.value) : null,
                }))
              }
            />
          </div>

          <div className="filter-group">
            <label>Category</label>
            <div className="chip-group">
              {data?.metadata.enums.categories.slice(0, 8).map((cat) => (
                <button
                  key={cat}
                  className={`chip ${filters.categories.includes(cat) ? "active" : ""}`}
                  onClick={() => toggleFilter("categories", cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <label>Community</label>
            <select
              value=""
              onChange={(e) => {
                if (e.target.value) toggleFilter("communities", e.target.value);
              }}
            >
              <option value="">Add community...</option>
              {data?.metadata.enums.communities.map((comm) => (
                <option key={comm} value={comm}>
                  {comm}
                </option>
              ))}
            </select>
            {filters.communities.length > 0 && (
              <div className="chip-group" style={{ marginTop: 8 }}>
                {filters.communities.map((comm) => (
                  <button
                    key={comm}
                    className="chip active"
                    onClick={() => toggleFilter("communities", comm)}
                  >
                    {comm} ×
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="filter-group">
            <label>Week</label>
            <select
              value=""
              onChange={(e) => {
                if (e.target.value) toggleFilter("dateRanges", e.target.value);
              }}
            >
              <option value="">Add week...</option>
              {data?.metadata.enums.dateRanges.map((dr) => (
                <option key={dr} value={dr}>
                  {dr}
                </option>
              ))}
            </select>
            {filters.dateRanges.length > 0 && (
              <div className="chip-group" style={{ marginTop: 8 }}>
                {filters.dateRanges.map((dr) => (
                  <button
                    key={dr}
                    className="chip active"
                    onClick={() => toggleFilter("dateRanges", dr)}
                  >
                    {dr.length > 20 ? dr.slice(0, 20) + "..." : dr} ×
                  </button>
                ))}
              </div>
            )}
          </div>

          <button className="clear-filters" onClick={clearFilters}>
            Clear all filters
          </button>
        </div>
      </aside>

      <main className="main">
        <div className="toolbar">
          <div className="result-count">
            <strong>{filteredCamps.length}</strong> camps found
          </div>
          <div className="view-toggle">
            <button className={view === "list" ? "active" : ""} onClick={() => setView("list")}>
              List
            </button>
            <button className={view === "map" ? "active" : ""} onClick={() => setView("map")}>
              Map
            </button>
          </div>
        </div>

        <div className="content">
          {view === "list" ? (
            <CampList camps={filteredCamps} onSelect={setSelectedCamp} />
          ) : (
            <CampMap camps={filteredCamps} onSelect={setSelectedCamp} />
          )}
        </div>
      </main>

      {selectedCamp && <CampModal camp={selectedCamp} onClose={() => setSelectedCamp(null)} />}
    </div>
  );
}

function CampList({ camps, onSelect }: { camps: Camp[]; onSelect: (camp: Camp) => void }) {
  if (camps.length === 0) {
    return (
      <div className="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <h3>No camps found</h3>
        <p>Try adjusting your filters to see more results</p>
      </div>
    );
  }

  return (
    <div className="camp-list">
      {camps.map((camp, i) => (
        <div key={`${camp.catalogId}-${i}`} className="camp-card" onClick={() => onSelect(camp)}>
          <div className="camp-card-header">
            <span className="camp-title">{camp.title}</span>
            <span className="camp-fee">${camp.fee}</span>
          </div>
          <span className="camp-category">{camp.category}</span>
          <div className="camp-details">
            <div className="camp-detail">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <strong>{camp.location}</strong>
            </div>
            <div className="camp-detail">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>
                {camp.startDate.monthName} {camp.startDate.day}
              </span>
            </div>
            <div className="camp-detail">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>
                {camp.startTime.formatted} - {camp.endTime.formatted}
              </span>
            </div>
            <div className="camp-detail">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>
                Ages {camp.minAge}-{camp.maxAge}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function CampMap({ camps, onSelect }: { camps: Camp[]; onSelect: (camp: Camp) => void }) {
  const mapRef = React.useRef<HTMLDivElement>(null);
  const mapInstanceRef = React.useRef<any>(null);
  const markersRef = React.useRef<any[]>([]);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    const L = (window as any).L;

    const initMap = () => {
      if (mapRef.current && !mapInstanceRef.current) {
        const leaflet = (window as any).L;
        mapInstanceRef.current = leaflet.map(mapRef.current).setView([38.85, -77.3], 10);
        leaflet.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "&copy; OpenStreetMap contributors",
        }).addTo(mapInstanceRef.current);
        setMapReady(true);
      }
    };

    // Check if Leaflet is already loaded
    if (L) {
      initMap();
    } else {
      // Load Leaflet dynamically
      const existingScript = document.querySelector('script[src*="leaflet"]');
      if (!existingScript) {
        const script = document.createElement("script");
        script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
        script.onload = initMap;
        document.head.appendChild(script);
      } else {
        existingScript.addEventListener("load", initMap);
      }
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        setMapReady(false);
      }
    };
  }, []);

  useEffect(() => {
    const L = (window as any).L;
    if (!mapReady || !mapInstanceRef.current || !L) return;

    // Clear existing markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Group camps by location
    const locationGroups = new Map<string, Camp[]>();
    camps.forEach((camp) => {
      if (camp.coordinates) {
        const key = `${camp.coordinates.lat},${camp.coordinates.lng}`;
        if (!locationGroups.has(key)) locationGroups.set(key, []);
        locationGroups.get(key)!.push(camp);
      }
    });

    // Add markers
    locationGroups.forEach((groupCamps, key) => {
      const [lat, lng] = key.split(",").map(Number);
      const marker = L.marker([lat, lng]).addTo(mapInstanceRef.current);

      const campsList = groupCamps
        .slice(0, 10)
        .map(
          (c) =>
            `<div class="popup-camp" data-id="${c.catalogId}">
              <strong>${c.title}</strong>
              <span class="popup-camp-meta">$${c.fee} · Ages ${c.minAge}-${c.maxAge} · ${c.startDate.monthName} ${c.startDate.day}</span>
            </div>`
        )
        .join("");

      const moreText = groupCamps.length > 10 ? `<p class="popup-more">+ ${groupCamps.length - 10} more camps</p>` : "";

      const popupContent = `
        <div class="map-popup">
          <h3>${groupCamps[0].location}</h3>
          <p class="popup-subtitle">${groupCamps[0].community} · ${groupCamps.length} camps</p>
          <div class="popup-camps-list">${campsList}</div>
          ${moreText}
        </div>
      `;

      const popup = L.popup({ maxHeight: 300, minWidth: 280 }).setContent(popupContent);
      marker.bindPopup(popup);

      marker.on("popupopen", () => {
        // Add click handlers to camp items in popup
        document.querySelectorAll(".popup-camp").forEach((el) => {
          el.addEventListener("click", () => {
            const campId = el.getAttribute("data-id");
            const camp = groupCamps.find((c) => c.catalogId === campId);
            if (camp) onSelect(camp);
          });
        });
      });

      markersRef.current.push(marker);
    });

    // Fit bounds if we have markers
    if (markersRef.current.length > 0) {
      const group = L.featureGroup(markersRef.current);
      mapInstanceRef.current.fitBounds(group.getBounds().pad(0.1));
    }
  }, [camps, onSelect, mapReady]);

  return (
    <div className="map-container">
      <div id="map" ref={mapRef} />
    </div>
  );
}

function CampModal({ camp, onClose }: { camp: Camp; onClose: () => void }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>{camp.title}</h2>
            <span className="camp-category">{camp.category}</span>
          </div>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="modal-body">
          <div className="modal-grid">
            <div className="modal-section">
              <h4>Location</h4>
              <p>{camp.location}</p>
              <p style={{ color: "#64748b", fontSize: "0.875rem" }}>{camp.community}</p>
            </div>
            <div className="modal-section">
              <h4>Fee</h4>
              <p style={{ fontSize: "1.5rem", fontWeight: 700, color: "#2563eb" }}>${camp.fee}</p>
            </div>
            <div className="modal-section">
              <h4>Dates</h4>
              <p>
                {camp.startDate.dayName}, {camp.startDate.monthName} {camp.startDate.day},{" "}
                {camp.startDate.year}
                {camp.durationDays > 1 && (
                  <>
                    {" "}
                    - {camp.endDate.dayName}, {camp.endDate.monthName} {camp.endDate.day}
                  </>
                )}
              </p>
              <p style={{ color: "#64748b", fontSize: "0.875rem" }}>{camp.dateRange}</p>
            </div>
            <div className="modal-section">
              <h4>Time</h4>
              <p>
                {camp.startTime.formatted} - {camp.endTime.formatted}
              </p>
              <p style={{ color: "#64748b", fontSize: "0.875rem" }}>{camp.durationHours} hours</p>
            </div>
            <div className="modal-section">
              <h4>Ages</h4>
              <p>
                {camp.minAge} - {camp.maxAge} years old
              </p>
            </div>
            <div className="modal-section">
              <h4>Catalog ID</h4>
              <p style={{ fontFamily: "monospace" }}>{camp.catalogId}</p>
            </div>
          </div>
          <div className="modal-section">
            <h4>Status</h4>
            <p>{camp.status}</p>
          </div>
          <a
            href={`https://www.fairfaxcounty.gov/parks/camps`}
            target="_blank"
            rel="noopener noreferrer"
            className="register-btn"
            style={{ textDecoration: "none", textAlign: "center" }}
          >
            Register on FCPA Website
          </a>
        </div>
      </div>
    </div>
  );
}

const root = createRoot(document.getElementById("root")!);
root.render(<App />);

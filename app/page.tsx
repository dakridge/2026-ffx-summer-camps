"use client";

import React, { useState, useEffect, useCallback, Suspense, lazy } from "react";
import {
  Search,
  MapPin,
  Calendar,
  Clock,
  User,
  List,
  Map as MapIcon,
  X,
  Tent,
  Sun,
  TreePine,
  DollarSign,
  ChevronDown,
  Sparkles,
  Users,
  SlidersHorizontal,
  Heart,
  ClipboardList,
  Navigation,
  Crosshair,
  CalendarPlus,
  Check,
} from "lucide-react";
import { Camp, CampsData, Filters } from "./lib/types";
import { Icons, getCategoryStyle, formatTime } from "./lib/utils";
import { useGeolocation, usePersistentSet, useCampFiltering } from "./lib/hooks";
import { CampList } from "./components";

// Lazy load heavy components that aren't immediately visible
const CampMap = lazy(() => import("./components/CampMap").then(mod => ({ default: mod.CampMap })));
const CampCalendar = lazy(() => import("./components/CampCalendar").then(mod => ({ default: mod.CampCalendar })));
const MultiWeekPlanner = lazy(() => import("./components/MultiWeekPlanner").then(mod => ({ default: mod.MultiWeekPlanner })));

// Loading fallback for lazy-loaded views
function ViewLoadingFallback() {
  return (
    <div className="h-full flex items-center justify-center bg-gradient-to-b from-camp-cream to-camp-warm">
      <div className="text-center animate-fade-in">
        <div className="w-12 h-12 mx-auto mb-4 border-3 border-camp-sand border-t-camp-terracotta rounded-full animate-spin" />
        <p className="text-camp-bark/60 text-sm font-medium">Loading view...</p>
      </div>
    </div>
  );
}

const initialFilters: Filters = {
  search: "",
  categories: [],
  communities: [],
  locations: [],
  dateRanges: [],
  childAge: null,
  maxFee: null,
  startHour: null,
  endHour: null,
  fromDate: null,
  toDate: null,
};

// URL params helpers
function filtersToParams(filters: Filters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.search) params.set("q", filters.search);
  if (filters.categories.length)
    params.set("cat", filters.categories.join(","));
  if (filters.communities.length)
    params.set("comm", filters.communities.join(","));
  if (filters.locations.length) params.set("loc", filters.locations.join(","));
  if (filters.dateRanges.length)
    params.set("week", filters.dateRanges.join("|"));
  if (filters.childAge !== null) params.set("age", filters.childAge.toString());
  if (filters.maxFee !== null) params.set("maxFee", filters.maxFee.toString());
  if (filters.fromDate) params.set("from", filters.fromDate);
  if (filters.toDate) params.set("to", filters.toDate);
  return params;
}

function paramsToFilters(params: URLSearchParams): Filters {
  return {
    search: params.get("q") || "",
    categories: params.get("cat")?.split(",").filter(Boolean) || [],
    communities: params.get("comm")?.split(",").filter(Boolean) || [],
    locations: params.get("loc")?.split(",").filter(Boolean) || [],
    dateRanges: params.get("week")?.split("|").filter(Boolean) || [],
    childAge: params.get("age") ? parseInt(params.get("age")!) : null,
    maxFee: params.get("maxFee") ? parseInt(params.get("maxFee")!) : null,
    startHour: null,
    endHour: null,
    fromDate: params.get("from") || null,
    toDate: params.get("to") || null,
  };
}

export default function HomePage() {
  const [data, setData] = useState<CampsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [view, setView] = useState<"list" | "map" | "grouped" | "planner">(
    "list"
  );
  const [plannedCamps, setPlannedCamps] = useState<Map<string, Camp[]>>(
    new Map()
  );
  const [isSharedPlan, setIsSharedPlan] = useState(false);
  const [selectedCamp, setSelectedCamp] = useState<Camp | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [sortBy, setSortBy] = useState<
    "default" | "distance" | "price" | "priceDesc" | "date" | "name"
  >("default");
  const [showWelcome, setShowWelcome] = useState(false);

  // Check if user has seen the welcome popup (only if enabled via env var)
  useEffect(() => {
    const welcomeEnabled = process.env.NEXT_PUBLIC_SHOW_WELCOME === "true";
    if (!welcomeEnabled) return;

    const hasSeenWelcome = localStorage.getItem("camp-welcome-seen");
    if (!hasSeenWelcome) {
      setShowWelcome(true);
    }
  }, []);

  const dismissWelcome = useCallback(() => {
    localStorage.setItem("camp-welcome-seen", "true");
    setShowWelcome(false);
  }, []);

  // Custom hooks for persistent state and geolocation
  const [favorites, setFavorites] = usePersistentSet("camp-favorites");

  const {
    location: userLocation,
    loading: locationLoading,
    error: locationError,
    requestLocation,
    setLocation: setUserLocation,
    clearLocation: clearUserLocation,
  } = useGeolocation({
    onLocationChange: (loc) => {
      if (loc) setSortBy("distance");
    },
  });

  // Show geolocation errors
  useEffect(() => {
    if (locationError) {
      alert(locationError + ". You can click on the map to set your location manually.");
    }
  }, [locationError]);

  // Initialize state from URL params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setFilters(paramsToFilters(params));

    const v = params.get("view");
    if (v === "map" || v === "grouped" || v === "planner") setView(v);
  }, []);

  // Persist planned camps to localStorage (skip while loading or viewing shared plan)
  useEffect(() => {
    if (loading) return;
    if (isSharedPlan) return;
    const obj: Record<string, Camp[]> = {};
    plannedCamps.forEach((camps, week) => {
      obj[week] = camps;
    });
    localStorage.setItem("camp-planner-v2", JSON.stringify(obj));
  }, [plannedCamps, isSharedPlan, loading]);

  // Add or remove a camp from a week's plan
  // camp = null means clear the week, camp with existing catalogId means remove it
  const setPlannerCamp = useCallback((week: string, camp: Camp | null, action?: "add" | "remove") => {
    setPlannedCamps((prev) => {
      const next = new Map(prev);
      const currentCamps = next.get(week) || [];

      if (camp === null) {
        // Clear all camps for this week
        next.delete(week);
      } else if (action === "remove") {
        // Remove specific camp
        const filtered = currentCamps.filter(c => c.catalogId !== camp.catalogId);
        if (filtered.length === 0) {
          next.delete(week);
        } else {
          next.set(week, filtered);
        }
      } else {
        // Add camp (default action)
        const exists = currentCamps.some(c => c.catalogId === camp.catalogId);
        if (!exists) {
          next.set(week, [...currentCamps, camp]);
        }
      }
      return next;
    });
  }, []);

  const toggleFavorite = useCallback((catalogId: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(catalogId)) {
        next.delete(catalogId);
      } else {
        next.add(catalogId);
      }
      return next;
    });
  }, [setFavorites]);

  const getNearMe = useCallback(() => {
    requestLocation();
  }, [requestLocation]);

  const handleClearLocation = useCallback(() => {
    clearUserLocation();
    setSortBy((current) => current === "distance" ? "default" : current);
  }, [clearUserLocation]);

  // Debounce URL updates to avoid lag when typing
  useEffect(() => {
    if (loading) return;
    if (isSharedPlan) return;

    const timeoutId = setTimeout(() => {
      const params = filtersToParams(filters);
      if (view === "map") params.set("view", "map");
      if (view === "grouped") params.set("view", "grouped");
      if (view === "planner") params.set("view", "planner");
      const newUrl = params.toString()
        ? `?${params.toString()}`
        : window.location.pathname;
      window.history.replaceState({}, "", newUrl);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [filters, view, isSharedPlan, loading]);

  useEffect(() => {
    fetch("/api/camps")
      .then((res) => res.json())
      .then((d) => {
        setData(d);
        setLoading(false);

        const params = new URLSearchParams(window.location.search);
        const planParam = params.get("plan");

        if (planParam) {
          try {
            // URL format: week1:id1,week1:id2,week2:id3 (multiple camps per week supported)
            const planPairs = planParam.split(",");
            const sharedPlan = new Map<string, Camp[]>();
            planPairs.forEach((pair) => {
              const [weekEncoded, catalogId] = pair.split(":");
              const week = decodeURIComponent(weekEncoded);
              const camp = d.camps.find((c: Camp) => c.catalogId === catalogId);
              if (camp) {
                const existing = sharedPlan.get(week) || [];
                if (!existing.some(c => c.catalogId === catalogId)) {
                  sharedPlan.set(week, [...existing, camp]);
                }
              }
            });
            if (sharedPlan.size > 0) {
              setPlannedCamps(sharedPlan);
              setIsSharedPlan(true);
              setView("planner");
            }
          } catch {}
        } else {
          try {
            // Try new format first (v2 - arrays), then fall back to old format (single camp)
            const savedV2 = localStorage.getItem("camp-planner-v2");
            const savedV1 = localStorage.getItem("camp-planner");
            const localPlan = new Map<string, Camp[]>();

            if (savedV2) {
              // New format: { week: Camp[] }
              const parsed = JSON.parse(savedV2);
              Object.entries(parsed).forEach(([week, campsData]) => {
                const camps = (campsData as Camp[])
                  .map(campData => d.camps.find((c: Camp) => c.catalogId === campData.catalogId))
                  .filter((c): c is Camp => c !== undefined);
                if (camps.length > 0) {
                  localPlan.set(week, camps);
                }
              });
            } else if (savedV1) {
              // Old format: { week: Camp } - migrate to new format
              const parsed = JSON.parse(savedV1);
              Object.entries(parsed).forEach(([week, campData]) => {
                const camp = d.camps.find(
                  (c: Camp) => c.catalogId === (campData as Camp).catalogId
                );
                if (camp) {
                  localPlan.set(week, [camp]);
                }
              });
              // Clean up old format after migration
              localStorage.removeItem("camp-planner");
            }

            if (localPlan.size > 0) {
              setPlannedCamps(localPlan);
            }
          } catch {}
        }
      });
  }, []);

  // Use custom hook for filtering and sorting
  const filteredCamps = useCampFiltering({
    camps: data?.camps ?? [],
    filters,
    sortBy,
    userLocation,
    favorites,
    showFavoritesOnly,
  });

  const toggleFilter = (
    type: "categories" | "communities" | "dateRanges",
    value: string
  ) => {
    setFilters((prev) => {
      const current = prev[type];
      const updated = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, [type]: updated };
    });
  };

  const clearFilters = () => setFilters(initialFilters);

  const hasActiveFilters =
    filters.search ||
    filters.categories.length ||
    filters.communities.length ||
    filters.locations.length ||
    filters.dateRanges.length ||
    filters.childAge !== null ||
    filters.maxFee !== null ||
    filters.startHour !== null ||
    filters.endHour !== null ||
    filters.fromDate !== null ||
    filters.toDate !== null;

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-b from-camp-cream via-camp-warm to-camp-sand overflow-hidden relative">
        {/* Animated clouds */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-16 left-0 animate-drift opacity-30">
            <svg width="80" height="40" viewBox="0 0 80 40" fill="currentColor" className="text-white">
              <ellipse cx="30" cy="25" rx="25" ry="12" />
              <ellipse cx="50" cy="20" rx="20" ry="10" />
              <ellipse cx="65" cy="25" rx="15" ry="8" />
            </svg>
          </div>
          <div className="absolute top-24 left-0 animate-drift opacity-20" style={{ animationDelay: "-3s", animationDuration: "12s" }}>
            <svg width="100" height="50" viewBox="0 0 100 50" fill="currentColor" className="text-white">
              <ellipse cx="35" cy="30" rx="30" ry="14" />
              <ellipse cx="60" cy="24" rx="24" ry="12" />
              <ellipse cx="80" cy="30" rx="18" ry="10" />
            </svg>
          </div>
          <div className="absolute top-8 left-0 animate-drift opacity-25" style={{ animationDelay: "-6s", animationDuration: "10s" }}>
            <svg width="60" height="30" viewBox="0 0 60 30" fill="currentColor" className="text-white">
              <ellipse cx="22" cy="18" rx="18" ry="9" />
              <ellipse cx="40" cy="15" rx="15" ry="8" />
              <ellipse cx="52" cy="18" rx="10" ry="6" />
            </svg>
          </div>
        </div>

        {/* Main content */}
        <div className="text-center animate-fade-in relative z-10">
          {/* Scene with tent, sun, and trees */}
          <div className="relative mb-8 h-32 w-64 mx-auto">
            {/* Sun with glow */}
            <div className="absolute -top-4 right-4 animate-pulse-glow">
              <div className="w-12 h-12 text-camp-sun animate-wiggle" style={{ animationDuration: "3s" }}>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="12" r="5" />
                  <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
                </svg>
              </div>
            </div>

            {/* Left tree */}
            <div className="absolute bottom-0 left-4 animate-sway" style={{ transformOrigin: "bottom center" }}>
              <svg width="32" height="56" viewBox="0 0 32 56" className="text-camp-forest">
                <polygon points="16,0 28,20 22,20 30,36 20,36 24,48 8,48 12,36 2,36 10,20 4,20" fill="currentColor" />
                <rect x="13" y="48" width="6" height="8" fill="#6B4423" />
              </svg>
            </div>

            {/* Tent (center) */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 animate-bounce-slow">
              <div className="w-20 h-20 text-camp-terracotta">
                {Icons.tent}
              </div>
            </div>

            {/* Right tree */}
            <div className="absolute bottom-0 right-6 animate-sway" style={{ transformOrigin: "bottom center", animationDelay: "-1.5s" }}>
              <svg width="28" height="48" viewBox="0 0 28 48" className="text-camp-forest-light">
                <polygon points="14,0 24,16 19,16 26,30 18,30 21,42 7,42 10,30 2,30 9,16 4,16" fill="currentColor" />
                <rect x="11" y="42" width="6" height="6" fill="#6B4423" />
              </svg>
            </div>

            {/* Ground line */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-camp-forest/20 to-transparent rounded-full" />
          </div>

          {/* Progress bar */}
          <div className="w-56 h-2 bg-camp-sand/60 rounded-full mx-auto overflow-hidden backdrop-blur-sm">
            <div className="h-full w-1/2 bg-gradient-to-r from-camp-terracotta via-camp-sun to-camp-terracotta rounded-full animate-progress" />
          </div>

          {/* Loading text with shimmer */}
          <p className="mt-5 text-camp-bark/80 font-medium text-lg animate-shimmer">
            Loading adventures...
          </p>

          {/* Decorative dots */}
          <div className="flex justify-center gap-1.5 mt-3">
            <div className="w-2 h-2 rounded-full bg-camp-terracotta/60 animate-bounce-slow" style={{ animationDelay: "0s" }} />
            <div className="w-2 h-2 rounded-full bg-camp-sun/60 animate-bounce-slow" style={{ animationDelay: "0.2s" }} />
            <div className="w-2 h-2 rounded-full bg-camp-forest/60 animate-bounce-slow" style={{ animationDelay: "0.4s" }} />
          </div>

          {/* Cradley branding */}
          <div className="mt-8 pt-6 border-t border-camp-sand/40">
            <a
              href="https://searchcradley.com?ref=ffxcamps-loading"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-camp-bark/50 hover:text-[oklch(0.55_0.15_340)] transition-colors"
            >
              <span className="w-5 h-5 bg-[oklch(0.65_0.15_340)] rounded-full flex items-center justify-center text-white text-[10px] font-bold shadow-sm">C</span>
              <span className="text-xs font-medium">A free tool by Cradley</span>
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-camp-cream overflow-hidden">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          role="button"
          tabIndex={0}
          aria-label="Close sidebar"
          className="fixed inset-0 bg-black/30 z-40 lg:hidden cursor-pointer"
          onClick={() => setSidebarOpen(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " " || e.key === "Escape") {
              e.preventDefault();
              setSidebarOpen(false);
            }
          }}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        fixed lg:relative inset-y-0 left-0 z-50 lg:z-auto
        w-80 bg-white border-r border-camp-sand flex-shrink-0 flex flex-col
        transition-transform duration-300 ease-in-out
      `}
      >
        {/* Decorative top bar */}
        <div className="h-1.5 bg-gradient-to-r from-camp-terracotta via-camp-sun to-camp-forest" />

        {/* Header */}
        <div className="p-5 border-b border-camp-sand relative overflow-hidden">
          <div className="absolute -top-6 -right-6 w-24 h-24 bg-camp-sun/10 rounded-full" />
          <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-camp-forest/5 rounded-full" />
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-camp-terracotta to-camp-terracotta-dark rounded-xl flex items-center justify-center text-white shadow-camp">
                  {Icons.tent}
                </div>
                <div>
                  <h1 className="font-display text-xl font-bold text-camp-pine tracking-tight">
                    Camp Explorer
                  </h1>
                  <p className="text-xs text-camp-bark/60 font-medium">
                    Fairfax County Parks
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                aria-label="Close sidebar"
                className="p-2 hover:bg-camp-warm rounded-lg transition-colors text-camp-bark/50 hover:text-camp-bark lg:hidden focus:outline-none focus:ring-2 focus:ring-camp-terracotta"
              >
                <span aria-hidden="true">{Icons.x}</span>
              </button>
            </div>
            <p className="text-sm text-camp-bark/70 mt-3">
              Discover the perfect summer adventure for your child
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* Favorites Toggle */}
          {favorites.size > 0 && (
            <button
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                showFavoritesOnly
                  ? "bg-rose-500 text-white"
                  : "bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100"
              }`}
            >
              <Heart
                className="w-4 h-4"
                fill={showFavoritesOnly ? "currentColor" : "none"}
              />
              {showFavoritesOnly
                ? `Showing ${favorites.size} Favorites`
                : `Show ${favorites.size} Favorites`}
            </button>
          )}

          {/* Location / Near Me */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-camp-bark/50 mb-2">
              Your Location
            </label>
            {userLocation ? (
              <div className="flex items-center gap-2">
                <div className="flex-1 px-3 py-2.5 bg-camp-forest/10 border border-camp-forest/20 rounded-xl text-sm text-camp-forest flex items-center gap-2">
                  <Crosshair className="w-4 h-4" />
                  <span className="truncate">Location set</span>
                </div>
                <button
                  onClick={handleClearLocation}
                  aria-label="Clear location"
                  className="p-2.5 bg-camp-warm border border-camp-sand rounded-xl text-camp-bark/50 hover:text-camp-bark hover:border-camp-bark/30 transition-all focus:outline-none focus:ring-2 focus:ring-camp-terracotta"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            ) : (
              <button
                onClick={getNearMe}
                disabled={locationLoading}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-camp-forest hover:bg-camp-pine disabled:bg-camp-forest/50 text-white rounded-xl text-sm font-semibold transition-all"
              >
                {locationLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Getting location...
                  </>
                ) : (
                  <>
                    <Navigation className="w-4 h-4" />
                    Near Me
                  </>
                )}
              </button>
            )}
            {userLocation && (
              <p className="text-[10px] text-camp-bark/50 mt-1.5">
                Drag pin on map to adjust
              </p>
            )}
          </div>

          {/* Sort */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-camp-bark/50 mb-2">
              Sort By
            </label>
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="w-full px-3 py-2.5 bg-camp-warm border border-camp-sand rounded-xl text-sm text-camp-pine appearance-none cursor-pointer transition-all hover:border-camp-terracotta/30"
              >
                <option value="default">Default</option>
                <option value="name">Name (A-Z)</option>
                <option value="distance" disabled={!userLocation}>
                  Distance (nearest first)
                </option>
                <option value="price">Price (lowest first)</option>
                <option value="priceDesc">Price (highest first)</option>
                <option value="date">Date (earliest first)</option>
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-camp-bark/40 pointer-events-none">
                {Icons.chevronDown}
              </div>
            </div>
          </div>

          {/* Search */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-camp-bark/50 mb-2">
              Search
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-camp-bark/40">
                {Icons.search}
              </div>
              <input
                type="text"
                placeholder="Camp name, location..."
                value={filters.search}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, search: e.target.value }))
                }
                className="w-full pl-10 pr-4 py-2.5 bg-camp-warm border border-camp-sand rounded-xl text-sm text-camp-pine placeholder:text-camp-bark/40 transition-all hover:border-camp-terracotta/30"
              />
            </div>
          </div>

          {/* Age */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-camp-bark/50 mb-2">
              Child&apos;s Age
            </label>
            <input
              type="number"
              placeholder="Enter age"
              min={3}
              max={18}
              value={filters.childAge ?? ""}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  childAge: e.target.value ? parseInt(e.target.value) : null,
                }))
              }
              className="w-full px-3 py-2.5 bg-camp-warm border border-camp-sand rounded-xl text-sm text-camp-pine placeholder:text-camp-bark/40 transition-all hover:border-camp-terracotta/30"
            />
          </div>

          {/* Max Price */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-camp-bark/50 mb-2">
              Budget
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-camp-bark/40">
                {Icons.dollar}
              </div>
              <input
                type="number"
                placeholder="Maximum fee"
                value={filters.maxFee ?? ""}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    maxFee: e.target.value ? parseInt(e.target.value) : null,
                  }))
                }
                className="w-full pl-9 pr-4 py-2.5 bg-camp-warm border border-camp-sand rounded-xl text-sm text-camp-pine placeholder:text-camp-bark/40 transition-all hover:border-camp-terracotta/30"
              />
            </div>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-camp-bark/50 mb-2">
              Date Range
            </label>
            <div className="flex flex-col gap-2">
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-camp-forest">
                  {Icons.calendar}
                </div>
                <input
                  type="date"
                  placeholder="From date"
                  value={filters.fromDate ?? ""}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      fromDate: e.target.value || null,
                    }))
                  }
                  className="w-full pl-9 pr-4 py-2.5 bg-camp-warm border border-camp-sand rounded-xl text-sm text-camp-pine placeholder:text-camp-bark/40 transition-all hover:border-camp-terracotta/30"
                />
              </div>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-camp-forest">
                  {Icons.calendar}
                </div>
                <input
                  type="date"
                  placeholder="To date"
                  value={filters.toDate ?? ""}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      toDate: e.target.value || null,
                    }))
                  }
                  className="w-full pl-9 pr-4 py-2.5 bg-camp-warm border border-camp-sand rounded-xl text-sm text-camp-pine placeholder:text-camp-bark/40 transition-all hover:border-camp-terracotta/30"
                />
              </div>
            </div>
            <p className="text-[10px] text-camp-bark/50 mt-1.5">
              Filter camps by start date
            </p>
          </div>

          {/* Time Filters */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-camp-bark/50 mb-2">
              Schedule
            </label>
            <div className="flex flex-col gap-2">
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-camp-bark/40">
                  {Icons.clock}
                </div>
                <select
                  value={filters.startHour ?? ""}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      startHour: e.target.value
                        ? parseInt(e.target.value)
                        : null,
                    }))
                  }
                  className="w-full pl-9 pr-4 py-2.5 bg-camp-warm border border-camp-sand rounded-xl text-sm text-camp-pine appearance-none cursor-pointer transition-all hover:border-camp-terracotta/30"
                >
                  <option value="">Starts by...</option>
                  <option value="7">7:00 AM</option>
                  <option value="8">8:00 AM</option>
                  <option value="9">9:00 AM</option>
                  <option value="10">10:00 AM</option>
                  <option value="11">11:00 AM</option>
                  <option value="12">12:00 PM</option>
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-camp-bark/40 pointer-events-none">
                  {Icons.chevronDown}
                </div>
              </div>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-camp-bark/40">
                  {Icons.clock}
                </div>
                <select
                  value={filters.endHour ?? ""}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      endHour: e.target.value ? parseInt(e.target.value) : null,
                    }))
                  }
                  className="w-full pl-9 pr-4 py-2.5 bg-camp-warm border border-camp-sand rounded-xl text-sm text-camp-pine appearance-none cursor-pointer transition-all hover:border-camp-terracotta/30"
                >
                  <option value="">Ends after...</option>
                  <option value="12">12:00 PM</option>
                  <option value="13">1:00 PM</option>
                  <option value="14">2:00 PM</option>
                  <option value="15">3:00 PM</option>
                  <option value="16">4:00 PM</option>
                  <option value="17">5:00 PM</option>
                  <option value="18">6:00 PM</option>
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-camp-bark/40 pointer-events-none">
                  {Icons.chevronDown}
                </div>
              </div>
            </div>
          </div>

          {/* Categories */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-camp-bark/50 mb-2">
              Activity Type
            </label>
            <div className="flex flex-wrap gap-2">
              {data?.metadata.enums.categories.slice(0, 10).map((cat) => {
                const style = getCategoryStyle(cat);
                const isActive = filters.categories.includes(cat);
                return (
                  <button
                    key={cat}
                    onClick={() => toggleFilter("categories", cat)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                      isActive
                        ? `${style.bg} ${style.text} ${style.border} shadow-sm`
                        : "bg-camp-warm text-camp-bark/60 border-camp-sand hover:border-camp-terracotta/30 hover:text-camp-bark"
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Community */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-camp-bark/50 mb-2">
              Community
            </label>
            <div className="relative">
              <select
                value=""
                onChange={(e) =>
                  e.target.value && toggleFilter("communities", e.target.value)
                }
                className="w-full px-3 py-2.5 bg-camp-warm border border-camp-sand rounded-xl text-sm text-camp-bark/60 appearance-none cursor-pointer transition-all hover:border-camp-terracotta/30"
              >
                <option value="">Select community...</option>
                {data?.metadata.enums.communities.map((comm) => (
                  <option key={comm} value={comm}>
                    {comm}
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-camp-bark/40 pointer-events-none">
                {Icons.chevronDown}
              </div>
            </div>
            {filters.communities.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {filters.communities.map((comm) => (
                  <button
                    key={comm}
                    onClick={() => toggleFilter("communities", comm)}
                    className="px-3 py-1 rounded-full text-xs font-semibold bg-camp-forest/10 text-camp-forest border border-camp-forest/20 flex items-center gap-1.5 hover:bg-camp-forest/20 transition-colors"
                  >
                    {comm}
                    <span className="text-camp-forest/60">{Icons.x}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Location filter chips */}
          {filters.locations.length > 0 && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-camp-bark/50 mb-2">
                Location
              </label>
              <div className="flex flex-wrap gap-2">
                {filters.locations.map((loc) => (
                  <button
                    key={loc}
                    onClick={() =>
                      setFilters((prev) => ({
                        ...prev,
                        locations: prev.locations.filter((l) => l !== loc),
                      }))
                    }
                    className="px-3 py-1 rounded-full text-xs font-semibold bg-camp-terracotta/10 text-camp-terracotta border border-camp-terracotta/20 flex items-center gap-1.5 hover:bg-camp-terracotta/20 transition-colors"
                  >
                    {loc}
                    <span className="text-camp-terracotta/60">{Icons.x}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Week */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-camp-bark/50 mb-2">
              Week
            </label>
            <div className="relative">
              <select
                value=""
                onChange={(e) =>
                  e.target.value && toggleFilter("dateRanges", e.target.value)
                }
                className="w-full px-3 py-2.5 bg-camp-warm border border-camp-sand rounded-xl text-sm text-camp-bark/60 appearance-none cursor-pointer transition-all hover:border-camp-terracotta/30"
              >
                <option value="">Select week...</option>
                {data?.metadata.enums.dateRanges.map((dr) => (
                  <option key={dr} value={dr}>
                    {dr}
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-camp-bark/40 pointer-events-none">
                {Icons.chevronDown}
              </div>
            </div>
            {filters.dateRanges.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {filters.dateRanges.map((dr) => (
                  <button
                    key={dr}
                    onClick={() => toggleFilter("dateRanges", dr)}
                    className="px-3 py-1 rounded-full text-xs font-semibold bg-camp-sun/20 text-amber-700 border border-camp-sun/30 flex items-center gap-1.5 hover:bg-camp-sun/30 transition-colors"
                  >
                    {dr.length > 18 ? dr.slice(0, 18) + "..." : dr}
                    <span className="text-amber-600/60">{Icons.x}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="w-full py-2.5 border border-camp-sand rounded-xl text-sm font-medium text-camp-bark/60 hover:bg-camp-warm hover:text-camp-bark hover:border-camp-terracotta/20 transition-all"
            >
              Clear all filters
            </button>
          )}
        </div>

        {/* Footer with branding */}
        <div className="p-4 border-t border-camp-sand mt-auto">
          <p className="text-[10px] text-camp-bark/40 text-center">
            A free tool by{" "}
            <a
              href="https://searchcradley.com?ref=ffxcamps"
              target="_blank"
              rel="noopener noreferrer"
              className="text-camp-terracotta hover:underline font-medium"
            >
              Cradley
            </a>
          </p>
        </div>
      </aside>

      {/* Main Content */}
      <main id="main-content" className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="bg-white border-b border-camp-sand px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label={sidebarOpen ? "Close filters" : "Open filters"}
              aria-expanded={sidebarOpen}
              className="relative p-2 hover:bg-camp-warm rounded-lg transition-colors text-camp-bark/60 hover:text-camp-bark lg:hidden focus:outline-none focus:ring-2 focus:ring-camp-terracotta"
            >
              <span aria-hidden="true">{Icons.filter}</span>
              {hasActiveFilters && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-camp-terracotta rounded-full" aria-label="Filters active" />
              )}
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xl sm:text-2xl font-display font-bold text-camp-terracotta">
                {filteredCamps.length}
              </span>
              <span className="text-camp-bark/60 text-xs sm:text-sm">
                {filteredCamps.length === 1 ? "camp" : "camps"} found
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 bg-camp-warm p-1 rounded-xl" role="tablist" aria-label="View mode">
            <button
              onClick={() => setView("list")}
              role="tab"
              aria-selected={view === "list"}
              aria-controls="camp-content"
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-camp-terracotta ${
                view === "list"
                  ? "bg-white text-camp-pine shadow-camp"
                  : "text-camp-bark/60 hover:text-camp-bark"
              }`}
            >
              <span aria-hidden="true">{Icons.list}</span>
              <span className="hidden sm:inline">List</span>
              <span className="sr-only sm:hidden">List view</span>
            </button>
            <button
              onClick={() => setView("map")}
              role="tab"
              aria-selected={view === "map"}
              aria-controls="camp-content"
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-camp-terracotta ${
                view === "map"
                  ? "bg-white text-camp-pine shadow-camp"
                  : "text-camp-bark/60 hover:text-camp-bark"
              }`}
            >
              <span aria-hidden="true">{Icons.map}</span>
              <span className="hidden sm:inline">Map</span>
              <span className="sr-only sm:hidden">Map view</span>
            </button>
            <button
              onClick={() => setView("grouped")}
              role="tab"
              aria-selected={view === "grouped"}
              aria-controls="camp-content"
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-camp-terracotta ${
                view === "grouped"
                  ? "bg-white text-camp-pine shadow-camp"
                  : "text-camp-bark/60 hover:text-camp-bark"
              }`}
            >
              <span aria-hidden="true">{Icons.layers}</span>
              <span className="hidden sm:inline">Grouped</span>
              <span className="sr-only sm:hidden">Grouped view</span>
            </button>
            <button
              onClick={() => setView("planner")}
              role="tab"
              aria-selected={view === "planner"}
              aria-controls="camp-content"
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-camp-terracotta ${
                view === "planner"
                  ? "bg-white text-camp-pine shadow-camp"
                  : "text-camp-bark/60 hover:text-camp-bark"
              }`}
            >
              <span aria-hidden="true">{Icons.planner}</span>
              <span className="hidden sm:inline">Planner</span>
              <span className="sr-only sm:hidden">Planner view</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div id="camp-content" role="tabpanel" className="flex-1 overflow-hidden relative">
          {view === "list" && (
            <CampList
              camps={filteredCamps}
              onSelect={setSelectedCamp}
              favorites={favorites}
              onToggleFavorite={toggleFavorite}
              plannedCamps={plannedCamps}
              onPlanCamp={setPlannerCamp}
            />
          )}
          {view === "map" && (
            <Suspense fallback={<ViewLoadingFallback />}>
              <CampMap
                camps={filteredCamps}
                onSelect={setSelectedCamp}
                onFilterLocation={(loc) => {
                  setFilters((prev) => ({ ...prev, locations: [loc] }));
                  setView("list");
                }}
                userLocation={userLocation}
                onSetUserLocation={(loc) => {
                  setUserLocation(loc);
                  setSortBy("distance");
                }}
              />
            </Suspense>
          )}
          {view === "grouped" && (
            <Suspense fallback={<ViewLoadingFallback />}>
              <CampCalendar
                camps={filteredCamps}
                onSelect={setSelectedCamp}
                plannedCamps={plannedCamps}
                onPlanCamp={setPlannerCamp}
              />
            </Suspense>
          )}
          {view === "planner" && data && (
            <Suspense fallback={<ViewLoadingFallback />}>
              <MultiWeekPlanner
                camps={filteredCamps}
                allCamps={data.camps}
                plannedCamps={plannedCamps}
                onPlanCamp={setPlannerCamp}
                onSelect={setSelectedCamp}
                isSharedPlan={isSharedPlan}
                onSaveSharedPlan={() => {
                  setIsSharedPlan(false);
                  const params = new URLSearchParams(window.location.search);
                  params.delete("plan");
                  params.set("view", "planner");
                  const newUrl = params.toString()
                    ? `?${params.toString()}`
                    : window.location.pathname;
                  window.history.replaceState({}, "", newUrl);
                }}
              />
            </Suspense>
          )}
        </div>
      </main>

      {/* Modal */}
      {selectedCamp && (
        <CampModal
          camp={selectedCamp}
          onClose={() => setSelectedCamp(null)}
          plannedCamps={plannedCamps}
          onPlanCamp={setPlannerCamp}
        />
      )}

      {/* Welcome Popup */}
      {showWelcome && !loading && (
        <WelcomePopup onDismiss={dismissWelcome} />
      )}

      {/* Persistent Cradley floating badge */}
      <a
        href="https://searchcradley.com?ref=ffxcamps-badge"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-4 right-4 z-40 flex items-center gap-2 px-3 py-2 bg-white/95 backdrop-blur-sm border border-camp-sand/50 rounded-full shadow-lg hover:shadow-xl hover:border-[oklch(0.65_0.15_340)]/30 transition-all group"
      >
        <span className="w-5 h-5 bg-[oklch(0.65_0.15_340)] rounded-full flex items-center justify-center text-white text-[10px] font-bold shadow-sm">C</span>
        <span className="text-xs font-medium text-camp-bark/70 group-hover:text-[oklch(0.55_0.15_340)] transition-colors">
          Made by Cradley
        </span>
      </a>
    </div>
  );
}


function WelcomePopup({ onDismiss }: { onDismiss: () => void }) {
  const modalRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onDismiss();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [onDismiss]);

  return (
    <div
      className="fixed inset-0 bg-camp-pine/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in"
      onClick={onDismiss}
      role="presentation"
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-title"
        className="bg-white rounded-3xl max-w-md w-full shadow-camp-lg animate-scale-in overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Cradley branding */}
        <div className="bg-[oklch(0.95_0.04_340)] p-6 text-center">
          <div className="w-14 h-14 mx-auto mb-4 bg-[oklch(0.65_0.15_340)] rounded-full flex items-center justify-center shadow-sm">
            <span className="text-white text-2xl" style={{ fontFamily: '"Outfit Variable", sans-serif' }}>C</span>
          </div>
          <h2 id="welcome-title" className="font-display text-2xl font-bold text-[oklch(0.25_0.01_265)] mb-2">
            Welcome to Camp Explorer!
          </h2>
          <p className="text-[oklch(0.5_0.01_265)] text-sm">
            A free tool by Cradley
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-camp-bark text-sm leading-relaxed">
            Hey there! We built this tool to help parents like you find the perfect summer camps
            for your kids. Browse 500+ FCPA camps, filter by age, location, and dates —
            and plan your whole summer in one place.
          </p>

          <div className="bg-[oklch(0.96_0.01_85)] rounded-xl p-4">
            <p className="text-[oklch(0.35_0.01_265)] text-sm">
              <span className="font-semibold text-[oklch(0.25_0.01_265)]">100% free.</span>{" "}
              Made with care by the team at{" "}
              <a
                href="https://searchcradley.com?ref=ffxcamps-welcome"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[oklch(0.65_0.15_340)] font-semibold hover:underline"
              >
                Cradley
              </a>
              , where we help people find what matters most.
            </p>
          </div>

          <div className="flex flex-col gap-3 pt-2">
            <button
              onClick={onDismiss}
              className="w-full py-3 bg-[oklch(0.65_0.15_340)] hover:bg-[oklch(0.58_0.15_340)] text-white font-semibold rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-[oklch(0.65_0.15_340)] focus:ring-offset-2"
            >
              Start Exploring
            </button>
            <a
              href="https://searchcradley.com?ref=ffxcamps-welcome"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 text-center text-[oklch(0.5_0.01_265)] hover:text-[oklch(0.65_0.15_340)] text-sm font-medium transition-colors"
            >
              Learn more about Cradley →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function ModalMap({
  coordinates,
  location,
}: {
  coordinates: { lat: number; lng: number };
  location: string;
}) {
  const mapRef = React.useRef<HTMLDivElement>(null);
  const mapInstanceRef = React.useRef<any>(null);
  const [leafletReady, setLeafletReady] = useState(false);

  useEffect(() => {
    const L = (window as any).L;
    if (L) {
      setLeafletReady(true);
      return;
    }

    const existingScript = document.querySelector('script[src*="leaflet"]');
    if (!existingScript) {
      const script = document.createElement("script");
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.onload = () => setLeafletReady(true);
      document.head.appendChild(script);
    } else {
      existingScript.addEventListener("load", () => setLeafletReady(true));
    }
  }, []);

  useEffect(() => {
    const L = (window as any).L;
    if (!leafletReady || !L || !mapRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapRef.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView([coordinates.lat, coordinates.lng], 14);

    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
    ).addTo(map);

    const customIcon = L.divIcon({
      className: "custom-marker",
      html: `<div style="position: relative; width: 40px; height: 48px;">
        <svg width="40" height="48" viewBox="0 0 40 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 0C8.954 0 0 8.954 0 20c0 14.667 20 28 20 28s20-13.333 20-28C40 8.954 31.046 0 20 0z" fill="#1B4332"/>
          <path d="M20 2C10.059 2 2 10.059 2 20c0 13.333 18 25.333 18 25.333S38 33.333 38 20C38 10.059 29.941 2 20 2z" fill="#2D6A4F"/>
          <circle cx="20" cy="18" r="10" fill="#FDF8F3"/>
          <path d="M20 11l-6 10h12l-6-10z" fill="#E85D04" stroke="#C44D03" stroke-width="0.5"/>
          <line x1="20" y1="11" x2="20" y2="21" stroke="#C44D03" stroke-width="1"/>
        </svg>
      </div>`,
      iconSize: [40, 48],
      iconAnchor: [20, 48],
    });

    L.marker([coordinates.lat, coordinates.lng], { icon: customIcon }).addTo(
      map
    );

    mapInstanceRef.current = map;

    setTimeout(() => {
      map.invalidateSize();
    }, 100);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [coordinates, leafletReady]);

  return (
    <div className="mb-6 rounded-xl overflow-hidden border border-camp-sand">
      <div ref={mapRef} className="h-48 w-full" />
      <a
        href={`https://www.google.com/maps/search/?api=1&query=${coordinates.lat},${coordinates.lng}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 py-2.5 bg-camp-warm text-camp-bark/70 text-sm font-medium hover:bg-camp-sand transition-colors"
      >
        {Icons.location}
        <span>Open in Google Maps</span>
      </a>
    </div>
  );
}

function CampModal({
  camp,
  onClose,
  plannedCamps,
  onPlanCamp,
}: {
  camp: Camp;
  onClose: () => void;
  plannedCamps: Map<string, Camp[]>;
  onPlanCamp: (week: string, camp: Camp | null, action?: "add" | "remove") => void;
}) {
  const style = getCategoryStyle(camp.category);
  const modalRef = React.useRef<HTMLDivElement>(null);

  const weekCamps = plannedCamps.get(camp.dateRange) || [];
  const isInPlanner = weekCamps.some(c => c.catalogId === camp.catalogId);

  const handleAddToPlanner = () => {
    onPlanCamp(camp.dateRange, camp, "add");
  };

  const handleRemoveFromPlanner = () => {
    onPlanCamp(camp.dateRange, camp, "remove");
  };

  // Focus trap and escape key handling
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }

      if (e.key === "Tab" && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    // Focus the modal when it opens
    const closeButton = modalRef.current?.querySelector<HTMLElement>('button[aria-label="Close dialog"]');
    closeButton?.focus();

    // Prevent body scroll when modal is open
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-camp-pine/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 sm:p-4 animate-fade-in"
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="bg-white rounded-t-3xl sm:rounded-3xl max-w-xl w-full max-h-[85vh] sm:max-h-[90vh] overflow-y-auto shadow-camp-lg animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-2 bg-gradient-to-r from-camp-terracotta via-camp-sun to-camp-forest rounded-t-3xl" aria-hidden="true" />

        <div className="p-4 sm:p-6 pb-4 border-b border-camp-sand">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h2 id="modal-title" className="font-display text-xl sm:text-2xl font-bold text-camp-pine mb-2">
                {camp.title}
              </h2>
              <span
                className={`inline-block px-3 py-1 ${style.bg} ${style.text} text-xs font-bold uppercase tracking-wider rounded-lg`}
              >
                {camp.category}
              </span>
            </div>
            <button
              onClick={onClose}
              aria-label="Close dialog"
              className="p-2 hover:bg-camp-warm rounded-xl transition-colors text-camp-bark/50 hover:text-camp-bark focus:outline-none focus:ring-2 focus:ring-camp-terracotta"
            >
              <span aria-hidden="true">{Icons.x}</span>
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-6">
          <div className="bg-gradient-to-br from-camp-terracotta to-camp-terracotta-dark rounded-2xl p-4 sm:p-5 mb-4 sm:mb-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm font-medium mb-1">
                  Camp Fee
                </p>
                <p className="text-3xl sm:text-4xl font-display font-bold">
                  ${camp.fee}
                </p>
              </div>
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                {Icons.sparkles}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="bg-camp-warm rounded-xl p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-1 sm:mb-2 text-camp-terracotta">
                {Icons.location}
                <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-camp-bark/50">
                  Location
                </span>
              </div>
              <p className="font-semibold text-camp-pine text-sm sm:text-base">
                {camp.location}
              </p>
              <p className="text-xs sm:text-sm text-camp-bark/60">
                {camp.community}
              </p>
            </div>

            <div className="bg-camp-warm rounded-xl p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-1 sm:mb-2 text-camp-bark/50">
                {Icons.user}
                <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider">
                  Ages
                </span>
              </div>
              <p className="font-semibold text-camp-pine text-sm sm:text-base">
                {camp.minAge} - {camp.maxAge} years
              </p>
            </div>

            <div className="bg-camp-warm rounded-xl p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-1 sm:mb-2 text-camp-forest">
                {Icons.calendar}
                <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-camp-bark/50">
                  Dates
                </span>
              </div>
              <p className="font-semibold text-camp-pine text-sm sm:text-base">
                {camp.startDate.dayName}, {camp.startDate.monthName}{" "}
                {camp.startDate.day}
              </p>
              {camp.durationDays > 1 && (
                <p className="text-xs sm:text-sm text-camp-bark/60">
                  to {camp.endDate.dayName}, {camp.endDate.monthName}{" "}
                  {camp.endDate.day}
                </p>
              )}
            </div>

            <div className="bg-camp-warm rounded-xl p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-1 sm:mb-2 text-camp-sun">
                {Icons.clock}
                <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-camp-bark/50">
                  Time
                </span>
              </div>
              <p className="font-semibold text-camp-pine text-sm sm:text-base">
                {formatTime(camp.startTime)} - {formatTime(camp.endTime)}
              </p>
              <p className="text-xs sm:text-sm text-camp-bark/60">
                {camp.durationHours} hours
              </p>
            </div>
          </div>

          {camp.description && (
            <div className="mb-4 sm:mb-6">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-camp-bark/50 mb-2">
                About This Camp
              </h3>
              <p className="text-sm sm:text-base text-camp-bark/80 leading-relaxed">
                {camp.description}
              </p>
            </div>
          )}

          {camp.coordinates && (
            <ModalMap coordinates={camp.coordinates} location={camp.location} />
          )}

          <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6 text-sm">
            <div className="px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg font-medium">
              {camp.status}
            </div>
            <div className="text-camp-bark/50">
              ID: <span className="font-mono text-camp-bark">{camp.catalogId}</span>
            </div>
          </div>

          {/* Add to Planner section */}
          <div className="pt-4 border-t border-camp-sand">
            {isInPlanner ? (
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center justify-center gap-2 py-3 bg-camp-forest/10 rounded-xl text-camp-forest font-medium">
                  <Check className="w-5 h-5" />
                  <span>In Planner</span>
                </div>
                <button
                  onClick={handleRemoveFromPlanner}
                  className="px-4 py-3 border border-rose-200 text-rose-600 hover:bg-rose-50 font-medium rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-rose-400 focus:ring-offset-2"
                >
                  Remove
                </button>
              </div>
            ) : (
              <button
                onClick={handleAddToPlanner}
                className="w-full flex items-center justify-center gap-2 py-3 bg-camp-forest hover:bg-camp-pine text-white font-medium rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-camp-forest focus:ring-offset-2"
              >
                <CalendarPlus className="w-5 h-5" />
                <span>Add to Planner</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

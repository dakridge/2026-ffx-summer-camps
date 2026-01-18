"use client";

import React, { useState, useEffect, useMemo, useCallback, useDeferredValue } from "react";
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
} from "lucide-react";
import { Camp, CampsData, Filters } from "./lib/types";
import { Icons, getCategoryStyle } from "./lib/utils";
import { CampList, CampMap, CampCalendar, MultiWeekPlanner } from "./components";

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
};

// Haversine distance calculation (returns miles)
function getDistanceMiles(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

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
  };
}

export default function HomePage() {
  const [data, setData] = useState<CampsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [view, setView] = useState<"list" | "map" | "calendar" | "planner">(
    "list"
  );
  const [plannedCamps, setPlannedCamps] = useState<Map<string, Camp>>(
    new Map()
  );
  const [isSharedPlan, setIsSharedPlan] = useState(false);
  const [selectedCamp, setSelectedCamp] = useState<Camp | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [sortBy, setSortBy] = useState<
    "default" | "distance" | "price" | "priceDesc" | "date" | "name"
  >("default");

  // Defer filter values so typing remains responsive while filtering is computed in background
  const deferredFilters = useDeferredValue(filters);
  const deferredSortBy = useDeferredValue(sortBy);

  // Initialize state from URL params and localStorage on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setFilters(paramsToFilters(params));

    const v = params.get("view");
    if (v === "map" || v === "calendar" || v === "planner") setView(v);

    try {
      const savedFavorites = localStorage.getItem("camp-favorites");
      if (savedFavorites) setFavorites(new Set(JSON.parse(savedFavorites)));
    } catch {}

    try {
      const savedLocation = localStorage.getItem("camp-user-location");
      if (savedLocation) setUserLocation(JSON.parse(savedLocation));
    } catch {}
  }, []);

  // Persist user location to localStorage
  useEffect(() => {
    if (userLocation) {
      localStorage.setItem("camp-user-location", JSON.stringify(userLocation));
    }
  }, [userLocation]);

  // Persist favorites to localStorage
  useEffect(() => {
    localStorage.setItem("camp-favorites", JSON.stringify([...favorites]));
  }, [favorites]);

  // Persist planned camps to localStorage (skip while loading or viewing shared plan)
  useEffect(() => {
    if (loading) return;
    if (isSharedPlan) return;
    const obj: Record<string, Camp> = {};
    plannedCamps.forEach((camp, week) => {
      obj[week] = camp;
    });
    localStorage.setItem("camp-planner", JSON.stringify(obj));
  }, [plannedCamps, isSharedPlan, loading]);

  const setPlannerCamp = useCallback((week: string, camp: Camp | null) => {
    setPlannedCamps((prev) => {
      const next = new Map(prev);
      if (camp === null) {
        next.delete(week);
      } else {
        next.set(week, camp);
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
  }, []);

  const getNearMe = useCallback(() => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLocationLoading(false);
        setSortBy("distance");
      },
      (error) => {
        setLocationLoading(false);
        if (error.code === error.PERMISSION_DENIED) {
          alert(
            "Location access denied. You can click on the map to set your location manually."
          );
        } else {
          alert(
            "Unable to get your location. You can click on the map to set it manually."
          );
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const clearUserLocation = useCallback(() => {
    setUserLocation(null);
    localStorage.removeItem("camp-user-location");
    setSortBy((current) => current === "distance" ? "default" : current);
  }, []);

  // Debounce URL updates to avoid lag when typing
  useEffect(() => {
    if (loading) return;
    if (isSharedPlan) return;

    const timeoutId = setTimeout(() => {
      const params = filtersToParams(filters);
      if (view === "map") params.set("view", "map");
      if (view === "calendar") params.set("view", "calendar");
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
            const planPairs = planParam.split(",");
            const sharedPlan = new Map<string, Camp>();
            planPairs.forEach((pair) => {
              const [weekEncoded, catalogId] = pair.split(":");
              const week = decodeURIComponent(weekEncoded);
              const camp = d.camps.find((c: Camp) => c.catalogId === catalogId);
              if (camp) {
                sharedPlan.set(week, camp);
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
            const saved = localStorage.getItem("camp-planner");
            if (saved) {
              const parsed = JSON.parse(saved);
              const localPlan = new Map<string, Camp>();
              Object.entries(parsed).forEach(([week, campData]) => {
                const camp = d.camps.find(
                  (c: Camp) => c.catalogId === (campData as Camp).catalogId
                );
                if (camp) {
                  localPlan.set(week, camp);
                }
              });
              setPlannedCamps(localPlan);
            }
          } catch {}
        }
      });
  }, []);

  const filteredCamps = useMemo(() => {
    if (!data) return [];

    let camps = data.camps.filter((camp) => {
      if (showFavoritesOnly && !favorites.has(camp.catalogId)) return false;
      if (deferredFilters.search) {
        const search = deferredFilters.search.toLowerCase();
        const matchesSearch =
          camp.title.toLowerCase().includes(search) ||
          camp.location.toLowerCase().includes(search) ||
          camp.catalogId.toLowerCase().includes(search);
        if (!matchesSearch) return false;
      }
      if (
        deferredFilters.categories.length > 0 &&
        !deferredFilters.categories.includes(camp.category)
      )
        return false;
      if (
        deferredFilters.communities.length > 0 &&
        !deferredFilters.communities.includes(camp.community)
      )
        return false;
      if (
        deferredFilters.locations.length > 0 &&
        !deferredFilters.locations.includes(camp.location)
      )
        return false;
      if (
        deferredFilters.dateRanges.length > 0 &&
        !deferredFilters.dateRanges.includes(camp.dateRange)
      )
        return false;
      if (deferredFilters.childAge !== null && (camp.minAge > deferredFilters.childAge || camp.maxAge < deferredFilters.childAge)) return false;
      if (deferredFilters.maxFee !== null && camp.fee > deferredFilters.maxFee) return false;
      if (deferredFilters.startHour !== null && camp.startTime.hour > deferredFilters.startHour)
        return false;
      if (deferredFilters.endHour !== null && camp.endTime.hour < deferredFilters.endHour)
        return false;
      return true;
    });

    const campsWithDistance = camps.map((camp) => {
      let distance: number | null = null;
      if (userLocation && camp.coordinates) {
        distance = getDistanceMiles(
          userLocation.lat,
          userLocation.lng,
          camp.coordinates.lat,
          camp.coordinates.lng
        );
      }
      return { ...camp, distance };
    });

    if (deferredSortBy === "distance" && userLocation) {
      campsWithDistance.sort((a, b) => {
        if (a.distance === null) return 1;
        if (b.distance === null) return -1;
        return a.distance - b.distance;
      });
    } else if (deferredSortBy === "price") {
      campsWithDistance.sort((a, b) => a.fee - b.fee);
    } else if (deferredSortBy === "priceDesc") {
      campsWithDistance.sort((a, b) => b.fee - a.fee);
    } else if (deferredSortBy === "date") {
      campsWithDistance.sort(
        (a, b) =>
          new Date(a.startDate.iso).getTime() -
          new Date(b.startDate.iso).getTime()
      );
    } else if (deferredSortBy === "name") {
      campsWithDistance.sort((a, b) => a.title.localeCompare(b.title));
    }

    return campsWithDistance;
  }, [data, deferredFilters, favorites, showFavoritesOnly, userLocation, deferredSortBy]);

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
    filters.endHour !== null;

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
                  onClick={clearUserLocation}
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
            <p className="text-[10px] text-camp-bark/50 mt-1.5">
              {userLocation
                ? "Drag pin on map to adjust"
                : "Or click the map to set location"}
            </p>
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
              onClick={() => setView("calendar")}
              role="tab"
              aria-selected={view === "calendar"}
              aria-controls="camp-content"
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-camp-terracotta ${
                view === "calendar"
                  ? "bg-white text-camp-pine shadow-camp"
                  : "text-camp-bark/60 hover:text-camp-bark"
              }`}
            >
              <span aria-hidden="true">{Icons.calendar}</span>
              <span className="hidden sm:inline">Calendar</span>
              <span className="sr-only sm:hidden">Calendar view</span>
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
            />
          )}
          {view === "map" && (
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
          )}
          {view === "calendar" && (
            <CampCalendar camps={filteredCamps} onSelect={setSelectedCamp} />
          )}
          {view === "planner" && data && (
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
          )}
        </div>
      </main>

      {/* Modal */}
      {selectedCamp && (
        <CampModal camp={selectedCamp} onClose={() => setSelectedCamp(null)} />
      )}
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
}: {
  camp: Camp;
  onClose: () => void;
}) {
  const style = getCategoryStyle(camp.category);
  const modalRef = React.useRef<HTMLDivElement>(null);

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
                {camp.startTime.formatted} - {camp.endTime.formatted}
              </p>
              <p className="text-xs sm:text-sm text-camp-bark/60">
                {camp.durationHours} hours
              </p>
            </div>
          </div>

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
        </div>
      </div>
    </div>
  );
}

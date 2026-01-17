import React, { useState, useEffect, useMemo } from "react";
import { createRoot } from "react-dom/client";
import { Analytics } from "@vercel/analytics/react";
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
} from "lucide-react";

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
  locations: string[];
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
  locations: [],
  dateRanges: [],
  minAge: null,
  maxAge: null,
  maxFee: null,
  startHour: null,
  endHour: null,
};

// Category icons and colors
const categoryStyles: Record<string, { icon: string; bg: string; text: string; border: string }> = {
  "Active Games": { icon: "run", bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-200" },
  "Art": { icon: "palette", bg: "bg-pink-100", text: "text-pink-700", border: "border-pink-200" },
  "Cooking": { icon: "chef", bg: "bg-amber-100", text: "text-amber-700", border: "border-amber-200" },
  "Dance": { icon: "music", bg: "bg-purple-100", text: "text-purple-700", border: "border-purple-200" },
  "Drama": { icon: "theater", bg: "bg-rose-100", text: "text-rose-700", border: "border-rose-200" },
  "Horseback Riding": { icon: "horse", bg: "bg-yellow-100", text: "text-yellow-700", border: "border-yellow-200" },
  "Inclusion": { icon: "heart", bg: "bg-teal-100", text: "text-teal-700", border: "border-teal-200" },
  "Multi-Activity": { icon: "star", bg: "bg-camp-sun-light", text: "text-amber-700", border: "border-amber-200" },
  "Nature": { icon: "leaf", bg: "bg-emerald-100", text: "text-emerald-700", border: "border-emerald-200" },
  "Science": { icon: "beaker", bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-200" },
  "Sports": { icon: "ball", bg: "bg-red-100", text: "text-red-700", border: "border-red-200" },
  "STEM": { icon: "robot", bg: "bg-indigo-100", text: "text-indigo-700", border: "border-indigo-200" },
  "Teen": { icon: "users", bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-200" },
  "Water Activities": { icon: "wave", bg: "bg-cyan-100", text: "text-cyan-700", border: "border-cyan-200" },
};

function getCategoryStyle(category: string) {
  return categoryStyles[category] || { icon: "star", bg: "bg-gray-100", text: "text-gray-700", border: "border-gray-200" };
}

// URL params helpers
function filtersToParams(filters: Filters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.search) params.set("q", filters.search);
  if (filters.categories.length) params.set("cat", filters.categories.join(","));
  if (filters.communities.length) params.set("comm", filters.communities.join(","));
  if (filters.locations.length) params.set("loc", filters.locations.join(","));
  if (filters.dateRanges.length) params.set("week", filters.dateRanges.join("|"));
  if (filters.minAge !== null) params.set("minAge", filters.minAge.toString());
  if (filters.maxAge !== null) params.set("maxAge", filters.maxAge.toString());
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
    minAge: params.get("minAge") ? parseInt(params.get("minAge")!) : null,
    maxAge: params.get("maxAge") ? parseInt(params.get("maxAge")!) : null,
    maxFee: params.get("maxFee") ? parseInt(params.get("maxFee")!) : null,
    startHour: null,
    endHour: null,
  };
}

// Icon wrapper components for consistent sizing
const Icons = {
  search: <Search className="w-5 h-5" strokeWidth={2} />,
  location: <MapPin className="w-4 h-4" strokeWidth={2} />,
  calendar: <Calendar className="w-4 h-4" strokeWidth={2} />,
  clock: <Clock className="w-4 h-4" strokeWidth={2} />,
  user: <User className="w-4 h-4" strokeWidth={2} />,
  users: <Users className="w-4 h-4" strokeWidth={2} />,
  list: <List className="w-5 h-5" strokeWidth={2} />,
  map: <MapIcon className="w-5 h-5" strokeWidth={2} />,
  x: <X className="w-4 h-4" strokeWidth={2} />,
  tent: <Tent className="w-8 h-8" strokeWidth={1.5} />,
  sun: <Sun className="w-6 h-6 text-camp-sun" fill="currentColor" strokeWidth={0} />,
  tree: <TreePine className="w-5 h-5 text-camp-forest" />,
  dollar: <DollarSign className="w-4 h-4" strokeWidth={2} />,
  chevronDown: <ChevronDown className="w-4 h-4" strokeWidth={2} />,
  sparkles: <Sparkles className="w-5 h-5" fill="currentColor" strokeWidth={0} />,
  filter: <SlidersHorizontal className="w-5 h-5" strokeWidth={2} />,
};

function App() {
  const [data, setData] = useState<CampsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>(() => {
    const params = new URLSearchParams(window.location.search);
    return paramsToFilters(params);
  });
  const [view, setView] = useState<"list" | "map">(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("view") === "map" ? "map" : "list";
  });
  const [selectedCamp, setSelectedCamp] = useState<Camp | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const params = filtersToParams(filters);
    if (view === "map") params.set("view", "map");
    const newUrl = params.toString() ? `?${params.toString()}` : window.location.pathname;
    window.history.replaceState({}, "", newUrl);
  }, [filters, view]);

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
      if (filters.search) {
        const search = filters.search.toLowerCase();
        const matchesSearch =
          camp.title.toLowerCase().includes(search) ||
          camp.location.toLowerCase().includes(search) ||
          camp.catalogId.toLowerCase().includes(search);
        if (!matchesSearch) return false;
      }
      if (filters.categories.length > 0 && !filters.categories.includes(camp.category)) return false;
      if (filters.communities.length > 0 && !filters.communities.includes(camp.community)) return false;
      if (filters.locations.length > 0 && !filters.locations.includes(camp.location)) return false;
      if (filters.dateRanges.length > 0 && !filters.dateRanges.includes(camp.dateRange)) return false;
      if (filters.minAge !== null && camp.maxAge < filters.minAge) return false;
      if (filters.maxAge !== null && camp.minAge > filters.maxAge) return false;
      if (filters.maxFee !== null && camp.fee > filters.maxFee) return false;
      if (filters.startHour !== null && camp.startTime.hour > filters.startHour) return false;
      if (filters.endHour !== null && camp.endTime.hour < filters.endHour) return false;
      return true;
    });
  }, [data, filters]);

  const toggleFilter = (type: "categories" | "communities" | "dateRanges", value: string) => {
    setFilters((prev) => {
      const current = prev[type];
      const updated = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
      return { ...prev, [type]: updated };
    });
  };

  const clearFilters = () => setFilters(initialFilters);

  const hasActiveFilters = filters.search || filters.categories.length || filters.communities.length ||
    filters.locations.length || filters.dateRanges.length || filters.minAge !== null ||
    filters.maxAge !== null || filters.maxFee !== null || filters.startHour !== null || filters.endHour !== null;

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-camp-cream">
        <div className="text-center animate-fade-in">
          <div className="relative mb-6">
            <div className="w-16 h-16 mx-auto text-camp-terracotta animate-float">
              {Icons.tent}
            </div>
            <div className="absolute -top-2 -right-2">{Icons.sun}</div>
          </div>
          <div className="w-48 h-1.5 bg-camp-sand rounded-full mx-auto overflow-hidden">
            <div className="h-full bg-gradient-to-r from-camp-terracotta to-camp-sun animate-pulse rounded-full"
                 style={{ width: '60%' }} />
          </div>
          <p className="mt-4 text-camp-bark/70 font-medium">Loading adventures...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-camp-cream overflow-hidden">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        fixed lg:relative inset-y-0 left-0 z-50 lg:z-auto
        w-80 bg-white border-r border-camp-sand flex-shrink-0 flex flex-col
        transition-transform duration-300 ease-in-out
      `}>
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
                  <h1 className="font-display text-xl font-bold text-camp-pine tracking-tight">Camp Explorer</h1>
                  <p className="text-xs text-camp-bark/60 font-medium">Fairfax County Parks</p>
                </div>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-2 hover:bg-camp-warm rounded-lg transition-colors text-camp-bark/50 hover:text-camp-bark lg:hidden"
              >
                {Icons.x}
              </button>
            </div>
            <p className="text-sm text-camp-bark/70 mt-3">
              Discover the perfect summer adventure for your child
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
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
                onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                className="w-full pl-10 pr-4 py-2.5 bg-camp-warm border border-camp-sand rounded-xl text-sm text-camp-pine placeholder:text-camp-bark/40 transition-all hover:border-camp-terracotta/30"
              />
            </div>
          </div>

          {/* Age */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-camp-bark/50 mb-2">
              Child's Age
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="Min"
                min={3}
                max={18}
                value={filters.minAge ?? ""}
                onChange={(e) => setFilters((prev) => ({ ...prev, minAge: e.target.value ? parseInt(e.target.value) : null }))}
                className="flex-1 px-3 py-2.5 bg-camp-warm border border-camp-sand rounded-xl text-sm text-camp-pine placeholder:text-camp-bark/40 transition-all hover:border-camp-terracotta/30"
              />
              <span className="text-camp-bark/40 text-sm">to</span>
              <input
                type="number"
                placeholder="Max"
                min={3}
                max={18}
                value={filters.maxAge ?? ""}
                onChange={(e) => setFilters((prev) => ({ ...prev, maxAge: e.target.value ? parseInt(e.target.value) : null }))}
                className="flex-1 px-3 py-2.5 bg-camp-warm border border-camp-sand rounded-xl text-sm text-camp-pine placeholder:text-camp-bark/40 transition-all hover:border-camp-terracotta/30"
              />
            </div>
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
                onChange={(e) => setFilters((prev) => ({ ...prev, maxFee: e.target.value ? parseInt(e.target.value) : null }))}
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
                  onChange={(e) => setFilters((prev) => ({ ...prev, startHour: e.target.value ? parseInt(e.target.value) : null }))}
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
                  onChange={(e) => setFilters((prev) => ({ ...prev, endHour: e.target.value ? parseInt(e.target.value) : null }))}
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
                onChange={(e) => e.target.value && toggleFilter("communities", e.target.value)}
                className="w-full px-3 py-2.5 bg-camp-warm border border-camp-sand rounded-xl text-sm text-camp-bark/60 appearance-none cursor-pointer transition-all hover:border-camp-terracotta/30"
              >
                <option value="">Select community...</option>
                {data?.metadata.enums.communities.map((comm) => (
                  <option key={comm} value={comm}>{comm}</option>
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
                    onClick={() => setFilters((prev) => ({ ...prev, locations: prev.locations.filter((l) => l !== loc) }))}
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
                onChange={(e) => e.target.value && toggleFilter("dateRanges", e.target.value)}
                className="w-full px-3 py-2.5 bg-camp-warm border border-camp-sand rounded-xl text-sm text-camp-bark/60 appearance-none cursor-pointer transition-all hover:border-camp-terracotta/30"
              >
                <option value="">Select week...</option>
                {data?.metadata.enums.dateRanges.map((dr) => (
                  <option key={dr} value={dr}>{dr}</option>
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
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="bg-white border-b border-camp-sand px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="relative p-2 hover:bg-camp-warm rounded-lg transition-colors text-camp-bark/60 hover:text-camp-bark lg:hidden"
            >
              {Icons.filter}
              {hasActiveFilters && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-camp-terracotta rounded-full" />
              )}
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xl sm:text-2xl font-display font-bold text-camp-terracotta">{filteredCamps.length}</span>
              <span className="text-camp-bark/60 text-xs sm:text-sm">
                {filteredCamps.length === 1 ? "camp" : "camps"} found
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-camp-warm p-1 rounded-xl">
            <button
              onClick={() => setView("list")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                view === "list"
                  ? "bg-white text-camp-pine shadow-camp"
                  : "text-camp-bark/60 hover:text-camp-bark"
              }`}
            >
              {Icons.list}
              <span className="hidden sm:inline">List</span>
            </button>
            <button
              onClick={() => setView("map")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                view === "map"
                  ? "bg-white text-camp-pine shadow-camp"
                  : "text-camp-bark/60 hover:text-camp-bark"
              }`}
            >
              {Icons.map}
              <span className="hidden sm:inline">Map</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden relative">
          {view === "list" ? (
            <CampList camps={filteredCamps} onSelect={setSelectedCamp} />
          ) : (
            <CampMap
              camps={filteredCamps}
              onSelect={setSelectedCamp}
              onFilterLocation={(loc) => {
                setFilters((prev) => ({ ...prev, locations: [loc] }));
                setView("list");
              }}
            />
          )}
        </div>
      </main>

      {/* Modal */}
      {selectedCamp && <CampModal camp={selectedCamp} onClose={() => setSelectedCamp(null)} />}

      <Analytics />
    </div>
  );
}

function CampList({ camps, onSelect }: { camps: Camp[]; onSelect: (camp: Camp) => void }) {
  if (camps.length === 0) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center animate-fade-in max-w-sm">
          <div className="w-20 h-20 mx-auto mb-6 bg-camp-sand/50 rounded-2xl flex items-center justify-center text-camp-bark/30">
            {Icons.search}
          </div>
          <h3 className="font-display text-xl font-bold text-camp-pine mb-2">No camps found</h3>
          <p className="text-camp-bark/60 text-sm">
            Try adjusting your filters to discover more adventures
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6 bg-gradient-to-b from-camp-cream to-camp-warm">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
        {camps.map((camp, i) => (
          <div
            key={`${camp.catalogId}-${i}`}
            onClick={() => onSelect(camp)}
            className={`group bg-white rounded-2xl p-5 shadow-camp camp-card-hover cursor-pointer border border-transparent hover:border-camp-terracotta/20 animate-slide-up opacity-0 stagger-${Math.min((i % 6) + 1, 6)}`}
            style={{ animationFillMode: 'forwards' }}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 mb-3">
              <h3 className="font-display font-bold text-camp-pine leading-snug group-hover:text-camp-terracotta transition-colors">
                {camp.title}
              </h3>
              <div className="flex-shrink-0 px-3 py-1 bg-gradient-to-r from-camp-terracotta to-camp-terracotta-dark text-white font-bold text-sm rounded-lg shadow-sm">
                ${camp.fee}
              </div>
            </div>

            {/* Category badge */}
            {(() => {
              const style = getCategoryStyle(camp.category);
              return (
                <span className={`inline-block px-2.5 py-1 ${style.bg} ${style.text} text-[10px] font-bold uppercase tracking-wider rounded-md mb-4`}>
                  {camp.category}
                </span>
              );
            })()}

            {/* Details grid */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-start gap-2">
                <div className="mt-0.5 text-camp-terracotta">{Icons.location}</div>
                <div>
                  <div className="font-semibold text-camp-pine text-xs">{camp.location}</div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="mt-0.5 text-camp-forest">{Icons.calendar}</div>
                <div className="text-camp-bark/70 text-xs">
                  {camp.startDate.monthName} {camp.startDate.day}
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="mt-0.5 text-camp-sun">{Icons.clock}</div>
                <div className="text-camp-bark/70 text-xs">
                  {camp.startTime.formatted} - {camp.endTime.formatted}
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="mt-0.5 text-camp-bark/50">{Icons.user}</div>
                <div className="text-camp-bark/70 text-xs">
                  Ages {camp.minAge}-{camp.maxAge}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CampMap({ camps, onSelect, onFilterLocation }: { camps: Camp[]; onSelect: (camp: Camp) => void; onFilterLocation: (location: string) => void }) {
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
        leaflet.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png").addTo(mapInstanceRef.current);
        setMapReady(true);
      }
    };

    if (L) {
      initMap();
    } else {
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

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const locationGroups = new Map<string, Camp[]>();
    camps.forEach((camp) => {
      if (camp.coordinates) {
        const key = `${camp.coordinates.lat},${camp.coordinates.lng}`;
        if (!locationGroups.has(key)) locationGroups.set(key, []);
        locationGroups.get(key)!.push(camp);
      }
    });

    // Custom marker icon with better contrast
    const customIcon = L.divIcon({
      className: 'custom-marker',
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
      popupAnchor: [0, -48]
    });

    locationGroups.forEach((groupCamps, key) => {
      const [lat, lng] = key.split(",").map(Number);
      const marker = L.marker([lat, lng], { icon: customIcon }).addTo(mapInstanceRef.current);

      const campsList = groupCamps
        .slice(0, 10)
        .map(
          (c) =>
            `<div class="popup-camp" data-id="${c.catalogId}" style="padding: 10px 12px; background: #FAF5EF; border-radius: 10px; cursor: pointer; transition: background 0.15s; margin-bottom: 8px;">
              <strong style="display: block; font-size: 13px; color: #1B4332; margin-bottom: 4px; font-family: 'Fraunces', Georgia, serif;">${c.title}</strong>
              <span style="font-size: 11px; color: #6B4423;">$${c.fee} · Ages ${c.minAge}-${c.maxAge} · ${c.startDate.monthName} ${c.startDate.day}</span>
            </div>`
        )
        .join("");

      const moreText = groupCamps.length > 10 ? `<p style="font-size: 12px; color: #6B4423; text-align: center; margin-top: 8px; padding-top: 8px; border-top: 1px solid #F5EBE0;">+ ${groupCamps.length - 10} more camps</p>` : "";

      const popupContent = `
        <div class="map-popup" style="min-width: 300px; font-family: 'DM Sans', system-ui, sans-serif;">
          <h3 style="font-size: 16px; font-weight: 700; margin-bottom: 4px; color: #1B4332;">${groupCamps[0].location}</h3>
          <p style="font-size: 12px; color: #6B4423; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid #F5EBE0;">${groupCamps[0].community} · ${groupCamps.length} camps</p>
          <button class="popup-filter-btn" data-location="${groupCamps[0].location}" style="width: 100%; padding: 10px 14px; background: linear-gradient(135deg, #E85D04, #C44D03); color: white; border: none; border-radius: 10px; font-size: 13px; font-weight: 600; cursor: pointer; margin-bottom: 12px; transition: transform 0.15s;">Filter to this location</button>
          <div style="max-height: 200px; overflow-y: auto;">${campsList}</div>
          ${moreText}
        </div>
      `;

      const popup = L.popup({ maxHeight: 350, minWidth: 300 }).setContent(popupContent);
      marker.bindPopup(popup);

      marker.on("popupopen", () => {
        document.querySelectorAll(".popup-camp").forEach((el) => {
          (el as HTMLElement).onmouseenter = () => (el as HTMLElement).style.background = '#F5EBE0';
          (el as HTMLElement).onmouseleave = () => (el as HTMLElement).style.background = '#FAF5EF';
          el.addEventListener("click", () => {
            const campId = el.getAttribute("data-id");
            const camp = groupCamps.find((c) => c.catalogId === campId);
            if (camp) onSelect(camp);
          });
        });
        document.querySelectorAll(".popup-filter-btn").forEach((el) => {
          (el as HTMLElement).onmouseenter = () => (el as HTMLElement).style.transform = 'scale(1.02)';
          (el as HTMLElement).onmouseleave = () => (el as HTMLElement).style.transform = 'scale(1)';
          el.addEventListener("click", () => {
            const location = el.getAttribute("data-location");
            if (location) onFilterLocation(location);
          });
        });
      });

      markersRef.current.push(marker);
    });

    if (markersRef.current.length > 0) {
      const group = L.featureGroup(markersRef.current);
      mapInstanceRef.current.fitBounds(group.getBounds().pad(0.1));
    }
  }, [camps, onSelect, onFilterLocation, mapReady]);

  return (
    <div className="h-full w-full relative">
      <div id="map" ref={mapRef} className="h-full w-full" />
    </div>
  );
}

function ModalMap({ coordinates, location }: { coordinates: { lat: number; lng: number }; location: string }) {
  const mapRef = React.useRef<HTMLDivElement>(null);
  const mapInstanceRef = React.useRef<any>(null);
  const [leafletReady, setLeafletReady] = useState(false);

  // Load Leaflet if not already loaded
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

  // Initialize map once Leaflet is ready
  useEffect(() => {
    const L = (window as any).L;
    if (!leafletReady || !L || !mapRef.current) return;

    // Clean up existing map if any
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapRef.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView([coordinates.lat, coordinates.lng], 14);

    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png").addTo(map);

    const customIcon = L.divIcon({
      className: 'custom-marker',
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

    L.marker([coordinates.lat, coordinates.lng], { icon: customIcon }).addTo(map);

    mapInstanceRef.current = map;

    // Force map to recalculate size after modal animation
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

function CampModal({ camp, onClose }: { camp: Camp; onClose: () => void }) {
  const style = getCategoryStyle(camp.category);

  return (
    <div
      className="fixed inset-0 bg-camp-pine/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 sm:p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-3xl sm:rounded-3xl max-w-xl w-full max-h-[85vh] sm:max-h-[90vh] overflow-y-auto shadow-camp-lg animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Decorative header */}
        <div className="h-2 bg-gradient-to-r from-camp-terracotta via-camp-sun to-camp-forest rounded-t-3xl" />

        {/* Header */}
        <div className="p-4 sm:p-6 pb-4 border-b border-camp-sand">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h2 className="font-display text-xl sm:text-2xl font-bold text-camp-pine mb-2">{camp.title}</h2>
              <span className={`inline-block px-3 py-1 ${style.bg} ${style.text} text-xs font-bold uppercase tracking-wider rounded-lg`}>
                {camp.category}
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-camp-warm rounded-xl transition-colors text-camp-bark/50 hover:text-camp-bark"
            >
              {Icons.x}
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6">
          {/* Price highlight */}
          <div className="bg-gradient-to-br from-camp-terracotta to-camp-terracotta-dark rounded-2xl p-4 sm:p-5 mb-4 sm:mb-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm font-medium mb-1">Camp Fee</p>
                <p className="text-3xl sm:text-4xl font-display font-bold">${camp.fee}</p>
              </div>
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                {Icons.sparkles}
              </div>
            </div>
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="bg-camp-warm rounded-xl p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-1 sm:mb-2 text-camp-terracotta">
                {Icons.location}
                <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-camp-bark/50">Location</span>
              </div>
              <p className="font-semibold text-camp-pine text-sm sm:text-base">{camp.location}</p>
              <p className="text-xs sm:text-sm text-camp-bark/60">{camp.community}</p>
            </div>

            <div className="bg-camp-warm rounded-xl p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-1 sm:mb-2 text-camp-bark/50">
                {Icons.user}
                <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider">Ages</span>
              </div>
              <p className="font-semibold text-camp-pine text-sm sm:text-base">{camp.minAge} - {camp.maxAge} years</p>
            </div>

            <div className="bg-camp-warm rounded-xl p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-1 sm:mb-2 text-camp-forest">
                {Icons.calendar}
                <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-camp-bark/50">Dates</span>
              </div>
              <p className="font-semibold text-camp-pine text-sm sm:text-base">
                {camp.startDate.dayName}, {camp.startDate.monthName} {camp.startDate.day}
              </p>
              {camp.durationDays > 1 && (
                <p className="text-xs sm:text-sm text-camp-bark/60">
                  to {camp.endDate.dayName}, {camp.endDate.monthName} {camp.endDate.day}
                </p>
              )}
            </div>

            <div className="bg-camp-warm rounded-xl p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-1 sm:mb-2 text-camp-sun">
                {Icons.clock}
                <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-camp-bark/50">Time</span>
              </div>
              <p className="font-semibold text-camp-pine text-sm sm:text-base">
                {camp.startTime.formatted} - {camp.endTime.formatted}
              </p>
              <p className="text-xs sm:text-sm text-camp-bark/60">{camp.durationHours} hours</p>
            </div>
          </div>

          {/* Location Map */}
          {camp.coordinates && (
            <ModalMap coordinates={camp.coordinates} location={camp.location} />
          )}

          {/* Status & Catalog */}
          <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6 text-sm">
            <div className="px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg font-medium">
              {camp.status}
            </div>
            <div className="text-camp-bark/50">
              ID: <span className="font-mono text-camp-bark">{camp.catalogId}</span>
            </div>
          </div>

          {/* Register button */}
          <a
            href="https://www.fairfaxcounty.gov/parks/camps"
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full py-4 bg-camp-forest hover:bg-camp-pine text-white text-center font-bold rounded-xl transition-colors shadow-camp hover:shadow-camp-lg"
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

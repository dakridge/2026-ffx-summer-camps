import React, { useState, useEffect, useMemo } from "react";
import { createRoot } from "react-dom/client";
import { inject } from "@vercel/analytics";
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
  Printer,
  Check,
  AlertCircle,
  Link2,
  Download,
  Navigation,
  Crosshair,
} from "lucide-react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
} from "@react-pdf/renderer";

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
  distance?: number | null;
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
  heart: <Heart className="w-5 h-5" strokeWidth={2} />,
  heartFilled: <Heart className="w-5 h-5" fill="currentColor" strokeWidth={0} />,
  planner: <ClipboardList className="w-5 h-5" strokeWidth={2} />,
  printer: <Printer className="w-5 h-5" strokeWidth={2} />,
  check: <Check className="w-4 h-4" strokeWidth={2} />,
  alert: <AlertCircle className="w-4 h-4" strokeWidth={2} />,
  download: <Download className="w-5 h-5" strokeWidth={2} />,
};

// PDF Styles
const pdfStyles = StyleSheet.create({
  page: {
    padding: 35,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#1B4332",
  },
  header: {
    marginBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: "#2D6A4F",
    paddingBottom: 12,
  },
  title: {
    fontSize: 21,
    fontFamily: "Helvetica-Bold",
    color: "#1B4332",
    marginBottom: 3,
  },
  subtitle: {
    fontSize: 10,
    color: "#6B4423",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    backgroundColor: "#FAF5EF",
    padding: 12,
    borderRadius: 6,
  },
  summaryItem: {
    alignItems: "center",
  },
  summaryValue: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: "#2D6A4F",
  },
  summaryValueCost: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: "#E85D04",
  },
  summaryLabel: {
    fontSize: 8,
    color: "#6B4423",
    marginTop: 2,
  },
  weekRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#F5EBE0",
    paddingVertical: 8,
    alignItems: "center",
  },
  weekDate: {
    width: 90,
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
  },
  weekCamp: {
    flex: 1,
    paddingHorizontal: 10,
  },
  weekCampTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    marginBottom: 1,
  },
  weekCampDetails: {
    fontSize: 8,
    color: "#6B4423",
  },
  weekPrice: {
    width: 55,
    textAlign: "right",
    fontFamily: "Helvetica-Bold",
    color: "#E85D04",
    fontSize: 10,
  },
  emptyWeek: {
    color: "#9CA3AF",
    fontStyle: "italic",
    fontSize: 9,
  },
  footer: {
    marginTop: 20,
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: "#2D6A4F",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerTotal: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
  },
  footerValue: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: "#E85D04",
  },
  generated: {
    marginTop: 20,
    fontSize: 8,
    color: "#9CA3AF",
    textAlign: "center",
  },
});

interface PlannerPDFProps {
  weeks: { dateRange: string; startDate: ParsedDate; endDate: ParsedDate }[];
  plannedCamps: Map<string, Camp>;
  totalCost: number;
}

function PlannerPDF({ weeks, plannedCamps, totalCost }: PlannerPDFProps) {
  const weeksPlanned = plannedCamps.size;
  const weeksWithGaps = weeks.length - weeksPlanned;

  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        {/* Header */}
        <View style={pdfStyles.header}>
          <Text style={pdfStyles.title}>Summer Camp Plan 2026</Text>
          <Text style={pdfStyles.subtitle}>Fairfax County Park Authority</Text>
        </View>

        {/* Summary */}
        <View style={pdfStyles.summaryRow}>
          <View style={pdfStyles.summaryItem}>
            <Text style={pdfStyles.summaryValue}>{weeksPlanned}</Text>
            <Text style={pdfStyles.summaryLabel}>Weeks Planned</Text>
          </View>
          <View style={pdfStyles.summaryItem}>
            <Text style={pdfStyles.summaryValueCost}>${totalCost}</Text>
            <Text style={pdfStyles.summaryLabel}>Total Cost</Text>
          </View>
          <View style={pdfStyles.summaryItem}>
            <Text style={pdfStyles.summaryValue}>{weeksWithGaps}</Text>
            <Text style={pdfStyles.summaryLabel}>Weeks with Gaps</Text>
          </View>
        </View>

        {/* Week List */}
        {weeks.map((week) => {
          const camp = plannedCamps.get(week.dateRange);
          return (
            <View key={week.dateRange} style={pdfStyles.weekRow}>
              <Text style={pdfStyles.weekDate}>
                {week.startDate.monthName.slice(0, 3)} {week.startDate.day} - {week.endDate.day}
              </Text>
              <View style={pdfStyles.weekCamp}>
                {camp ? (
                  <>
                    <Text style={pdfStyles.weekCampTitle}>{camp.title}</Text>
                    <Text style={pdfStyles.weekCampDetails}>
                      {camp.location} · {camp.startTime.formatted} - {camp.endTime.formatted} · Ages {camp.minAge}-{camp.maxAge}
                    </Text>
                  </>
                ) : (
                  <Text style={pdfStyles.emptyWeek}>No camp selected</Text>
                )}
              </View>
              <Text style={pdfStyles.weekPrice}>
                {camp ? `$${camp.fee}` : "—"}
              </Text>
            </View>
          );
        })}

        {/* Footer */}
        <View style={pdfStyles.footer}>
          <Text style={pdfStyles.footerTotal}>Total Cost:</Text>
          <Text style={pdfStyles.footerValue}>${totalCost}</Text>
        </View>

        <Text style={pdfStyles.generated}>
          Generated on {new Date().toLocaleDateString()} · Summer Camp Explorer · fairfax-camps.vercel.app
        </Text>
      </Page>
    </Document>
  );
}

function App() {
  const [data, setData] = useState<CampsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>(() => {
    const params = new URLSearchParams(window.location.search);
    return paramsToFilters(params);
  });
  const [view, setView] = useState<"list" | "map" | "calendar" | "planner">(() => {
    const params = new URLSearchParams(window.location.search);
    const v = params.get("view");
    if (v === "map" || v === "calendar" || v === "planner") return v;
    return "list";
  });
  const [plannedCamps, setPlannedCamps] = useState<Map<string, Camp>>(new Map());
  const [isSharedPlan, setIsSharedPlan] = useState(false);
  const [selectedCamp, setSelectedCamp] = useState<Camp | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem("camp-favorites");
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(() => {
    try {
      const saved = localStorage.getItem("camp-user-location");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [locationLoading, setLocationLoading] = useState(false);
  const [sortBy, setSortBy] = useState<"default" | "distance" | "price" | "date">("default");

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
    if (loading) return; // Don't save while loading (we haven't loaded existing data yet)
    if (isSharedPlan) return;
    const obj: Record<string, Camp> = {};
    plannedCamps.forEach((camp, week) => {
      obj[week] = camp;
    });
    localStorage.setItem("camp-planner", JSON.stringify(obj));
  }, [plannedCamps, isSharedPlan, loading]);

  const setPlannerCamp = (week: string, camp: Camp | null) => {
    setPlannedCamps((prev) => {
      const next = new Map(prev);
      if (camp === null) {
        next.delete(week);
      } else {
        next.set(week, camp);
      }
      return next;
    });
  };

  const toggleFavorite = (catalogId: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(catalogId)) {
        next.delete(catalogId);
      } else {
        next.add(catalogId);
      }
      return next;
    });
  };

  const getNearMe = () => {
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
          alert("Location access denied. You can click on the map to set your location manually.");
        } else {
          alert("Unable to get your location. You can click on the map to set it manually.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const clearUserLocation = () => {
    setUserLocation(null);
    localStorage.removeItem("camp-user-location");
    if (sortBy === "distance") setSortBy("default");
  };

  useEffect(() => {
    // Don't update URL while loading (preserve plan param until we process it)
    if (loading) return;
    // Don't update URL when viewing a shared plan (preserve the plan param)
    if (isSharedPlan) return;

    const params = filtersToParams(filters);
    if (view === "map") params.set("view", "map");
    if (view === "calendar") params.set("view", "calendar");
    if (view === "planner") params.set("view", "planner");
    const newUrl = params.toString() ? `?${params.toString()}` : window.location.pathname;
    window.history.replaceState({}, "", newUrl);
  }, [filters, view, isSharedPlan, loading]);

  useEffect(() => {
    fetch("/api/camps")
      .then((res) => res.json())
      .then((d) => {
        setData(d);
        setLoading(false);

        // Check for shared plan in URL
        const params = new URLSearchParams(window.location.search);
        const planParam = params.get("plan");

        if (planParam) {
          // Decode shared plan from URL
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
          // Load from localStorage
          try {
            const saved = localStorage.getItem("camp-planner");
            if (saved) {
              const parsed = JSON.parse(saved);
              const localPlan = new Map<string, Camp>();
              Object.entries(parsed).forEach(([week, campData]) => {
                // Re-hydrate camp from current data to ensure it's up to date
                const camp = d.camps.find((c: Camp) => c.catalogId === (campData as Camp).catalogId);
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

    // Add distance to each camp if user location is set
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

    // Sort based on selected sort option
    if (sortBy === "distance" && userLocation) {
      campsWithDistance.sort((a, b) => {
        if (a.distance === null) return 1;
        if (b.distance === null) return -1;
        return a.distance - b.distance;
      });
    } else if (sortBy === "price") {
      campsWithDistance.sort((a, b) => a.fee - b.fee);
    } else if (sortBy === "date") {
      campsWithDistance.sort((a, b) =>
        new Date(a.startDate.iso).getTime() - new Date(b.startDate.iso).getTime()
      );
    }

    return campsWithDistance;
  }, [data, filters, favorites, showFavoritesOnly, userLocation, sortBy]);

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
              <Heart className="w-4 h-4" fill={showFavoritesOnly ? "currentColor" : "none"} />
              {showFavoritesOnly ? `Showing ${favorites.size} Favorites` : `Show ${favorites.size} Favorites`}
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
                  className="p-2.5 bg-camp-warm border border-camp-sand rounded-xl text-camp-bark/50 hover:text-camp-bark hover:border-camp-bark/30 transition-all"
                  title="Clear location"
                >
                  <X className="w-4 h-4" />
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
              {userLocation ? "Drag pin on map to adjust" : "Or click the map to set location"}
            </p>
          </div>

          {/* Sort */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-camp-bark/50 mb-2">
              Sort By
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="w-full px-3 py-2.5 bg-camp-warm border border-camp-sand rounded-xl text-sm text-camp-pine transition-all hover:border-camp-terracotta/30 cursor-pointer"
            >
              <option value="default">Default</option>
              <option value="distance" disabled={!userLocation}>Distance (nearest first)</option>
              <option value="price">Price (lowest first)</option>
              <option value="date">Date (earliest first)</option>
            </select>
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

          <div className="flex items-center gap-1 bg-camp-warm p-1 rounded-xl">
            <button
              onClick={() => setView("list")}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-all ${
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
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                view === "map"
                  ? "bg-white text-camp-pine shadow-camp"
                  : "text-camp-bark/60 hover:text-camp-bark"
              }`}
            >
              {Icons.map}
              <span className="hidden sm:inline">Map</span>
            </button>
            <button
              onClick={() => setView("calendar")}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                view === "calendar"
                  ? "bg-white text-camp-pine shadow-camp"
                  : "text-camp-bark/60 hover:text-camp-bark"
              }`}
            >
              {Icons.calendar}
              <span className="hidden sm:inline">Calendar</span>
            </button>
            <button
              onClick={() => setView("planner")}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                view === "planner"
                  ? "bg-white text-camp-pine shadow-camp"
                  : "text-camp-bark/60 hover:text-camp-bark"
              }`}
            >
              {Icons.planner}
              <span className="hidden sm:inline">Planner</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden relative">
          {view === "list" && (
            <CampList camps={filteredCamps} onSelect={setSelectedCamp} favorites={favorites} onToggleFavorite={toggleFavorite} />
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
                // Clear URL plan param
                const params = new URLSearchParams(window.location.search);
                params.delete("plan");
                params.set("view", "planner");
                const newUrl = params.toString() ? `?${params.toString()}` : window.location.pathname;
                window.history.replaceState({}, "", newUrl);
              }}
            />
          )}
        </div>
      </main>

      {/* Modal */}
      {selectedCamp && <CampModal camp={selectedCamp} onClose={() => setSelectedCamp(null)} />}
    </div>
  );
}

function CampList({ camps, onSelect, favorites, onToggleFavorite }: { camps: Camp[]; onSelect: (camp: Camp) => void; favorites: Set<string>; onToggleFavorite: (id: string) => void }) {
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
            <div className="flex items-start justify-between gap-2 mb-3">
              <h3 className="font-display font-bold text-camp-pine leading-snug group-hover:text-camp-terracotta transition-colors flex-1">
                {camp.title}
              </h3>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite(camp.catalogId);
                }}
                className={`flex-shrink-0 p-1.5 rounded-lg transition-all ${
                  favorites.has(camp.catalogId)
                    ? "text-rose-500 hover:bg-rose-50"
                    : "text-camp-bark/30 hover:text-rose-400 hover:bg-rose-50"
                }`}
              >
                <Heart className="w-5 h-5" fill={favorites.has(camp.catalogId) ? "currentColor" : "none"} />
              </button>
              <div className="flex-shrink-0 px-3 py-1 bg-gradient-to-r from-camp-terracotta to-camp-terracotta-dark text-white font-bold text-sm rounded-lg shadow-sm">
                ${camp.fee}
              </div>
            </div>

            {/* Category & Distance badges */}
            <div className="flex items-center gap-2 mb-4">
              {(() => {
                const style = getCategoryStyle(camp.category);
                return (
                  <span className={`inline-block px-2.5 py-1 ${style.bg} ${style.text} text-[10px] font-bold uppercase tracking-wider rounded-md`}>
                    {camp.category}
                  </span>
                );
              })()}
              {camp.distance !== null && camp.distance !== undefined && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-bold rounded-md">
                  <Navigation className="w-3 h-3" />
                  {camp.distance < 0.1 ? "< 0.1" : camp.distance.toFixed(1)} mi
                </span>
              )}
            </div>

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

function CampMap({
  camps,
  onSelect,
  onFilterLocation,
  userLocation,
  onSetUserLocation,
}: {
  camps: Camp[];
  onSelect: (camp: Camp) => void;
  onFilterLocation: (location: string) => void;
  userLocation: { lat: number; lng: number } | null;
  onSetUserLocation: (loc: { lat: number; lng: number }) => void;
}) {
  const mapRef = React.useRef<HTMLDivElement>(null);
  const mapInstanceRef = React.useRef<any>(null);
  const markersRef = React.useRef<any[]>([]);
  const userMarkerRef = React.useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    const L = (window as any).L;

    const initMap = () => {
      if (mapRef.current && !mapInstanceRef.current) {
        const leaflet = (window as any).L;
        mapInstanceRef.current = leaflet.map(mapRef.current).setView([38.85, -77.3], 10);
        leaflet.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png").addTo(mapInstanceRef.current);

        // Add click handler for setting user location
        mapInstanceRef.current.on("click", (e: any) => {
          onSetUserLocation({ lat: e.latlng.lat, lng: e.latlng.lng });
        });

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

  // User location marker
  useEffect(() => {
    const L = (window as any).L;
    if (!mapReady || !mapInstanceRef.current || !L) return;

    // Remove existing user marker
    if (userMarkerRef.current) {
      userMarkerRef.current.remove();
      userMarkerRef.current = null;
    }

    if (!userLocation) return;

    // Custom user location marker icon (blue/purple)
    const userIcon = L.divIcon({
      className: 'user-marker',
      html: `<div style="position: relative; width: 36px; height: 36px;">
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="18" cy="18" r="16" fill="#6366F1" stroke="#4F46E5" stroke-width="2"/>
          <circle cx="18" cy="18" r="6" fill="white"/>
        </svg>
      </div>`,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });

    const marker = L.marker([userLocation.lat, userLocation.lng], {
      icon: userIcon,
      draggable: true,
      zIndexOffset: 1000,
    }).addTo(mapInstanceRef.current);

    marker.bindTooltip("Your location (drag to adjust)", {
      permanent: false,
      direction: "top",
      offset: [0, -18],
    });

    marker.on("dragend", (e: any) => {
      const { lat, lng } = e.target.getLatLng();
      onSetUserLocation({ lat, lng });
    });

    userMarkerRef.current = marker;
  }, [userLocation, mapReady, onSetUserLocation]);

  return (
    <div className="h-full w-full relative">
      <div id="map" ref={mapRef} className="h-full w-full" />
      {!userLocation && (
        <div className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-auto bg-white/95 backdrop-blur-sm rounded-xl shadow-camp p-3 text-sm text-camp-bark/70 flex items-center gap-2">
          <Crosshair className="w-4 h-4 text-indigo-500 flex-shrink-0" />
          <span>Click anywhere on the map to set your location</span>
        </div>
      )}
    </div>
  );
}

function CampCalendar({ camps, onSelect }: { camps: Camp[]; onSelect: (camp: Camp) => void }) {
  const [collapsedWeeks, setCollapsedWeeks] = useState<Set<string>>(new Set());

  const toggleWeek = (dateRange: string) => {
    setCollapsedWeeks((prev) => {
      const next = new Set(prev);
      if (next.has(dateRange)) {
        next.delete(dateRange);
      } else {
        next.add(dateRange);
      }
      return next;
    });
  };

  // Group camps by week (dateRange)
  const campsByWeek = useMemo(() => {
    const grouped = new Map<string, Camp[]>();
    camps.forEach((camp) => {
      if (!grouped.has(camp.dateRange)) {
        grouped.set(camp.dateRange, []);
      }
      grouped.get(camp.dateRange)!.push(camp);
    });
    // Sort by start date
    return Array.from(grouped.entries()).sort((a, b) => {
      const campA = a[1][0];
      const campB = b[1][0];
      return new Date(campA.startDate.iso).getTime() - new Date(campB.startDate.iso).getTime();
    });
  }, [camps]);

  // Get all unique weeks from camps for display
  const allWeeks = useMemo(() => {
    const weeks = new Set<string>();
    camps.forEach((camp) => weeks.add(camp.dateRange));
    return Array.from(weeks).sort((a, b) => {
      const campA = camps.find((c) => c.dateRange === a);
      const campB = camps.find((c) => c.dateRange === b);
      if (!campA || !campB) return 0;
      return new Date(campA.startDate.iso).getTime() - new Date(campB.startDate.iso).getTime();
    });
  }, [camps]);

  if (camps.length === 0) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center animate-fade-in max-w-sm">
          <div className="w-20 h-20 mx-auto mb-6 bg-camp-sand/50 rounded-2xl flex items-center justify-center text-camp-bark/30">
            {Icons.calendar}
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
    <div className="h-full overflow-y-auto p-4 sm:p-6 bg-gradient-to-b from-camp-cream to-camp-warm">
      <div className="max-w-6xl mx-auto">
        {/* Calendar header */}
        <div className="mb-6 text-center">
          <h2 className="font-display text-2xl font-bold text-camp-pine mb-2">Summer Schedule</h2>
          <p className="text-camp-bark/60 text-sm">View camps by week to plan your summer</p>
        </div>

        {/* Week rows */}
        <div className="space-y-4">
          {campsByWeek.map(([dateRange, weekCamps], weekIndex) => {
            const firstCamp = weekCamps[0];
            const weekStart = firstCamp.startDate;

            return (
              <div
                key={dateRange}
                className={`bg-white rounded-2xl shadow-camp overflow-hidden animate-slide-up opacity-0 stagger-${Math.min(weekIndex + 1, 6)}`}
                style={{ animationFillMode: 'forwards' }}
              >
                {/* Week header */}
                <button
                  onClick={() => toggleWeek(dateRange)}
                  className="w-full bg-gradient-to-r from-camp-forest to-camp-forest-light px-4 sm:px-6 py-3 flex items-center justify-between cursor-pointer hover:from-camp-forest-light hover:to-camp-forest transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                      <span className="text-white font-display font-bold text-lg">{weekStart.day}</span>
                    </div>
                    <div className="text-left">
                      <h3 className="font-display font-bold text-white">
                        {weekStart.monthName} {weekStart.day} - {firstCamp.endDate.monthName} {firstCamp.endDate.day}
                      </h3>
                      <p className="text-white/70 text-xs">Week of {weekStart.monthName} {weekStart.day}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="bg-white/20 px-3 py-1 rounded-full">
                      <span className="text-white text-sm font-semibold">{weekCamps.length} camps</span>
                    </div>
                    <ChevronDown
                      className={`w-5 h-5 text-white transition-transform ${collapsedWeeks.has(dateRange) ? '-rotate-90' : ''}`}
                    />
                  </div>
                </button>

                {/* Camp cards for this week */}
                {!collapsedWeeks.has(dateRange) && (
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {weekCamps.map((camp, i) => {
                    const style = getCategoryStyle(camp.category);
                    return (
                      <div
                        key={`${camp.catalogId}-${i}`}
                        onClick={() => onSelect(camp)}
                        className="group bg-camp-warm hover:bg-camp-sand rounded-xl p-3 cursor-pointer transition-all hover:shadow-camp border border-transparent hover:border-camp-terracotta/20"
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h4 className="font-semibold text-camp-pine text-sm leading-tight group-hover:text-camp-terracotta transition-colors line-clamp-2">
                            {camp.title}
                          </h4>
                          <span className="flex-shrink-0 px-2 py-0.5 bg-camp-terracotta text-white text-xs font-bold rounded">
                            ${camp.fee}
                          </span>
                        </div>
                        <span className={`inline-block px-2 py-0.5 ${style.bg} ${style.text} text-[10px] font-bold uppercase tracking-wider rounded mb-2`}>
                          {camp.category}
                        </span>
                        <div className="flex items-center gap-3 text-xs text-camp-bark/60">
                          <span className="flex items-center gap-1">
                            {Icons.clock}
                            {camp.startTime.formatted}
                          </span>
                          <span className="flex items-center gap-1">
                            {Icons.user}
                            {camp.minAge}-{camp.maxAge}
                          </span>
                        </div>
                        <div className="mt-2 flex items-center gap-1 text-xs text-camp-bark/50">
                          {Icons.location}
                          <span className="truncate">{camp.location}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Summary footer */}
        <div className="mt-8 text-center text-camp-bark/50 text-sm">
          <p>{camps.length} camps across {campsByWeek.length} weeks</p>
        </div>
      </div>
    </div>
  );
}

interface MultiWeekPlannerProps {
  camps: Camp[];
  allCamps: Camp[];
  plannedCamps: Map<string, Camp>;
  onPlanCamp: (week: string, camp: Camp | null) => void;
  onSelect: (camp: Camp) => void;
  isSharedPlan: boolean;
  onSaveSharedPlan: () => void;
}

function MultiWeekPlanner({ camps, allCamps, plannedCamps, onPlanCamp, onSelect, isSharedPlan, onSaveSharedPlan }: MultiWeekPlannerProps) {
  const [expandedWeek, setExpandedWeek] = useState<string | null>(null);
  const [plannerSearch, setPlannerSearch] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);

  const generateShareLink = () => {
    const planPairs: string[] = [];
    plannedCamps.forEach((camp, week) => {
      planPairs.push(`${encodeURIComponent(week)}:${camp.catalogId}`);
    });
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}?view=planner&plan=${planPairs.join(",")}`;
  };

  const copyShareLink = async () => {
    const link = generateShareLink();
    try {
      await navigator.clipboard.writeText(link);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const input = document.createElement("input");
      input.value = link;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  // Get all unique weeks from ALL camps (not just filtered) sorted chronologically
  const allWeeks = useMemo(() => {
    const weekMap = new Map<string, { dateRange: string; startDate: ParsedDate; endDate: ParsedDate }>();
    allCamps.forEach((camp) => {
      if (!weekMap.has(camp.dateRange)) {
        weekMap.set(camp.dateRange, {
          dateRange: camp.dateRange,
          startDate: camp.startDate,
          endDate: camp.endDate,
        });
      }
    });
    return Array.from(weekMap.values()).sort(
      (a, b) => new Date(a.startDate.iso).getTime() - new Date(b.startDate.iso).getTime()
    );
  }, [allCamps]);

  // Get camps available for each week (from filtered camps)
  const campsByWeek = useMemo(() => {
    const grouped = new Map<string, Camp[]>();
    camps.forEach((camp) => {
      if (!grouped.has(camp.dateRange)) {
        grouped.set(camp.dateRange, []);
      }
      grouped.get(camp.dateRange)!.push(camp);
    });
    return grouped;
  }, [camps]);

  // Calculate totals
  const totalCost = useMemo(() => {
    let total = 0;
    plannedCamps.forEach((camp) => {
      total += camp.fee;
    });
    return total;
  }, [plannedCamps]);

  const weeksPlanned = plannedCamps.size;
  const weeksCovered = allWeeks.filter((w) => plannedCamps.has(w.dateRange)).length;
  const weeksWithGaps = allWeeks.length - weeksCovered;

  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const handleDownloadPDF = async () => {
    setIsGeneratingPDF(true);
    try {
      const blob = await pdf(
        <PlannerPDF weeks={allWeeks} plannedCamps={plannedCamps} totalCost={totalCost} />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `summer-camp-plan-${new Date().toISOString().split("T")[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to generate PDF:", err);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6 bg-gradient-to-b from-camp-cream to-camp-warm">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6 text-center">
          <h2 className="font-display text-2xl font-bold text-camp-pine mb-2">
            {isSharedPlan ? "Shared Plan" : "Summer Planner"}
          </h2>
          <p className="text-camp-bark/60 text-sm">
            {isSharedPlan
              ? "Someone shared this summer camp plan with you"
              : "Select one camp per week to build your summer schedule"}
          </p>
        </div>

        {/* Shared Plan Banner */}
        {isSharedPlan && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 print:hidden">
            <div className="flex items-start gap-3">
              <div className="text-amber-500 mt-0.5">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-amber-800 text-sm font-medium mb-2">
                  You're viewing a shared plan. Changes won't be saved.
                </p>
                <button
                  onClick={onSaveSharedPlan}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  Save to My Plan
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Summary Card */}
        <div className="bg-white rounded-2xl shadow-camp p-4 sm:p-6 mb-6 print:shadow-none print:border print:border-gray-200">
          <div className="grid grid-cols-3 gap-4 text-center mb-4">
            <div>
              <div className="text-2xl sm:text-3xl font-display font-bold text-camp-forest">{weeksPlanned}</div>
              <div className="text-xs text-camp-bark/60">Weeks Planned</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-display font-bold text-camp-terracotta">${totalCost}</div>
              <div className="text-xs text-camp-bark/60">Total Cost</div>
            </div>
            <div>
              <div className={`text-2xl sm:text-3xl font-display font-bold ${weeksWithGaps > 0 ? 'text-amber-500' : 'text-camp-forest'}`}>
                {weeksWithGaps}
              </div>
              <div className="text-xs text-camp-bark/60">Weeks with Gaps</div>
            </div>
          </div>

          {weeksPlanned > 0 && (
            <div className="flex gap-2 print:hidden">
              <button
                onClick={copyShareLink}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  linkCopied
                    ? "bg-camp-forest text-white"
                    : "bg-camp-terracotta hover:bg-camp-terracotta-dark text-white"
                }`}
              >
                {linkCopied ? (
                  <>
                    <Check className="w-4 h-4" />
                    Link Copied!
                  </>
                ) : (
                  <>
                    <Link2 className="w-4 h-4" />
                    Share Plan
                  </>
                )}
              </button>
              <button
                onClick={handleDownloadPDF}
                disabled={isGeneratingPDF}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-camp-forest hover:bg-camp-pine disabled:bg-camp-forest/50 text-white rounded-xl text-sm font-medium transition-colors"
              >
                {isGeneratingPDF ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    {Icons.download}
                    Download PDF
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Week Grid */}
        <div className="space-y-3">
          {allWeeks.map((week, i) => {
            const plannedCamp = plannedCamps.get(week.dateRange);
            const availableCamps = campsByWeek.get(week.dateRange) || [];
            const isExpanded = expandedWeek === week.dateRange;
            const hasAvailableCamps = availableCamps.length > 0;

            return (
              <div
                key={week.dateRange}
                className={`bg-white rounded-2xl shadow-camp overflow-hidden transition-all animate-slide-up opacity-0 stagger-${Math.min(i + 1, 6)} print:shadow-none print:border print:border-gray-200`}
                style={{ animationFillMode: 'forwards' }}
              >
                {/* Week Row */}
                <div
                  className={`px-4 py-3 flex items-center justify-between gap-3 ${
                    plannedCamp ? 'bg-camp-forest/5' : ''
                  }`}
                >
                  {/* Week info */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      plannedCamp ? 'bg-camp-forest text-white' : 'bg-camp-sand text-camp-bark/50'
                    }`}>
                      <span className="font-display font-bold text-sm">{week.startDate.day}</span>
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-camp-pine text-sm truncate">
                        {week.startDate.monthName} {week.startDate.day} - {week.endDate.monthName} {week.endDate.day}
                      </h3>
                      {plannedCamp ? (
                        <p className="text-xs text-camp-forest font-medium truncate">{plannedCamp.title}</p>
                      ) : (
                        <p className="text-xs text-camp-bark/50">
                          {hasAvailableCamps ? `${availableCamps.length} camps available` : 'No camps match filters'}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {plannedCamp && (
                      <span className="px-2 py-1 bg-camp-terracotta text-white text-xs font-bold rounded print:bg-gray-100 print:text-gray-800">
                        ${plannedCamp.fee}
                      </span>
                    )}
                    {plannedCamp ? (
                      <button
                        onClick={() => onPlanCamp(week.dateRange, null)}
                        className="p-2 text-camp-bark/40 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors print:hidden"
                        title="Remove from plan"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    ) : hasAvailableCamps ? (
                      <button
                        onClick={() => {
                          setExpandedWeek(isExpanded ? null : week.dateRange);
                          if (isExpanded) setPlannerSearch("");
                        }}
                        className="px-3 py-1.5 bg-camp-forest text-white text-xs font-semibold rounded-lg hover:bg-camp-pine transition-colors print:hidden"
                      >
                        {isExpanded ? 'Close' : 'Select'}
                      </button>
                    ) : (
                      <span className="px-3 py-1.5 bg-camp-sand text-camp-bark/40 text-xs font-medium rounded-lg print:hidden">
                        No options
                      </span>
                    )}
                  </div>
                </div>

                {/* Expanded camp selection */}
                {isExpanded && hasAvailableCamps && (() => {
                  const searchLower = plannerSearch.toLowerCase();
                  const filteredCamps = plannerSearch
                    ? availableCamps.filter((c) =>
                        c.title.toLowerCase().includes(searchLower) ||
                        c.category.toLowerCase().includes(searchLower) ||
                        c.location.toLowerCase().includes(searchLower)
                      )
                    : availableCamps;

                  return (
                    <div className="border-t border-camp-sand p-3 bg-camp-warm/50 print:hidden">
                      {/* Search input */}
                      <div className="relative mb-3">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-camp-bark/40">
                          {Icons.search}
                        </div>
                        <input
                          type="text"
                          placeholder="Search camps..."
                          value={plannerSearch}
                          onChange={(e) => setPlannerSearch(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 bg-white border border-camp-sand rounded-xl text-sm text-camp-pine placeholder:text-camp-bark/40 transition-all hover:border-camp-terracotta/30 focus:border-camp-terracotta/50"
                        />
                      </div>

                      {filteredCamps.length === 0 ? (
                        <div className="text-center py-4 text-camp-bark/50 text-sm">
                          No camps match "{plannerSearch}"
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                          {filteredCamps.map((camp, j) => {
                            const style = getCategoryStyle(camp.category);
                            return (
                              <div
                                key={`${camp.catalogId}-${j}`}
                                className="bg-white rounded-xl p-3 border border-camp-sand hover:border-camp-terracotta/30 transition-all"
                              >
                                <div className="flex items-start justify-between gap-2 mb-2">
                                  <h4
                                    onClick={() => onSelect(camp)}
                                    className="font-semibold text-camp-pine text-sm leading-tight cursor-pointer hover:text-camp-terracotta transition-colors line-clamp-2"
                                  >
                                    {camp.title}
                                  </h4>
                                  <span className="flex-shrink-0 px-2 py-0.5 bg-camp-terracotta text-white text-xs font-bold rounded">
                                    ${camp.fee}
                                  </span>
                                </div>
                                <span className={`inline-block px-2 py-0.5 ${style.bg} ${style.text} text-[10px] font-bold uppercase tracking-wider rounded mb-2`}>
                                  {camp.category}
                                </span>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2 text-xs text-camp-bark/60">
                                    <span className="flex items-center gap-1">
                                      {Icons.clock}
                                      {camp.startTime.formatted}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      {Icons.user}
                                      {camp.minAge}-{camp.maxAge}
                                    </span>
                                  </div>
                                  <button
                                    onClick={() => {
                                      onPlanCamp(week.dateRange, camp);
                                      setExpandedWeek(null);
                                      setPlannerSearch("");
                                    }}
                                    className="px-2 py-1 bg-camp-forest text-white text-xs font-semibold rounded hover:bg-camp-pine transition-colors"
                                  >
                                    Add
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </div>

        {/* Print-only summary */}
        <div className="hidden print:block mt-8 pt-4 border-t border-gray-200">
          <h3 className="font-display font-bold text-lg mb-2">Planned Camps Summary</h3>
          <ul className="space-y-1 text-sm">
            {allWeeks.map((week) => {
              const camp = plannedCamps.get(week.dateRange);
              return (
                <li key={week.dateRange} className="flex justify-between">
                  <span>{week.startDate.monthName} {week.startDate.day}:</span>
                  <span className="font-medium">{camp ? `${camp.title} - $${camp.fee}` : '—'}</span>
                </li>
              );
            })}
          </ul>
          <div className="mt-4 pt-2 border-t border-gray-200 font-bold flex justify-between">
            <span>Total:</span>
            <span>${totalCost}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-camp-bark/50 text-sm print:hidden">
          <p>{allWeeks.length} weeks of summer · {camps.length} camps available with current filters</p>
        </div>
      </div>
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

// Initialize Vercel Analytics
inject();

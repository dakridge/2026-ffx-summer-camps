"use client";

import React, { useState, useMemo, memo, useEffect } from "react";
import { ChevronDown, Navigation, CalendarPlus, Check, Minus, ChevronsUpDown, ChevronsDownUp, MapPin, Tag, Building2 } from "lucide-react";
import { Camp } from "../lib/types";
import { Icons, getCategoryStyle, formatTime } from "../lib/utils";

const STORAGE_KEY = "calendar-collapsed-groups";
const GROUP_BY_KEY = "calendar-group-by";

type GroupByOption = "week" | "location" | "category" | "community";

const GROUP_BY_OPTIONS: { value: GroupByOption; label: string }[] = [
  { value: "week", label: "Week" },
  { value: "location", label: "Location" },
  { value: "category", label: "Category" },
  { value: "community", label: "Community" },
];

interface CampCalendarProps {
  camps: Camp[];
  onSelect: (camp: Camp) => void;
  plannedCamps: Map<string, Camp[]>;
  onPlanCamp: (week: string, camp: Camp | null, action?: "add" | "remove") => void;
}

export const CampCalendar = memo(function CampCalendar({ camps, onSelect, plannedCamps, onPlanCamp }: CampCalendarProps) {
  const [groupBy, setGroupBy] = useState<GroupByOption>(() => {
    if (typeof window === "undefined") return "week";
    try {
      const saved = localStorage.getItem(GROUP_BY_KEY);
      if (saved && ["week", "location", "category", "community"].includes(saved)) {
        return saved as GroupByOption;
      }
      return "week";
    } catch {
      return "week";
    }
  });

  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Persist groupBy to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(GROUP_BY_KEY, groupBy);
    } catch {
      // Ignore storage errors
    }
  }, [groupBy]);

  // Persist collapsed state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...collapsedGroups]));
    } catch {
      // Ignore storage errors
    }
  }, [collapsedGroups]);

  const isInPlanner = (camp: Camp): boolean => {
    const weekCamps = plannedCamps.get(camp.dateRange);
    return weekCamps?.some(c => c.catalogId === camp.catalogId) ?? false;
  };

  const handleTogglePlanner = (camp: Camp, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isInPlanner(camp)) {
      onPlanCamp(camp.dateRange, camp, "remove");
    } else {
      onPlanCamp(camp.dateRange, camp, "add");
    }
  };

  const toggleGroup = (groupKey: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupKey)) {
        next.delete(groupKey);
      } else {
        next.add(groupKey);
      }
      return next;
    });
  };

  // Clear collapsed state when groupBy changes
  const handleGroupByChange = (newGroupBy: GroupByOption) => {
    setCollapsedGroups(new Set());
    setGroupBy(newGroupBy);
  };

  const groupedCamps = useMemo(() => {
    const grouped = new Map<string, Camp[]>();

    const getGroupKey = (camp: Camp): string => {
      switch (groupBy) {
        case "week":
          return camp.dateRange || "Unknown Week";
        case "location":
          return camp.location || "Unknown Location";
        case "category":
          return camp.category || "Uncategorized";
        case "community":
          return camp.community || "Unknown Community";
        default:
          return camp.dateRange || "Unknown";
      }
    };

    camps.forEach((camp) => {
      const key = getGroupKey(camp);
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(camp);
    });

    // Sort groups based on groupBy type
    return Array.from(grouped.entries()).sort((a, b) => {
      if (groupBy === "week") {
        // Sort by start date for weeks
        const campA = a[1][0];
        const campB = b[1][0];
        return (
          new Date(campA.startDate.iso).getTime() -
          new Date(campB.startDate.iso).getTime()
        );
      }
      // Alphabetical sort for other groupings, handling undefined/empty values
      const keyA = a[0] || "";
      const keyB = b[0] || "";
      return keyA.localeCompare(keyB);
    });
  }, [camps, groupBy]);

  const collapseAll = () => {
    const allKeys = groupedCamps.map(([key]) => key);
    setCollapsedGroups(new Set(allKeys));
  };

  const expandAll = () => {
    setCollapsedGroups(new Set());
  };

  const allCollapsed = groupedCamps.length > 0 && collapsedGroups.size === groupedCamps.length;
  const allExpanded = collapsedGroups.size === 0;

  if (camps.length === 0) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center animate-fade-in max-w-sm">
          <div className="w-20 h-20 mx-auto mb-6 bg-camp-sand/50 rounded-2xl flex items-center justify-center text-camp-bark/30">
            {Icons.calendar}
          </div>
          <h3 className="font-display text-xl font-bold text-camp-pine mb-2">
            No camps found
          </h3>
          <p className="text-camp-bark/60 text-sm">
            Try adjusting your filters to discover more adventures
          </p>
        </div>
      </div>
    );
  }

  const getSubtitle = () => {
    switch (groupBy) {
      case "week":
        return "View camps by week to plan your summer";
      case "location":
        return "Browse camps by location";
      case "category":
        return "Explore camps by activity type";
      case "community":
        return "Find camps in your community";
      default:
        return "View camps by week to plan your summer";
    }
  };

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6 bg-gradient-to-b from-camp-cream to-camp-warm">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 text-center">
          <h2 className="font-display text-2xl font-bold text-camp-pine mb-2">
            Summer Schedule
          </h2>
          <p className="text-camp-bark/60 text-sm">
            {getSubtitle()}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row justify-center items-center gap-3 mb-4">
          {/* Group by selector */}
          <div className="flex items-center gap-2">
            <label htmlFor="group-by" className="text-sm font-medium text-camp-bark/70">
              Group by:
            </label>
            <select
              id="group-by"
              value={groupBy}
              onChange={(e) => handleGroupByChange(e.target.value as GroupByOption)}
              className="px-3 py-1.5 text-sm font-medium rounded-lg border border-camp-forest/20 bg-white text-camp-pine focus:outline-none focus:ring-2 focus:ring-camp-forest cursor-pointer"
            >
              {GROUP_BY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Expand/Collapse buttons */}
          <div className="flex gap-2">
            <button
              onClick={expandAll}
              disabled={allExpanded}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-camp-forest disabled:opacity-50 disabled:cursor-not-allowed bg-camp-forest/10 text-camp-forest hover:bg-camp-forest hover:text-white"
            >
              <ChevronsUpDown className="w-4 h-4" aria-hidden="true" />
              Expand All
            </button>
            <button
              onClick={collapseAll}
              disabled={allCollapsed}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-camp-forest disabled:opacity-50 disabled:cursor-not-allowed bg-camp-forest/10 text-camp-forest hover:bg-camp-forest hover:text-white"
            >
              <ChevronsDownUp className="w-4 h-4" aria-hidden="true" />
              Collapse All
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {groupedCamps.map(([groupKey, groupCamps], groupIndex) => {
            const firstCamp = groupCamps[0];

            // Render header content based on groupBy type
            const renderHeaderContent = () => {
              switch (groupBy) {
                case "week": {
                  const weekStart = firstCamp.startDate;
                  return (
                    <>
                      <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                        <span className="text-white font-display font-bold text-lg">
                          {weekStart.day}
                        </span>
                      </div>
                      <div className="text-left">
                        <h3 className="font-display font-bold text-white">
                          {weekStart.monthName} {weekStart.day} -{" "}
                          {firstCamp.endDate.monthName} {firstCamp.endDate.day}
                        </h3>
                        <p className="text-white/70 text-xs">
                          Week of {weekStart.monthName} {weekStart.day}
                        </p>
                      </div>
                    </>
                  );
                }
                case "location":
                  return (
                    <>
                      <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-white">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <h3 className="font-display font-bold text-white">
                          {groupKey}
                        </h3>
                        <p className="text-white/70 text-xs">
                          {firstCamp.community}
                        </p>
                      </div>
                    </>
                  );
                case "category": {
                  const style = getCategoryStyle(groupKey);
                  return (
                    <>
                      <div className={`w-10 h-10 ${style.bg} rounded-xl flex items-center justify-center`}>
                        <Tag className={`w-5 h-5 ${style.text}`} />
                      </div>
                      <div className="text-left">
                        <h3 className="font-display font-bold text-white">
                          {groupKey}
                        </h3>
                        <p className="text-white/70 text-xs">
                          Activity type
                        </p>
                      </div>
                    </>
                  );
                }
                case "community":
                  return (
                    <>
                      <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-white">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <h3 className="font-display font-bold text-white">
                          {groupKey}
                        </h3>
                        <p className="text-white/70 text-xs">
                          Community area
                        </p>
                      </div>
                    </>
                  );
                default:
                  return null;
              }
            };

            return (
              <div
                key={groupKey}
                className={`bg-white rounded-2xl shadow-camp overflow-hidden animate-slide-up opacity-0 stagger-${Math.min(
                  groupIndex + 1,
                  6
                )}`}
                style={{ animationFillMode: "forwards" }}
              >
                <button
                  onClick={() => toggleGroup(groupKey)}
                  aria-expanded={!collapsedGroups.has(groupKey)}
                  aria-controls={`group-${groupIndex}`}
                  className="w-full bg-gradient-to-r from-camp-forest to-camp-forest-light px-4 sm:px-6 py-3 flex items-center justify-between cursor-pointer hover:from-camp-forest-light hover:to-camp-forest transition-all focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-camp-forest"
                >
                  <div className="flex items-center gap-3">
                    {renderHeaderContent()}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="bg-white/20 px-3 py-1 rounded-full">
                      <span className="text-white text-sm font-semibold">
                        {groupCamps.length} camps
                      </span>
                    </div>
                    <ChevronDown
                      className={`w-5 h-5 text-white transition-transform ${
                        collapsedGroups.has(groupKey) ? "-rotate-90" : ""
                      }`}
                      aria-hidden="true"
                    />
                  </div>
                </button>

                {!collapsedGroups.has(groupKey) && (
                  <div
                    id={`group-${groupIndex}`}
                    className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3"
                  >
                    {groupCamps.map((camp, i) => {
                      const style = getCategoryStyle(camp.category);
                      return (
                        <article
                          key={`${camp.catalogId}-${i}`}
                          role="button"
                          tabIndex={0}
                          onClick={() => onSelect(camp)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              onSelect(camp);
                            }
                          }}
                          aria-label={`${camp.title}, $${camp.fee}, ${formatTime(camp.startTime)}, Ages ${camp.minAge}-${camp.maxAge}`}
                          className="group bg-camp-warm hover:bg-camp-sand rounded-xl p-3 cursor-pointer transition-all hover:shadow-camp border border-transparent hover:border-camp-terracotta/20 focus:outline-none focus:ring-2 focus:ring-camp-terracotta"
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h4 className="font-semibold text-camp-pine text-sm leading-tight group-hover:text-camp-terracotta transition-colors line-clamp-2">
                              {camp.title}
                            </h4>
                            <span className="flex-shrink-0 px-2 py-0.5 bg-camp-terracotta text-white text-xs font-bold rounded">
                              ${camp.fee}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <span
                              className={`inline-block px-2 py-0.5 ${style.bg} ${style.text} text-[10px] font-bold uppercase tracking-wider rounded`}
                            >
                              {camp.category}
                            </span>
                            {camp.distance !== null && camp.distance !== undefined && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] font-bold rounded">
                                <Navigation className="w-3 h-3" />
                                {camp.distance < 0.1 ? "< 0.1" : camp.distance.toFixed(1)} mi
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-camp-bark/60">
                            <span className="flex items-center gap-1">
                              {Icons.clock}
                              {formatTime(camp.startTime)}
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
                          {/* Add to Planner button */}
                          <div className="mt-3 pt-2 border-t border-camp-sand/50">
                            {isInPlanner(camp) ? (
                              <button
                                onClick={(e) => handleTogglePlanner(camp, e)}
                                onKeyDown={(e) => e.stopPropagation()}
                                aria-label={`Remove ${camp.title} from planner`}
                                className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-camp-forest text-white text-xs font-medium rounded-lg hover:bg-rose-600 transition-colors focus:outline-none focus:ring-2 focus:ring-camp-forest group"
                              >
                                <Check className="w-3.5 h-3.5 group-hover:hidden" aria-hidden="true" />
                                <Minus className="w-3.5 h-3.5 hidden group-hover:block" aria-hidden="true" />
                                <span className="group-hover:hidden">In Planner</span>
                                <span className="hidden group-hover:inline">Remove</span>
                              </button>
                            ) : (
                              <button
                                onClick={(e) => handleTogglePlanner(camp, e)}
                                onKeyDown={(e) => e.stopPropagation()}
                                aria-label={`Add ${camp.title} to planner`}
                                className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-camp-forest/10 hover:bg-camp-forest hover:text-white text-camp-forest text-xs font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-camp-forest"
                              >
                                <CalendarPlus className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>Add to Planner</span>
                              </button>
                            )}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-8 text-center text-camp-bark/50 text-sm">
          <p>
            {camps.length} camps across {groupedCamps.length} {groupBy === "week" ? "weeks" : groupBy === "location" ? "locations" : groupBy === "category" ? "categories" : "communities"}
          </p>
        </div>
      </div>
    </div>
  );
});

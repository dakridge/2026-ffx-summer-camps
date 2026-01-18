"use client";

import React, { useState, useMemo, memo } from "react";
import { ChevronDown, Navigation, CalendarPlus, Check, ArrowRightLeft, X } from "lucide-react";
import { Camp } from "../lib/types";
import { Icons, getCategoryStyle } from "../lib/utils";

interface CampCalendarProps {
  camps: Camp[];
  onSelect: (camp: Camp) => void;
  plannedCamps: Map<string, Camp>;
  onPlanCamp: (week: string, camp: Camp | null) => void;
}

export const CampCalendar = memo(function CampCalendar({ camps, onSelect, plannedCamps, onPlanCamp }: CampCalendarProps) {
  const [collapsedWeeks, setCollapsedWeeks] = useState<Set<string>>(new Set());
  const [conflictCamp, setConflictCamp] = useState<Camp | null>(null);
  const [existingCamp, setExistingCamp] = useState<Camp | null>(null);

  const handleAddToPlanner = (camp: Camp, e: React.MouseEvent) => {
    e.stopPropagation();
    const existing = plannedCamps.get(camp.dateRange);
    if (existing) {
      setConflictCamp(camp);
      setExistingCamp(existing);
    } else {
      onPlanCamp(camp.dateRange, camp);
    }
  };

  const handleSwap = () => {
    if (conflictCamp) {
      onPlanCamp(conflictCamp.dateRange, conflictCamp);
      setConflictCamp(null);
      setExistingCamp(null);
    }
  };

  const handleCloseConflict = () => {
    setConflictCamp(null);
    setExistingCamp(null);
  };

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

  const campsByWeek = useMemo(() => {
    const grouped = new Map<string, Camp[]>();
    camps.forEach((camp) => {
      if (!grouped.has(camp.dateRange)) {
        grouped.set(camp.dateRange, []);
      }
      grouped.get(camp.dateRange)!.push(camp);
    });
    return Array.from(grouped.entries()).sort((a, b) => {
      const campA = a[1][0];
      const campB = b[1][0];
      return (
        new Date(campA.startDate.iso).getTime() -
        new Date(campB.startDate.iso).getTime()
      );
    });
  }, [camps]);

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

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6 bg-gradient-to-b from-camp-cream to-camp-warm">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 text-center">
          <h2 className="font-display text-2xl font-bold text-camp-pine mb-2">
            Summer Schedule
          </h2>
          <p className="text-camp-bark/60 text-sm">
            View camps by week to plan your summer
          </p>
        </div>

        <div className="space-y-4">
          {campsByWeek.map(([dateRange, weekCamps], weekIndex) => {
            const firstCamp = weekCamps[0];
            const weekStart = firstCamp.startDate;

            return (
              <div
                key={dateRange}
                className={`bg-white rounded-2xl shadow-camp overflow-hidden animate-slide-up opacity-0 stagger-${Math.min(
                  weekIndex + 1,
                  6
                )}`}
                style={{ animationFillMode: "forwards" }}
              >
                <button
                  onClick={() => toggleWeek(dateRange)}
                  aria-expanded={!collapsedWeeks.has(dateRange)}
                  aria-controls={`week-${weekIndex}`}
                  className="w-full bg-gradient-to-r from-camp-forest to-camp-forest-light px-4 sm:px-6 py-3 flex items-center justify-between cursor-pointer hover:from-camp-forest-light hover:to-camp-forest transition-all focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-camp-forest"
                >
                  <div className="flex items-center gap-3">
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
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="bg-white/20 px-3 py-1 rounded-full">
                      <span className="text-white text-sm font-semibold">
                        {weekCamps.length} camps
                      </span>
                    </div>
                    <ChevronDown
                      className={`w-5 h-5 text-white transition-transform ${
                        collapsedWeeks.has(dateRange) ? "-rotate-90" : ""
                      }`}
                      aria-hidden="true"
                    />
                  </div>
                </button>

                {!collapsedWeeks.has(dateRange) && (
                  <div
                    id={`week-${weekIndex}`}
                    className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3"
                  >
                    {weekCamps.map((camp, i) => {
                      const style = getCategoryStyle(camp.category);
                      const isInPlanner = plannedCamps.has(camp.dateRange) && plannedCamps.get(camp.dateRange)?.catalogId === camp.catalogId;
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
                          aria-label={`${camp.title}, $${camp.fee}, ${camp.startTime.formatted}, Ages ${camp.minAge}-${camp.maxAge}`}
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
                          {/* Add to Planner button */}
                          <div className="mt-3 pt-2 border-t border-camp-sand/50">
                            {isInPlanner ? (
                              <div className="flex items-center justify-center gap-1.5 py-1.5 text-camp-forest text-xs font-medium">
                                <Check className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>In Planner</span>
                              </div>
                            ) : (
                              <button
                                onClick={(e) => handleAddToPlanner(camp, e)}
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
            {camps.length} camps across {campsByWeek.length} weeks
          </p>
        </div>
      </div>

      {/* Conflict Modal */}
      {conflictCamp && existingCamp && (
        <div
          className="fixed inset-0 bg-camp-pine/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in"
          onClick={handleCloseConflict}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="conflict-title"
            className="bg-white rounded-2xl max-w-md w-full shadow-camp-lg animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-camp-sand">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 id="conflict-title" className="font-display text-lg font-bold text-camp-pine">
                    Week Already Planned
                  </h2>
                  <p className="text-sm text-camp-bark/60 mt-1">
                    {conflictCamp.dateRange}
                  </p>
                </div>
                <button
                  onClick={handleCloseConflict}
                  aria-label="Close dialog"
                  className="p-2 hover:bg-camp-warm rounded-lg transition-colors text-camp-bark/50 hover:text-camp-bark focus:outline-none focus:ring-2 focus:ring-camp-terracotta"
                >
                  <X className="w-5 h-5" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {/* Current camp */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-camp-bark/50 mb-2">
                  Currently Planned
                </p>
                <div className="bg-camp-warm rounded-xl p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-camp-pine text-sm">{existingCamp.title}</h3>
                      <p className="text-xs text-camp-bark/60 mt-1">
                        {existingCamp.location} · {existingCamp.startTime.formatted}
                      </p>
                    </div>
                    <span className="px-2 py-0.5 bg-camp-terracotta text-white text-xs font-bold rounded">
                      ${existingCamp.fee}
                    </span>
                  </div>
                </div>
              </div>

              {/* Arrow */}
              <div className="flex justify-center">
                <ArrowRightLeft className="w-5 h-5 text-camp-bark/30" aria-hidden="true" />
              </div>

              {/* New camp */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-camp-bark/50 mb-2">
                  Replace With
                </p>
                <div className="bg-camp-forest/10 border border-camp-forest/20 rounded-xl p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-camp-pine text-sm">{conflictCamp.title}</h3>
                      <p className="text-xs text-camp-bark/60 mt-1">
                        {conflictCamp.location} · {conflictCamp.startTime.formatted}
                      </p>
                    </div>
                    <span className="px-2 py-0.5 bg-camp-terracotta text-white text-xs font-bold rounded">
                      ${conflictCamp.fee}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5 pt-0 flex gap-3">
              <button
                onClick={handleCloseConflict}
                className="flex-1 py-2.5 border border-camp-sand text-camp-bark/70 font-medium rounded-xl hover:bg-camp-warm transition-colors focus:outline-none focus:ring-2 focus:ring-camp-terracotta"
              >
                Keep Current
              </button>
              <button
                onClick={handleSwap}
                className="flex-1 py-2.5 bg-camp-forest hover:bg-camp-pine text-white font-medium rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-camp-forest focus:ring-offset-2"
              >
                Swap Camp
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

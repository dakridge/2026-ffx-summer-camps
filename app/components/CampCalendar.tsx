"use client";

import { useState, useMemo, memo } from "react";
import { ChevronDown } from "lucide-react";
import { Camp } from "../lib/types";
import { Icons, getCategoryStyle } from "../lib/utils";

interface CampCalendarProps {
  camps: Camp[];
  onSelect: (camp: Camp) => void;
}

export const CampCalendar = memo(function CampCalendar({ camps, onSelect }: CampCalendarProps) {
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
                          <span
                            className={`inline-block px-2 py-0.5 ${style.bg} ${style.text} text-[10px] font-bold uppercase tracking-wider rounded mb-2`}
                          >
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
    </div>
  );
});

"use client";

import React, { memo, useState, useRef } from "react";
import { Heart, Navigation, CalendarPlus, Check, Minus, Clock, ChevronDown } from "lucide-react";
import { Camp, hasExtendedCareAvailable, getExtendedCareCamps } from "../lib/types";
import { Icons, getCategoryStyle, formatTime } from "../lib/utils";
import { ExtendedCarePopover } from "./ExtendedCarePopover";

interface CampListProps {
  camps: Camp[];
  allCamps: Camp[];
  onSelect: (camp: Camp) => void;
  favorites: Set<string>;
  onToggleFavorite: (id: string) => void;
  plannedCamps: Map<string, Camp[]>;
  onPlanCamp: (week: string, camp: Camp | null, action?: "add" | "remove") => void;
  extendedCareAvailability: Set<string>;
}

export const CampList = memo(function CampList({
  camps,
  allCamps,
  onSelect,
  favorites,
  onToggleFavorite,
  plannedCamps,
  onPlanCamp,
  extendedCareAvailability,
}: CampListProps) {
  const [openPopoverCampId, setOpenPopoverCampId] = useState<string | null>(null);
  const badgeRefs = useRef<Map<string, HTMLButtonElement | null>>(new Map());
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
  if (camps.length === 0) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center animate-fade-in max-w-sm">
          <div className="w-20 h-20 mx-auto mb-6 bg-camp-sand/50 rounded-2xl flex items-center justify-center text-camp-bark/30">
            {Icons.search}
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
    <div className="h-full overflow-y-auto p-6 bg-gradient-to-b from-camp-cream to-camp-warm">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
        {camps.map((camp, i) => (
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
            aria-label={`${camp.title}, ${camp.category}, $${camp.fee}, Ages ${camp.minAge}-${camp.maxAge}`}
            className={`group bg-white rounded-2xl p-5 shadow-camp camp-card-hover cursor-pointer border border-transparent hover:border-camp-terracotta/20 focus:outline-none focus:ring-2 focus:ring-camp-terracotta focus:ring-offset-2 animate-slide-up opacity-0 stagger-${Math.min(
              (i % 6) + 1,
              6
            )} ${openPopoverCampId === camp.catalogId ? "z-50 relative" : ""}`}
            style={{ animationFillMode: "forwards" }}
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
                onKeyDown={(e) => e.stopPropagation()}
                aria-label={
                  favorites.has(camp.catalogId)
                    ? `Remove ${camp.title} from favorites`
                    : `Add ${camp.title} to favorites`
                }
                aria-pressed={favorites.has(camp.catalogId)}
                className={`flex-shrink-0 p-1.5 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-rose-400 ${
                  favorites.has(camp.catalogId)
                    ? "text-rose-500 hover:bg-rose-50"
                    : "text-camp-bark/30 hover:text-rose-400 hover:bg-rose-50"
                }`}
              >
                <Heart
                  className="w-5 h-5"
                  fill={favorites.has(camp.catalogId) ? "currentColor" : "none"}
                  aria-hidden="true"
                />
              </button>
              <div className="flex-shrink-0 px-3 py-1 bg-gradient-to-r from-camp-terracotta to-camp-terracotta-dark text-white font-bold text-sm rounded-lg shadow-sm">
                ${camp.fee}
              </div>
            </div>

            {/* Category & Distance badges */}
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              {(() => {
                const style = getCategoryStyle(camp.category);
                return (
                  <span
                    className={`inline-block px-2.5 py-1 ${style.bg} ${style.text} text-[10px] font-bold uppercase tracking-wider rounded-md`}
                  >
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
              {hasExtendedCareAvailable(camp, extendedCareAvailability) && (
                <div className="relative">
                  <button
                    ref={(el) => {
                      badgeRefs.current.set(camp.catalogId, el);
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenPopoverCampId(
                        openPopoverCampId === camp.catalogId ? null : camp.catalogId
                      );
                    }}
                    onKeyDown={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-violet-50 text-violet-600 text-[10px] font-bold rounded-md hover:bg-violet-100 hover:shadow-sm transition-all cursor-pointer"
                    aria-label="View extended care options"
                    aria-expanded={openPopoverCampId === camp.catalogId}
                  >
                    <Clock className="w-3 h-3" />
                    Extended Care
                    <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${openPopoverCampId === camp.catalogId ? "rotate-180" : ""}`} />
                  </button>
                  {openPopoverCampId === camp.catalogId && (
                    <ExtendedCarePopover
                      camps={getExtendedCareCamps(camp.location, camp.dateRange, allCamps)}
                      onClose={() => setOpenPopoverCampId(null)}
                      onPlanCamp={onPlanCamp}
                      plannedCamps={plannedCamps}
                      anchorRef={{ current: badgeRefs.current.get(camp.catalogId) ?? null }}
                    />
                  )}
                </div>
              )}
            </div>

            {/* Details grid */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-start gap-2">
                <div className="mt-0.5 text-camp-terracotta">{Icons.location}</div>
                <div>
                  <div className="font-semibold text-camp-pine text-xs">
                    {camp.location}
                  </div>
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
                  {formatTime(camp.startTime)} - {formatTime(camp.endTime)}
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="mt-0.5 text-camp-bark/50">{Icons.user}</div>
                <div className="text-camp-bark/70 text-xs">
                  Ages {camp.minAge}-{camp.maxAge}
                </div>
              </div>
            </div>

            {/* Description preview */}
            {camp.description && (
              <p className="mt-3 text-xs text-camp-bark/60 line-clamp-2">
                {camp.description}
              </p>
            )}

            {/* Add to Planner button */}
            <div className="mt-4 pt-3 border-t border-camp-sand">
              {isInPlanner(camp) ? (
                <button
                  onClick={(e) => handleTogglePlanner(camp, e)}
                  onKeyDown={(e) => e.stopPropagation()}
                  aria-label={`Remove ${camp.title} from planner`}
                  className="w-full flex items-center justify-center gap-2 py-2 bg-camp-forest text-white text-sm font-medium rounded-lg hover:bg-rose-600 transition-colors focus:outline-none focus:ring-2 focus:ring-camp-forest group"
                >
                  <Check className="w-4 h-4 group-hover:hidden" aria-hidden="true" />
                  <Minus className="w-4 h-4 hidden group-hover:block" aria-hidden="true" />
                  <span className="group-hover:hidden">In Planner</span>
                  <span className="hidden group-hover:inline">Remove</span>
                </button>
              ) : (
                <button
                  onClick={(e) => handleTogglePlanner(camp, e)}
                  onKeyDown={(e) => e.stopPropagation()}
                  aria-label={`Add ${camp.title} to planner`}
                  className="w-full flex items-center justify-center gap-2 py-2 bg-camp-forest/10 hover:bg-camp-forest hover:text-white text-camp-forest text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-camp-forest"
                >
                  <CalendarPlus className="w-4 h-4" aria-hidden="true" />
                  <span>Add to Planner</span>
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
});

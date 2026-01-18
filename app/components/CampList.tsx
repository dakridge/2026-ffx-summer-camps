"use client";

import React, { memo, useState } from "react";
import { Heart, Navigation, CalendarPlus, Check, ArrowRightLeft, X } from "lucide-react";
import { Camp } from "../lib/types";
import { Icons, getCategoryStyle } from "../lib/utils";

interface CampListProps {
  camps: Camp[];
  onSelect: (camp: Camp) => void;
  favorites: Set<string>;
  onToggleFavorite: (id: string) => void;
  plannedCamps: Map<string, Camp>;
  onPlanCamp: (week: string, camp: Camp | null) => void;
}

export const CampList = memo(function CampList({
  camps,
  onSelect,
  favorites,
  onToggleFavorite,
  plannedCamps,
  onPlanCamp,
}: CampListProps) {
  const [conflictCamp, setConflictCamp] = useState<Camp | null>(null);
  const [existingCamp, setExistingCamp] = useState<Camp | null>(null);

  const handleAddToPlanner = (camp: Camp, e: React.MouseEvent) => {
    e.stopPropagation();
    const existing = plannedCamps.get(camp.dateRange);
    if (existing) {
      // There's a conflict
      setConflictCamp(camp);
      setExistingCamp(existing);
    } else {
      // No conflict, add directly
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
            )}`}
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
            <div className="flex items-center gap-2 mb-4">
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

            {/* Description preview */}
            {camp.description && (
              <p className="mt-3 text-xs text-camp-bark/60 line-clamp-2">
                {camp.description}
              </p>
            )}

            {/* Add to Planner button */}
            <div className="mt-4 pt-3 border-t border-camp-sand">
              {plannedCamps.has(camp.dateRange) && plannedCamps.get(camp.dateRange)?.catalogId === camp.catalogId ? (
                <div className="flex items-center justify-center gap-2 py-2 text-camp-forest text-sm font-medium">
                  <Check className="w-4 h-4" aria-hidden="true" />
                  <span>In Planner</span>
                </div>
              ) : (
                <button
                  onClick={(e) => handleAddToPlanner(camp, e)}
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

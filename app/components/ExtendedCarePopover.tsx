"use client";

import React, { useRef, useEffect } from "react";
import { X, CalendarPlus, Check, Minus, Clock, Sun, Moon } from "lucide-react";
import { Camp } from "../lib/types";
import { formatTime } from "../lib/utils";

interface ExtendedCarePopoverProps {
  camps: Camp[];
  onClose: () => void;
  onPlanCamp: (week: string, camp: Camp, action: "add" | "remove") => void;
  plannedCamps: Map<string, Camp[]>;
  anchorRef: React.RefObject<HTMLElement | null>;
}

export function ExtendedCarePopover({
  camps,
  onClose,
  onPlanCamp,
  plannedCamps,
  anchorRef,
}: ExtendedCarePopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);

  const isInPlanner = (camp: Camp): boolean => {
    const weekCamps = plannedCamps.get(camp.dateRange);
    return weekCamps?.some((c) => c.catalogId === camp.catalogId) ?? false;
  };

  const handleTogglePlanner = (camp: Camp) => {
    if (isInPlanner(camp)) {
      onPlanCamp(camp.dateRange, camp, "remove");
    } else {
      onPlanCamp(camp.dateRange, camp, "add");
    }
  };

  // Sort camps by time (before care first, then after care)
  const sortedCamps = [...camps].sort(
    (a, b) => a.startTime.minutesSinceMidnight - b.startTime.minutesSinceMidnight
  );

  // Close on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        anchorRef.current &&
        !anchorRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose, anchorRef]);

  const getTimeLabel = (camp: Camp): { label: string; icon: React.ReactNode } => {
    if (camp.startTime.hour < 12) {
      return {
        label: "Before Care",
        icon: <Sun className="w-4 h-4 text-amber-500" />,
      };
    }
    return {
      label: "After Care",
      icon: <Moon className="w-4 h-4 text-indigo-500" />,
    };
  };

  if (camps.length === 0) {
    return null;
  }

  return (
    <div
      ref={popoverRef}
      className="absolute z-[100] mt-2 w-72 bg-white rounded-xl shadow-lg border border-camp-sand overflow-hidden animate-fade-in"
      style={{ left: 0, top: "100%" }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-violet-50 border-b border-violet-100">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-violet-600" />
          <span className="font-semibold text-violet-900 text-sm">
            Extended Care Options
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-violet-100 rounded-lg transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4 text-violet-600" />
        </button>
      </div>

      {/* Options */}
      <div className="p-3 space-y-2">
        {sortedCamps.map((camp) => {
          const { label, icon } = getTimeLabel(camp);
          const inPlanner = isInPlanner(camp);

          return (
            <div
              key={camp.catalogId}
              className="flex items-center justify-between p-3 bg-camp-warm rounded-lg"
            >
              <div className="flex items-center gap-3">
                {icon}
                <div>
                  <div className="font-medium text-camp-pine text-sm">
                    {label}
                  </div>
                  <div className="text-xs text-camp-bark/60">
                    {formatTime(camp.startTime)} - {formatTime(camp.endTime)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-camp-terracotta">
                  ${camp.fee}
                </span>
                {inPlanner ? (
                  <button
                    onClick={() => handleTogglePlanner(camp)}
                    className="flex items-center gap-1 px-2 py-1 bg-camp-forest text-white text-xs font-medium rounded-lg hover:bg-rose-600 transition-colors group"
                    aria-label={`Remove ${label} from planner`}
                  >
                    <Check className="w-3 h-3 group-hover:hidden" />
                    <Minus className="w-3 h-3 hidden group-hover:block" />
                    <span className="group-hover:hidden">Added</span>
                    <span className="hidden group-hover:inline">Remove</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleTogglePlanner(camp)}
                    className="flex items-center gap-1 px-2 py-1 bg-violet-100 hover:bg-violet-600 hover:text-white text-violet-700 text-xs font-medium rounded-lg transition-colors"
                    aria-label={`Add ${label} to planner`}
                  >
                    <CalendarPlus className="w-3 h-3" />
                    <span>Add</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer hint */}
      <div className="px-4 py-2 bg-camp-warm/50 border-t border-camp-sand">
        <p className="text-[10px] text-camp-bark/50 text-center">
          Extended care at same location & week
        </p>
      </div>
    </div>
  );
}

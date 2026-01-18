"use client";

import { useState, useMemo } from "react";
import { X, AlertCircle, Check, Link2 } from "lucide-react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
} from "@react-pdf/renderer";
import { Camp, ParsedDate } from "../lib/types";
import { Icons, getCategoryStyle } from "../lib/utils";

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
                {week.startDate.monthName.slice(0, 3)} {week.startDate.day} -{" "}
                {week.endDate.day}
              </Text>
              <View style={pdfStyles.weekCamp}>
                {camp ? (
                  <>
                    <Text style={pdfStyles.weekCampTitle}>{camp.title}</Text>
                    <Text style={pdfStyles.weekCampDetails}>
                      {camp.location} · {camp.startTime.formatted} -{" "}
                      {camp.endTime.formatted} · Ages {camp.minAge}-
                      {camp.maxAge}
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
          Generated on {new Date().toLocaleDateString()} · Summer Camp Explorer
          · fairfax-camps.vercel.app
        </Text>
      </Page>
    </Document>
  );
}

export interface MultiWeekPlannerProps {
  camps: Camp[];
  allCamps: Camp[];
  plannedCamps: Map<string, Camp>;
  onPlanCamp: (week: string, camp: Camp | null) => void;
  onSelect: (camp: Camp) => void;
  isSharedPlan: boolean;
  onSaveSharedPlan: () => void;
}

export function MultiWeekPlanner({
  camps,
  allCamps,
  plannedCamps,
  onPlanCamp,
  onSelect,
  isSharedPlan,
  onSaveSharedPlan,
}: MultiWeekPlannerProps) {
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

  const allWeeks = useMemo(() => {
    const weekMap = new Map<
      string,
      { dateRange: string; startDate: ParsedDate; endDate: ParsedDate }
    >();
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
      (a, b) =>
        new Date(a.startDate.iso).getTime() -
        new Date(b.startDate.iso).getTime()
    );
  }, [allCamps]);

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

  const totalCost = useMemo(() => {
    let total = 0;
    plannedCamps.forEach((camp) => {
      total += camp.fee;
    });
    return total;
  }, [plannedCamps]);

  const weeksPlanned = plannedCamps.size;
  const weeksCovered = allWeeks.filter((w) =>
    plannedCamps.has(w.dateRange)
  ).length;
  const weeksWithGaps = allWeeks.length - weeksCovered;

  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const handleDownloadPDF = async () => {
    setIsGeneratingPDF(true);
    try {
      const blob = await pdf(
        <PlannerPDF
          weeks={allWeeks}
          plannedCamps={plannedCamps}
          totalCost={totalCost}
        />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `summer-camp-plan-${
        new Date().toISOString().split("T")[0]
      }.pdf`;
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

        {isSharedPlan && (
          <div
            role="alert"
            className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 print:hidden"
          >
            <div className="flex items-start gap-3">
              <div className="text-amber-500 mt-0.5" aria-hidden="true">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-amber-800 text-sm font-medium mb-2">
                  You&apos;re viewing a shared plan. Changes won&apos;t be
                  saved.
                </p>
                <button
                  onClick={onSaveSharedPlan}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
                >
                  Save to My Plan
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-camp p-4 sm:p-6 mb-6 print:shadow-none print:border print:border-gray-200">
          <div className="grid grid-cols-3 gap-4 text-center mb-4">
            <div>
              <div className="text-2xl sm:text-3xl font-display font-bold text-camp-forest">
                {weeksPlanned}
              </div>
              <div className="text-xs text-camp-bark/60">Weeks Planned</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-display font-bold text-camp-terracotta">
                ${totalCost}
              </div>
              <div className="text-xs text-camp-bark/60">Total Cost</div>
            </div>
            <div>
              <div
                className={`text-2xl sm:text-3xl font-display font-bold ${
                  weeksWithGaps > 0 ? "text-amber-500" : "text-camp-forest"
                }`}
              >
                {weeksWithGaps}
              </div>
              <div className="text-xs text-camp-bark/60">Weeks with Gaps</div>
            </div>
          </div>

          {weeksPlanned > 0 && (
            <div className="flex gap-2 print:hidden">
              <button
                onClick={copyShareLink}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  linkCopied
                    ? "bg-camp-forest text-white focus:ring-camp-forest"
                    : "bg-camp-terracotta hover:bg-camp-terracotta-dark text-white focus:ring-camp-terracotta"
                }`}
              >
                {linkCopied ? (
                  <>
                    <Check className="w-4 h-4" aria-hidden="true" />
                    Link Copied!
                  </>
                ) : (
                  <>
                    <Link2 className="w-4 h-4" aria-hidden="true" />
                    Share Plan
                  </>
                )}
              </button>
              <button
                onClick={handleDownloadPDF}
                disabled={isGeneratingPDF}
                aria-busy={isGeneratingPDF}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-camp-forest hover:bg-camp-pine disabled:bg-camp-forest/50 text-white rounded-xl text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-camp-forest focus:ring-offset-2"
              >
                {isGeneratingPDF ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" aria-hidden="true" />
                    Generating...
                  </>
                ) : (
                  <>
                    <span aria-hidden="true">{Icons.download}</span>
                    Download PDF
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        <div className="space-y-3">
          {allWeeks.map((week, i) => {
            const plannedCamp = plannedCamps.get(week.dateRange);
            const availableCamps = campsByWeek.get(week.dateRange) || [];
            const isExpanded = expandedWeek === week.dateRange;
            const hasAvailableCamps = availableCamps.length > 0;

            return (
              <div
                key={week.dateRange}
                className={`bg-white rounded-2xl shadow-camp overflow-hidden transition-all animate-slide-up opacity-0 stagger-${Math.min(
                  i + 1,
                  6
                )} print:shadow-none print:border print:border-gray-200`}
                style={{ animationFillMode: "forwards" }}
              >
                <div
                  className={`px-4 py-3 flex items-center justify-between gap-3 ${
                    plannedCamp ? "bg-camp-forest/5" : ""
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        plannedCamp
                          ? "bg-camp-forest text-white"
                          : "bg-camp-sand text-camp-bark/50"
                      }`}
                    >
                      <span className="font-display font-bold text-sm">
                        {week.startDate.day}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-camp-pine text-sm truncate">
                        {week.startDate.monthName} {week.startDate.day} -{" "}
                        {week.endDate.monthName} {week.endDate.day}
                      </h3>
                      {plannedCamp ? (
                        <p className="text-xs text-camp-forest font-medium truncate">
                          {plannedCamp.title}
                        </p>
                      ) : (
                        <p className="text-xs text-camp-bark/50">
                          {hasAvailableCamps
                            ? `${availableCamps.length} camps available`
                            : "No camps match filters"}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {plannedCamp && (
                      <span className="px-2 py-1 bg-camp-terracotta text-white text-xs font-bold rounded print:bg-gray-100 print:text-gray-800">
                        ${plannedCamp.fee}
                      </span>
                    )}
                    {plannedCamp ? (
                      <button
                        onClick={() => onPlanCamp(week.dateRange, null)}
                        aria-label={`Remove ${plannedCamp.title} from plan`}
                        className="p-2 text-camp-bark/40 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-rose-400 print:hidden"
                      >
                        <X className="w-4 h-4" aria-hidden="true" />
                      </button>
                    ) : hasAvailableCamps ? (
                      <button
                        onClick={() => {
                          setExpandedWeek(isExpanded ? null : week.dateRange);
                          if (isExpanded) setPlannerSearch("");
                        }}
                        aria-expanded={isExpanded}
                        aria-controls={`week-camps-${i}`}
                        className="px-3 py-1.5 bg-camp-forest text-white text-xs font-semibold rounded-lg hover:bg-camp-pine transition-colors focus:outline-none focus:ring-2 focus:ring-camp-forest focus:ring-offset-2 print:hidden"
                      >
                        {isExpanded ? "Close" : "Select"}
                      </button>
                    ) : (
                      <span className="px-3 py-1.5 bg-camp-sand text-camp-bark/40 text-xs font-medium rounded-lg print:hidden">
                        No options
                      </span>
                    )}
                  </div>
                </div>

                {isExpanded &&
                  hasAvailableCamps &&
                  (() => {
                    const searchLower = plannerSearch.toLowerCase();
                    const filteredCamps = plannerSearch
                      ? availableCamps.filter(
                          (c) =>
                            c.title.toLowerCase().includes(searchLower) ||
                            c.category.toLowerCase().includes(searchLower) ||
                            c.location.toLowerCase().includes(searchLower)
                        )
                      : availableCamps;

                    return (
                      <div
                        id={`week-camps-${i}`}
                        className="border-t border-camp-sand p-3 bg-camp-warm/50 print:hidden"
                      >
                        <div className="relative mb-3">
                          <label htmlFor={`search-camps-${i}`} className="sr-only">
                            Search camps for week of {week.startDate.monthName} {week.startDate.day}
                          </label>
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-camp-bark/40" aria-hidden="true">
                            {Icons.search}
                          </div>
                          <input
                            id={`search-camps-${i}`}
                            type="text"
                            placeholder="Search camps..."
                            value={plannerSearch}
                            onChange={(e) => setPlannerSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white border border-camp-sand rounded-xl text-sm text-camp-pine placeholder:text-camp-bark/40 transition-all hover:border-camp-terracotta/30 focus:border-camp-terracotta/50 focus:outline-none focus:ring-2 focus:ring-camp-terracotta"
                          />
                        </div>

                        {filteredCamps.length === 0 ? (
                          <div className="text-center py-4 text-camp-bark/50 text-sm">
                            No camps match &quot;{plannerSearch}&quot;
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                            {filteredCamps.map((camp, j) => {
                              const style = getCategoryStyle(camp.category);
                              return (
                                <article
                                  key={`${camp.catalogId}-${j}`}
                                  className="bg-white rounded-xl p-3 border border-camp-sand hover:border-camp-terracotta/30 transition-all"
                                >
                                  <div className="flex items-start justify-between gap-2 mb-2">
                                    <button
                                      type="button"
                                      onClick={() => onSelect(camp)}
                                      className="font-semibold text-camp-pine text-sm leading-tight cursor-pointer hover:text-camp-terracotta transition-colors line-clamp-2 text-left focus:outline-none focus:underline"
                                    >
                                      {camp.title}
                                    </button>
                                    <span className="flex-shrink-0 px-2 py-0.5 bg-camp-terracotta text-white text-xs font-bold rounded">
                                      ${camp.fee}
                                    </span>
                                  </div>
                                  <span
                                    className={`inline-block px-2 py-0.5 ${style.bg} ${style.text} text-[10px] font-bold uppercase tracking-wider rounded mb-2`}
                                  >
                                    {camp.category}
                                  </span>
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-xs text-camp-bark/60">
                                      <span className="flex items-center gap-1">
                                        <span aria-hidden="true">{Icons.clock}</span>
                                        <span className="sr-only">Time:</span>
                                        {camp.startTime.formatted}
                                      </span>
                                      <span className="flex items-center gap-1">
                                        <span aria-hidden="true">{Icons.user}</span>
                                        <span className="sr-only">Ages:</span>
                                        {camp.minAge}-{camp.maxAge}
                                      </span>
                                    </div>
                                    <button
                                      onClick={() => {
                                        onPlanCamp(week.dateRange, camp);
                                        setExpandedWeek(null);
                                        setPlannerSearch("");
                                      }}
                                      aria-label={`Add ${camp.title} to plan`}
                                      className="px-2 py-1 bg-camp-forest text-white text-xs font-semibold rounded hover:bg-camp-pine transition-colors focus:outline-none focus:ring-2 focus:ring-camp-forest focus:ring-offset-1"
                                    >
                                      Add
                                    </button>
                                  </div>
                                </article>
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

        <div className="hidden print:block mt-8 pt-4 border-t border-gray-200">
          <h3 className="font-display font-bold text-lg mb-2">
            Planned Camps Summary
          </h3>
          <ul className="space-y-1 text-sm">
            {allWeeks.map((week) => {
              const camp = plannedCamps.get(week.dateRange);
              return (
                <li key={week.dateRange} className="flex justify-between">
                  <span>
                    {week.startDate.monthName} {week.startDate.day}:
                  </span>
                  <span className="font-medium">
                    {camp ? `${camp.title} - $${camp.fee}` : "—"}
                  </span>
                </li>
              );
            })}
          </ul>
          <div className="mt-4 pt-2 border-t border-gray-200 font-bold flex justify-between">
            <span>Total:</span>
            <span>${totalCost}</span>
          </div>
        </div>

        <div className="mt-8 text-center text-camp-bark/50 text-sm print:hidden">
          <p>
            {allWeeks.length} weeks of summer · {camps.length} camps available
            with current filters
          </p>
        </div>
      </div>
    </div>
  );
}

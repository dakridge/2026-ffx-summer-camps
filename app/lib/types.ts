export interface ParsedDate {
  iso: string;
  year: number;
  month: number;
  day: number;
  dayOfWeek: number;
  dayName: string;
  monthName: string;
}

export interface ParsedTime {
  formatted: string;
  hour: number;
  minute: number;
  minutesSinceMidnight: number;
  period: "AM" | "PM";
}

export interface Camp {
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
  description?: string;
}

export interface CampsData {
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

export interface Filters {
  search: string;
  categories: string[];
  communities: string[];
  locations: string[];
  dateRanges: string[];
  childAge: number | null;
  maxFee: number | null;
  startHour: number | null;
  endHour: number | null;
  fromDate: string | null; // ISO date string (YYYY-MM-DD)
  toDate: string | null;   // ISO date string (YYYY-MM-DD)
  hideExtendedCare: boolean;
  onlyWithExtendedCare: boolean;
}

// Helper to check if a camp is an extended care camp
export function isExtendedCare(camp: Camp): boolean {
  return camp.title.toLowerCase().includes("extended care") || camp.category === null || camp.category === "";
}

// Helper to create a lookup key for location+week
export function getExtendedCareKey(location: string, dateRange: string): string {
  return `${location}|||${dateRange}`;
}

// Build a Set of location+week combinations that have extended care
export function buildExtendedCareAvailability(camps: Camp[]): Set<string> {
  const availability = new Set<string>();
  for (const camp of camps) {
    if (isExtendedCare(camp)) {
      availability.add(getExtendedCareKey(camp.location, camp.dateRange));
    }
  }
  return availability;
}

// Check if extended care is available for a given camp's location and week
export function hasExtendedCareAvailable(
  camp: Camp,
  extendedCareAvailability: Set<string>
): boolean {
  if (isExtendedCare(camp)) return false; // Don't show badge on extended care camps themselves
  return extendedCareAvailability.has(getExtendedCareKey(camp.location, camp.dateRange));
}

// Get extended care camps for a specific location and week
export function getExtendedCareCamps(
  location: string,
  dateRange: string,
  allCamps: Camp[]
): Camp[] {
  return allCamps.filter(
    (camp) =>
      isExtendedCare(camp) &&
      camp.location === location &&
      camp.dateRange === dateRange
  );
}

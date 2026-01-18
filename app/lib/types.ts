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
}

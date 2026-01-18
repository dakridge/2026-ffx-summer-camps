import * as XLSX from "xlsx";

const inputFile = process.argv[2];
const outputFile = process.argv[3];

if (!inputFile) {
  console.error("Usage: bun xlsx-to-json.ts <input.xlsx> [output.json]");
  process.exit(1);
}

// Geocoding cache to avoid duplicate requests
const geocodeCache = new Map<string, { lat: number; lng: number } | null>();
const GEOCODE_CACHE_FILE = "data/.geocode-cache.json";
const ADDRESS_MAPPING_FILE = "data/location-addresses.json";

// Load manual address mappings
let addressMappings: Record<string, string | null> = {};
try {
  addressMappings = await Bun.file(ADDRESS_MAPPING_FILE).json();
  console.error(`Loaded ${Object.keys(addressMappings).length} address mappings`);
} catch {
  // No mapping file
}

// Load geocode cache from file if exists
try {
  const cacheData = await Bun.file(GEOCODE_CACHE_FILE).json();
  for (const [key, value] of Object.entries(cacheData)) {
    geocodeCache.set(key, value as { lat: number; lng: number } | null);
  }
  console.error(`Loaded ${geocodeCache.size} cached geocode results`);
} catch {
  // Cache file doesn't exist yet
}

async function saveGeocodeCache() {
  const cacheObj: Record<string, { lat: number; lng: number } | null> = {};
  for (const [key, value] of geocodeCache) {
    cacheObj[key] = value;
  }
  await Bun.write(GEOCODE_CACHE_FILE, JSON.stringify(cacheObj, null, 2));
}

async function nominatimSearch(query: string): Promise<{ lat: number; lng: number } | null> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "summer-camps-converter/1.0" },
    });
    const data = await response.json();
    if (data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
  } catch (error) {
    console.error(`Nominatim search failed:`, error);
  }
  return null;
}

async function geocode(location: string, community: string): Promise<{ lat: number; lng: number } | null> {
  const cacheKey = `${location}|${community}`;
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey)!;
  }

  // Check if it's a virtual location (no physical address)
  if (addressMappings[cacheKey] === null) {
    geocodeCache.set(cacheKey, null);
    return null;
  }

  // Try manual address mapping first
  if (addressMappings[cacheKey]) {
    const result = await nominatimSearch(addressMappings[cacheKey]);
    if (result) {
      console.error(`    Found via address mapping: ${addressMappings[cacheKey]}`);
      geocodeCache.set(cacheKey, result);
      return result;
    }
  }

  // Try direct geocoding
  const directQuery = `${location}, ${community}, Fairfax County, Virginia, USA`;
  const result = await nominatimSearch(directQuery);

  geocodeCache.set(cacheKey, result);
  return result;
}

// Data type inference functions
interface ParsedDate {
  iso: string;
  year: number;
  month: number;
  day: number;
  dayOfWeek: number; // 0=Sunday, 6=Saturday
  dayName: string;
  monthName: string;
}

interface ParsedTime {
  formatted: string; // "09:00"
  hour: number;
  minute: number;
  minutesSinceMidnight: number;
  period: "AM" | "PM";
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function inferDate(value: string): ParsedDate | null {
  // Match patterns like "3/20/26", "03/20/2026", etc.
  const match = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (match) {
    const [, monthStr, dayStr, yearStr] = match;
    const year = yearStr.length === 2 ? 2000 + parseInt(yearStr) : parseInt(yearStr);
    const month = parseInt(monthStr);
    const day = parseInt(dayStr);
    const date = new Date(year, month - 1, day);
    const dayOfWeek = date.getDay();

    return {
      iso: `${year}-${monthStr.padStart(2, "0")}-${dayStr.padStart(2, "0")}`,
      year,
      month,
      day,
      dayOfWeek,
      dayName: DAY_NAMES[dayOfWeek],
      monthName: MONTH_NAMES[month - 1],
    };
  }
  return null;
}

function inferTime(value: string): ParsedTime | null {
  // Match patterns like "9:00 AM", " 4:00 PM"
  const match = value.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match) {
    let [, hours, minutes, periodStr] = match;
    const period = periodStr.toUpperCase() as "AM" | "PM";
    let hour = parseInt(hours);
    const minute = parseInt(minutes);

    // Convert to 24-hour for calculations
    let hour24 = hour;
    if (period === "PM" && hour !== 12) hour24 += 12;
    if (period === "AM" && hour === 12) hour24 = 0;

    return {
      formatted: `${hour24.toString().padStart(2, "0")}:${minutes}`,
      hour: hour24,
      minute,
      minutesSinceMidnight: hour24 * 60 + minute,
      period,
    };
  }
  return null;
}

function inferNumber(value: string): number | null {
  // Match patterns like "$55 ", "$139", "55", "$1,440"
  const match = value.match(/^\$?\s*([\d,]+(?:\.\d+)?)\s*$/);
  if (match) {
    return parseFloat(match[1].replace(/,/g, ""));
  }
  return null;
}

function inferAge(value: string): number | null {
  // Match patterns like "7 Years", "14 Years"
  const match = value.match(/^(\d+)\s*Years?$/i);
  if (match) {
    return parseInt(match[1]);
  }
  return null;
}

// Extract enum values from processed data
function extractEnums(data: Record<string, unknown>[]): {
  categories: string[];
  communities: string[];
  locations: string[];
  dateRanges: string[];
} {
  const categories = new Set<string>();
  const communities = new Set<string>();
  const locations = new Set<string>();
  const dateRanges = new Set<string>();

  for (const row of data) {
    if (row["category"]) categories.add(row["category"] as string);
    if (row["community"]) communities.add(row["community"] as string);
    if (row["location"]) locations.add(row["location"] as string);
    if (row["dateRange"]) dateRanges.add(row["dateRange"] as string);
  }

  return {
    categories: Array.from(categories).sort(),
    communities: Array.from(communities).sort(),
    locations: Array.from(locations).sort(),
    dateRanges: Array.from(dateRanges).sort(),
  };
}

// Process and infer types for a single row
async function processRow(
  row: Record<string, unknown>,
  geocodeEnabled: boolean
): Promise<Record<string, unknown>> {
  const processed: Record<string, unknown> = {};
  let startTime: ParsedTime | null = null;
  let endTime: ParsedTime | null = null;
  let startDate: ParsedDate | null = null;
  let endDate: ParsedDate | null = null;

  for (const [key, value] of Object.entries(row)) {
    if (typeof value !== "string") {
      processed[key] = value;
      continue;
    }

    const strValue = value as string;

    // Try to infer the appropriate type based on the field name
    switch (key) {
      case "Start Date": {
        startDate = inferDate(strValue);
        processed["startDate"] = startDate || strValue;
        break;
      }
      case "End Date": {
        endDate = inferDate(strValue);
        processed["endDate"] = endDate || strValue;
        break;
      }
      case "Start Time": {
        startTime = inferTime(strValue);
        processed["startTime"] = startTime || strValue;
        break;
      }
      case "End Time": {
        endTime = inferTime(strValue);
        processed["endTime"] = endTime || strValue;
        break;
      }
      case "Fee": {
        const num = inferNumber(strValue);
        processed["fee"] = num !== null ? num : strValue;
        break;
      }
      case "Min Age": {
        const age = inferAge(strValue);
        processed["minAge"] = age !== null ? age : strValue;
        break;
      }
      case "Max Age": {
        const age = inferAge(strValue);
        processed["maxAge"] = age !== null ? age : strValue;
        break;
      }
      case "Camp Title":
        processed["title"] = strValue.trim();
        break;
      case "Camp Category":
        processed["category"] = strValue.trim();
        break;
      case "Catalog ID":
        processed["catalogId"] = strValue.trim();
        break;
      case "Date Range":
        processed["dateRange"] = strValue.trim();
        break;
      default:
        // Convert to camelCase
        const camelKey = key.charAt(0).toLowerCase() + key.slice(1).replace(/\s+(.)/g, (_, c) => c.toUpperCase());
        processed[camelKey] = strValue.trim();
    }
  }

  // Compute duration in hours if both times are available
  if (startTime && endTime) {
    const durationMinutes = endTime.minutesSinceMidnight - startTime.minutesSinceMidnight;
    processed["durationHours"] = durationMinutes / 60;
  }

  // Compute number of days if both dates are available
  if (startDate && endDate) {
    const start = new Date(startDate.year, startDate.month - 1, startDate.day);
    const end = new Date(endDate.year, endDate.month - 1, endDate.day);
    const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    processed["durationDays"] = diffDays;
  }

  // Geocode location if enabled
  if (geocodeEnabled && processed["location"] && processed["community"]) {
    const coords = await geocode(
      processed["location"] as string,
      processed["community"] as string
    );
    if (coords) {
      processed["coordinates"] = coords;
    }
  }

  return processed;
}

// Main processing
const workbook = XLSX.readFile(inputFile, { cellDates: true });
const result: Record<string, unknown> = {};

for (const sheetName of workbook.SheetNames) {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet["!ref"]) continue;

  // Find the header row by looking for "Camp Title"
  let headerRow = -1;
  const range = XLSX.utils.decode_range(sheet["!ref"]);

  for (let r = range.s.r; r <= Math.min(range.s.r + 15, range.e.r); r++) {
    for (let c = range.s.c; c <= Math.min(range.s.c + 5, range.e.c); c++) {
      const cell = sheet[XLSX.utils.encode_cell({ r, c })];
      if (cell?.v === "Camp Title") {
        headerRow = r;
        break;
      }
    }
    if (headerRow >= 0) break;
  }

  // Skip sheets without camp data
  if (headerRow < 0) continue;

  const rawData = XLSX.utils.sheet_to_json(sheet, {
    range: headerRow,
    raw: false,
    dateNF: "yyyy-mm-dd",
  }) as Record<string, unknown>[];

  // Clean up the data
  const cleaned = rawData
    .map((row) => {
      const cleanRow: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(row)) {
        if (key.startsWith("__EMPTY") || key.startsWith("Column")) continue;
        if (value === undefined || value === null || value === "") continue;
        cleanRow[key] = value;
      }
      return cleanRow;
    })
    .filter((row) => Object.keys(row).length > 2);

  // Get unique locations for geocoding progress
  const uniqueLocations = new Set(
    cleaned.map((r) => `${r["Location"]}|${r["Community"]}`)
  );
  console.error(`Processing ${cleaned.length} camps with ${uniqueLocations.size} unique locations...`);

  // Pre-geocode all unique locations first (respecting rate limits)
  const locationsToGeocode = Array.from(uniqueLocations).filter(
    (loc) => !geocodeCache.has(loc)
  );

  if (locationsToGeocode.length > 0) {
    console.error(`Geocoding ${locationsToGeocode.length} new locations...`);
    for (let i = 0; i < locationsToGeocode.length; i++) {
      const [location, community] = locationsToGeocode[i].split("|");
      await geocode(location, community);
      console.error(`  [${i + 1}/${locationsToGeocode.length}] ${location}`);
      if (i < locationsToGeocode.length - 1) {
        await Bun.sleep(1100); // Nominatim rate limit
      }
    }
    // Save cache after geocoding
    await saveGeocodeCache();
  }

  // Process each row with type inference (geocoding now uses cache)
  const processed: Record<string, unknown>[] = [];

  for (let i = 0; i < cleaned.length; i++) {
    const row = cleaned[i];
    const processedRow = await processRow(row, true);
    processed.push(processedRow);

    if ((i + 1) % 500 === 0) {
      console.error(`Processed ${i + 1}/${cleaned.length} camps`);
    }
  }

  // Extract enum metadata
  const enums = await extractEnums(processed);

  result[sheetName] = {
    camps: processed,
    metadata: {
      totalCamps: processed.length,
      enums,
      generatedAt: new Date().toISOString(),
    },
  };
}

// Save geocode cache
await saveGeocodeCache();

// Output
const json = JSON.stringify(result, null, 2);

if (outputFile) {
  await Bun.write(outputFile, json);
  console.error(`Written to ${outputFile}`);
} else {
  console.log(json);
}

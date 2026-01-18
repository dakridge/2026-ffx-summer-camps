"use client";

import { useState, useEffect, useCallback, useMemo, useDeferredValue } from "react";
import { Camp, Filters } from "./types";

// =============================================================================
// useGeolocation - Handle browser geolocation with loading state
// =============================================================================

interface GeolocationState {
  location: { lat: number; lng: number } | null;
  loading: boolean;
  error: string | null;
}

interface UseGeolocationOptions {
  storageKey?: string;
  onLocationChange?: (location: { lat: number; lng: number } | null) => void;
}

export function useGeolocation(options: UseGeolocationOptions = {}) {
  const { storageKey = "camp-user-location", onLocationChange } = options;

  const [state, setState] = useState<GeolocationState>({
    location: null,
    loading: false,
    error: null,
  });

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        setState((prev) => ({ ...prev, location: parsed }));
      }
    } catch {}
  }, [storageKey]);

  // Persist to localStorage when location changes
  useEffect(() => {
    if (state.location) {
      localStorage.setItem(storageKey, JSON.stringify(state.location));
    }
  }, [state.location, storageKey]);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setState((prev) => ({
        ...prev,
        error: "Geolocation is not supported by your browser",
      }));
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setState({ location: newLocation, loading: false, error: null });
        onLocationChange?.(newLocation);
      },
      (error) => {
        let errorMessage = "Unable to get your location";
        if (error.code === error.PERMISSION_DENIED) {
          errorMessage = "Location access denied";
        }
        setState((prev) => ({ ...prev, loading: false, error: errorMessage }));
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [onLocationChange]);

  const setLocation = useCallback((location: { lat: number; lng: number } | null) => {
    setState((prev) => ({ ...prev, location }));
    onLocationChange?.(location);
  }, [onLocationChange]);

  const clearLocation = useCallback(() => {
    setState({ location: null, loading: false, error: null });
    localStorage.removeItem(storageKey);
    onLocationChange?.(null);
  }, [storageKey, onLocationChange]);

  return {
    location: state.location,
    loading: state.loading,
    error: state.error,
    requestLocation,
    setLocation,
    clearLocation,
  };
}

// =============================================================================
// usePersistentState - Sync state with localStorage
// =============================================================================

export function usePersistentState<T>(
  key: string,
  initialValue: T,
  options: {
    serialize?: (value: T) => string;
    deserialize?: (value: string) => T;
  } = {}
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const {
    serialize = JSON.stringify,
    deserialize = JSON.parse,
  } = options;

  const [state, setState] = useState<T>(() => {
    // Only run on client
    if (typeof window === "undefined") return initialValue;

    try {
      const saved = localStorage.getItem(key);
      if (saved !== null) {
        return deserialize(saved);
      }
    } catch {}
    return initialValue;
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, serialize(state));
    } catch {}
  }, [key, state, serialize]);

  return [state, setState];
}

// Special version for Set<string>
export function usePersistentSet(
  key: string,
  initialValue: Set<string> = new Set()
): [Set<string>, (update: (prev: Set<string>) => Set<string>) => void] {
  const [state, setState] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return initialValue;

    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        return new Set(JSON.parse(saved));
      }
    } catch {}
    return initialValue;
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify([...state]));
  }, [key, state]);

  const updateState = useCallback((updater: (prev: Set<string>) => Set<string>) => {
    setState(updater);
  }, []);

  return [state, updateState];
}

// =============================================================================
// useLeaflet - Handle Leaflet library loading from CDN
// =============================================================================

export function useLeaflet() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const L = (window as any).L;

    if (L) {
      setReady(true);
      return;
    }

    const existingScript = document.querySelector('script[src*="leaflet"]');

    if (!existingScript) {
      const script = document.createElement("script");
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.onload = () => setReady(true);
      document.head.appendChild(script);
    } else {
      const handleLoad = () => setReady(true);
      existingScript.addEventListener("load", handleLoad);
      return () => existingScript.removeEventListener("load", handleLoad);
    }
  }, []);

  return { ready, L: ready ? (window as any).L : null };
}

// =============================================================================
// useCampFiltering - Handle camp filtering and sorting logic
// =============================================================================

interface UseCampFilteringOptions {
  camps: Camp[];
  filters: Filters;
  sortBy: "default" | "distance" | "price" | "priceDesc" | "date" | "name";
  userLocation: { lat: number; lng: number } | null;
  favorites: Set<string>;
  showFavoritesOnly: boolean;
}

// Haversine distance calculation (returns miles)
function getDistanceMiles(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function useCampFiltering({
  camps,
  filters,
  sortBy,
  userLocation,
  favorites,
  showFavoritesOnly,
}: UseCampFilteringOptions) {
  // Defer filter values so typing remains responsive
  const deferredFilters = useDeferredValue(filters);
  const deferredSortBy = useDeferredValue(sortBy);

  const filteredCamps = useMemo(() => {
    let result = camps.filter((camp) => {
      if (showFavoritesOnly && !favorites.has(camp.catalogId)) return false;

      if (deferredFilters.search) {
        const search = deferredFilters.search.toLowerCase();
        const matchesSearch =
          camp.title.toLowerCase().includes(search) ||
          camp.location.toLowerCase().includes(search) ||
          camp.catalogId.toLowerCase().includes(search);
        if (!matchesSearch) return false;
      }

      if (deferredFilters.categories.length > 0 && !deferredFilters.categories.includes(camp.category))
        return false;
      if (deferredFilters.communities.length > 0 && !deferredFilters.communities.includes(camp.community))
        return false;
      if (deferredFilters.locations.length > 0 && !deferredFilters.locations.includes(camp.location))
        return false;
      if (deferredFilters.dateRanges.length > 0 && !deferredFilters.dateRanges.includes(camp.dateRange))
        return false;
      if (deferredFilters.childAge !== null && (camp.minAge > deferredFilters.childAge || camp.maxAge < deferredFilters.childAge))
        return false;
      if (deferredFilters.maxFee !== null && camp.fee > deferredFilters.maxFee)
        return false;
      if (deferredFilters.startHour !== null && camp.startTime.hour > deferredFilters.startHour)
        return false;
      if (deferredFilters.endHour !== null && camp.endTime.hour < deferredFilters.endHour)
        return false;
      if (deferredFilters.fromDate !== null && camp.startDate.iso < deferredFilters.fromDate)
        return false;
      if (deferredFilters.toDate !== null && camp.startDate.iso > deferredFilters.toDate)
        return false;

      return true;
    });

    // Add distance to each camp
    const campsWithDistance = result.map((camp) => {
      let distance: number | null = null;
      if (userLocation && camp.coordinates) {
        distance = getDistanceMiles(
          userLocation.lat,
          userLocation.lng,
          camp.coordinates.lat,
          camp.coordinates.lng
        );
      }
      return { ...camp, distance };
    });

    // Sort
    if (deferredSortBy === "distance" && userLocation) {
      campsWithDistance.sort((a, b) => {
        if (a.distance === null) return 1;
        if (b.distance === null) return -1;
        return a.distance - b.distance;
      });
    } else if (deferredSortBy === "price") {
      campsWithDistance.sort((a, b) => a.fee - b.fee);
    } else if (deferredSortBy === "priceDesc") {
      campsWithDistance.sort((a, b) => b.fee - a.fee);
    } else if (deferredSortBy === "date") {
      campsWithDistance.sort(
        (a, b) =>
          new Date(a.startDate.iso).getTime() - new Date(b.startDate.iso).getTime()
      );
    } else if (deferredSortBy === "name") {
      campsWithDistance.sort((a, b) => a.title.localeCompare(b.title));
    }

    return campsWithDistance;
  }, [camps, deferredFilters, favorites, showFavoritesOnly, userLocation, deferredSortBy]);

  return filteredCamps;
}

"use client";

import React, { useState, useEffect } from "react";
import { Crosshair } from "lucide-react";
import { Camp } from "../lib/types";

interface CampMapProps {
  camps: Camp[];
  onSelect: (camp: Camp) => void;
  onFilterLocation: (location: string) => void;
  userLocation: { lat: number; lng: number } | null;
  onSetUserLocation: (loc: { lat: number; lng: number }) => void;
}

export function CampMap({
  camps,
  onSelect,
  onFilterLocation,
  userLocation,
  onSetUserLocation,
}: CampMapProps) {
  const mapRef = React.useRef<HTMLDivElement>(null);
  const mapInstanceRef = React.useRef<any>(null);
  const markersRef = React.useRef<any[]>([]);
  const userMarkerRef = React.useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    const L = (window as any).L;

    const initMap = () => {
      if (mapRef.current && !mapInstanceRef.current) {
        const leaflet = (window as any).L;
        mapInstanceRef.current = leaflet
          .map(mapRef.current)
          .setView([38.85, -77.3], 10);
        leaflet
          .tileLayer(
            "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          )
          .addTo(mapInstanceRef.current);

        mapInstanceRef.current.on("click", (e: any) => {
          onSetUserLocation({ lat: e.latlng.lat, lng: e.latlng.lng });
        });

        setMapReady(true);
      }
    };

    if (L) {
      initMap();
    } else {
      const existingScript = document.querySelector('script[src*="leaflet"]');
      if (!existingScript) {
        const script = document.createElement("script");
        script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
        script.onload = initMap;
        document.head.appendChild(script);
      } else {
        existingScript.addEventListener("load", initMap);
      }
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        setMapReady(false);
      }
    };
  }, []);

  useEffect(() => {
    const L = (window as any).L;
    if (!mapReady || !mapInstanceRef.current || !L) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const locationGroups = new Map<string, Camp[]>();
    camps.forEach((camp) => {
      if (camp.coordinates) {
        const key = `${camp.coordinates.lat},${camp.coordinates.lng}`;
        if (!locationGroups.has(key)) locationGroups.set(key, []);
        locationGroups.get(key)!.push(camp);
      }
    });

    const customIcon = L.divIcon({
      className: "custom-marker",
      html: `<div style="position: relative; width: 40px; height: 48px;">
        <svg width="40" height="48" viewBox="0 0 40 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 0C8.954 0 0 8.954 0 20c0 14.667 20 28 20 28s20-13.333 20-28C40 8.954 31.046 0 20 0z" fill="#1B4332"/>
          <path d="M20 2C10.059 2 2 10.059 2 20c0 13.333 18 25.333 18 25.333S38 33.333 38 20C38 10.059 29.941 2 20 2z" fill="#2D6A4F"/>
          <circle cx="20" cy="18" r="10" fill="#FDF8F3"/>
          <path d="M20 11l-6 10h12l-6-10z" fill="#E85D04" stroke="#C44D03" stroke-width="0.5"/>
          <line x1="20" y1="11" x2="20" y2="21" stroke="#C44D03" stroke-width="1"/>
        </svg>
      </div>`,
      iconSize: [40, 48],
      iconAnchor: [20, 48],
      popupAnchor: [0, -48],
    });

    locationGroups.forEach((groupCamps, key) => {
      const [lat, lng] = key.split(",").map(Number);
      const marker = L.marker([lat, lng], { icon: customIcon }).addTo(
        mapInstanceRef.current
      );

      const campsList = groupCamps
        .slice(0, 10)
        .map(
          (c) =>
            `<div class="popup-camp" data-id="${c.catalogId}" style="padding: 10px 12px; background: #FAF5EF; border-radius: 10px; cursor: pointer; transition: background 0.15s; margin-bottom: 8px;">
              <strong style="display: block; font-size: 13px; color: #1B4332; margin-bottom: 4px; font-family: 'Fraunces', Georgia, serif;">${c.title}</strong>
              <span style="font-size: 11px; color: #6B4423;">$${c.fee} · Ages ${c.minAge}-${c.maxAge} · ${c.startDate.monthName} ${c.startDate.day}</span>
            </div>`
        )
        .join("");

      const moreText =
        groupCamps.length > 10
          ? `<p style="font-size: 12px; color: #6B4423; text-align: center; margin-top: 8px; padding-top: 8px; border-top: 1px solid #F5EBE0;">+ ${
              groupCamps.length - 10
            } more camps</p>`
          : "";

      const popupContent = `
        <div class="map-popup" style="min-width: 300px; font-family: 'DM Sans', system-ui, sans-serif;">
          <h3 style="font-size: 16px; font-weight: 700; margin-bottom: 4px; color: #1B4332;">${groupCamps[0].location}</h3>
          <p style="font-size: 12px; color: #6B4423; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid #F5EBE0;">${groupCamps[0].community} · ${groupCamps.length} camps</p>
          <button class="popup-filter-btn" data-location="${groupCamps[0].location}" style="width: 100%; padding: 10px 14px; background: linear-gradient(135deg, #E85D04, #C44D03); color: white; border: none; border-radius: 10px; font-size: 13px; font-weight: 600; cursor: pointer; margin-bottom: 12px; transition: transform 0.15s;">Filter to this location</button>
          <div style="max-height: 200px; overflow-y: auto;">${campsList}</div>
          ${moreText}
        </div>
      `;

      const popup = L.popup({ maxHeight: 350, minWidth: 300 }).setContent(
        popupContent
      );
      marker.bindPopup(popup);

      marker.on("popupopen", () => {
        document.querySelectorAll(".popup-camp").forEach((el) => {
          (el as HTMLElement).onmouseenter = () =>
            ((el as HTMLElement).style.background = "#F5EBE0");
          (el as HTMLElement).onmouseleave = () =>
            ((el as HTMLElement).style.background = "#FAF5EF");
          el.addEventListener("click", () => {
            const campId = el.getAttribute("data-id");
            const camp = groupCamps.find((c) => c.catalogId === campId);
            if (camp) onSelect(camp);
          });
        });
        document.querySelectorAll(".popup-filter-btn").forEach((el) => {
          (el as HTMLElement).onmouseenter = () =>
            ((el as HTMLElement).style.transform = "scale(1.02)");
          (el as HTMLElement).onmouseleave = () =>
            ((el as HTMLElement).style.transform = "scale(1)");
          el.addEventListener("click", () => {
            const location = el.getAttribute("data-location");
            if (location) onFilterLocation(location);
          });
        });
      });

      markersRef.current.push(marker);
    });

    if (markersRef.current.length > 0) {
      const group = L.featureGroup(markersRef.current);
      mapInstanceRef.current.fitBounds(group.getBounds().pad(0.1));
    }
  }, [camps, onSelect, onFilterLocation, mapReady]);

  useEffect(() => {
    const L = (window as any).L;
    if (!mapReady || !mapInstanceRef.current || !L) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.remove();
      userMarkerRef.current = null;
    }

    if (!userLocation) return;

    const userIcon = L.divIcon({
      className: "user-marker",
      html: `<div style="position: relative; width: 36px; height: 36px;">
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="18" cy="18" r="16" fill="#6366F1" stroke="#4F46E5" stroke-width="2"/>
          <circle cx="18" cy="18" r="6" fill="white"/>
        </svg>
      </div>`,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });

    const marker = L.marker([userLocation.lat, userLocation.lng], {
      icon: userIcon,
      draggable: true,
      zIndexOffset: 1000,
    }).addTo(mapInstanceRef.current);

    marker.bindTooltip("Your location (drag to adjust)", {
      permanent: false,
      direction: "top",
      offset: [0, -18],
    });

    marker.on("dragend", (e: any) => {
      const { lat, lng } = e.target.getLatLng();
      onSetUserLocation({ lat, lng });
    });

    userMarkerRef.current = marker;
  }, [userLocation, mapReady, onSetUserLocation]);

  return (
    <div className="h-full w-full relative">
      <div id="map" ref={mapRef} className="h-full w-full" />
      {!userLocation && (
        <div className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-auto bg-white/95 backdrop-blur-sm rounded-xl shadow-camp p-3 text-sm text-camp-bark/70 flex items-center gap-2">
          <Crosshair className="w-4 h-4 text-indigo-500 flex-shrink-0" />
          <span>Click anywhere on the map to set your location</span>
        </div>
      )}
    </div>
  );
}

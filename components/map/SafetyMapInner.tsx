'use client';

import React, { useEffect, useMemo } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  Circle,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export interface HazardItem {
  id: string;
  title: string;
  description?: string;
  lat: number;
  lng: number;
  risk_level: string;
  radius?: number;
}

export interface SafetyMapProps {
  userLocation: [number, number] | null;
  userHeading?: number | null;
  routeCoordinates?: [number, number][];
  hazards?: HazardItem[];
  onSelectLocation?: (lat: number, lng: number) => void;
  className?: string;
}

// User animated directional marker
const createDirectionalUserIcon = (heading?: number | null) => {
  const rotation = heading !== undefined && heading !== null && !isNaN(heading) ? heading : 0;
  const hasHeading = heading !== undefined && heading !== null && !isNaN(heading);

  return L.divIcon({
    className: 'custom-directional-user-marker',
    html: `
      <div style="position: relative; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;">
        <!-- Pulsing beacon wave -->
        <span style="position: absolute; width: 40px; height: 40px; border-radius: 9999px; background-color: rgba(244, 63, 94, 0.3); animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>
        <span style="position: absolute; width: 28px; height: 28px; border-radius: 9999px; background-color: rgba(225, 29, 72, 0.45); box-shadow: 0 0 16px rgba(244, 63, 94, 0.9);"></span>
        
        <!-- Directional indicator arrow/cone -->
        <div style="position: absolute; width: 34px; height: 34px; transform: rotate(${rotation}deg); transition: transform 0.4s ease; display: flex; align-items: flex-start; justify-content: center; pointer-events: none;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style="filter: drop-shadow(0 0 4px #e11d48); transform: translateY(-3px);">
            <polygon points="12,2 20,20 12,15 4,20" fill="#ffffff" stroke="#f43f5e" stroke-width="2.5" />
          </svg>
        </div>

        <!-- Center Core Dot -->
        <span style="position: relative; width: 13px; height: 13px; border-radius: 9999px; background-color: #f43f5e; border: 2px solid #ffffff; box-shadow: 0 0 10px rgba(244,63,94,1);"></span>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
};


// Destination pin marker
const destinationPinIcon = L.divIcon({
  className: 'custom-destination-marker',
  html: `
    <div style="position: relative; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;">
      <span style="position: absolute; width: 24px; height: 24px; border-radius: 9999px; background-color: rgba(16, 185, 129, 0.3); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>
      <div style="width: 20px; height: 20px; border-radius: 9999px; background-color: #10b981; border: 2.5px solid #ffffff; box-shadow: 0 0 10px rgba(16, 185, 129, 0.8); display: flex; align-items: center; justify-content: center; color: white; font-size: 10px; font-weight: bold;">
        ✓
      </div>
    </div>
  `,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

// Warning icon for hazards (crimson for HIGH, amber for MEDIUM)
const createHazardIcon = (riskLevel: string) => {
  const isHigh = riskLevel?.toUpperCase() === 'HIGH';
  const bgColor = isHigh ? '#e11d48' : '#f59e0b';
  const glowColor = isHigh ? 'rgba(225, 29, 72, 0.5)' : 'rgba(245, 158, 11, 0.5)';
  const borderColor = isHigh ? '#fecdd3' : '#fef3c7';

  return L.divIcon({
    className: 'custom-hazard-marker',
    html: `
      <div style="position: relative; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
        <span style="position: absolute; width: 26px; height: 26px; border-radius: 9999px; background-color: ${glowColor}; animation: ping 2.2s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>
        <div style="position: relative; width: 20px; height: 20px; border-radius: 9999px; background-color: ${bgColor}; border: 2px solid ${borderColor}; box-shadow: 0 0 12px ${glowColor}; display: flex; align-items: center; justify-content: center; color: white; font-size: 11px; font-weight: 900; font-family: sans-serif;">
          !
        </div>
      </div>
    `,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
};

// Map click event subscriber
function MapClickHandler({ onSelectLocation }: { onSelectLocation?: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      if (onSelectLocation) {
        onSelectLocation(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

// Controller to auto-pan and fit bounds when user location or route changes
function MapViewController({
  userLocation,
  routeCoordinates,
}: {
  userLocation: [number, number] | null;
  routeCoordinates?: [number, number][];
}) {
  const map = useMap();

  useEffect(() => {
    if (routeCoordinates && routeCoordinates.length > 0) {
      const bounds = L.latLngBounds(routeCoordinates);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    } else if (userLocation) {
      map.setView(userLocation, 15, { animate: true });
    }
  }, [userLocation, routeCoordinates, map]);

  return null;
}

export default function SafetyMapInner({
  userLocation,
  userHeading,
  routeCoordinates,
  hazards = [],
  onSelectLocation,
  className = '',
}: SafetyMapProps) {
  // Normalize route coordinates: OSRM returns [lng, lat], Leaflet expects [lat, lng]
  const normalizedRoute = useMemo<[number, number][]>(() => {
    if (!routeCoordinates || routeCoordinates.length === 0) return [];

    const first = routeCoordinates[0];
    if (first && first.length >= 2) {
      // In India/many areas, longitude is ~77 and latitude is ~28
      // If first coordinate is longitude (> 45 and lat <= 45), invert to [lat, lng]
      if (Math.abs(first[0]) > 45 && Math.abs(first[1]) <= 45) {
        return routeCoordinates.map(([lng, lat]) => [lat, lng] as [number, number]);
      }
    }
    return routeCoordinates;
  }, [routeCoordinates]);

  const defaultCenter: [number, number] = userLocation || [28.6139, 77.2090]; // Default New Delhi

  const destinationPoint = useMemo(() => {
    if (normalizedRoute.length > 0) {
      return normalizedRoute[normalizedRoute.length - 1];
    }
    return null;
  }, [normalizedRoute]);

  return (
    <div
      className={`relative w-full h-full min-h-[400px] rounded-3xl overflow-hidden border border-rose-950/40 shadow-2xl bg-[#0a0104] ${className}`}
    >
      <style jsx global>{`
        .leaflet-container {
          width: 100%;
          height: 100%;
          background: #0a0104 !important;
          font-family: inherit;
        }
        .leaflet-popup-content-wrapper {
          background: #16040c !important;
          color: #f4f4f5 !important;
          border: 1px solid rgba(159, 18, 57, 0.5) !important;
          border-radius: 18px !important;
          box-shadow: 0 20px 30px -5px rgba(0, 0, 0, 0.8) !important;
          padding: 6px !important;
        }
        .leaflet-popup-tip {
          background: #16040c !important;
          border: 1px solid rgba(159, 18, 57, 0.5) !important;
        }
        .leaflet-popup-close-button {
          color: #fda4af !important;
          padding: 6px !important;
        }
        .leaflet-bar {
          border: 1px solid rgba(159, 18, 57, 0.4) !important;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5) !important;
          border-radius: 12px !important;
          overflow: hidden;
        }
        .leaflet-bar a {
          background-color: #16040c !important;
          color: #fda4af !important;
          border-bottom: 1px solid rgba(159, 18, 57, 0.3) !important;
        }
        .leaflet-bar a:hover {
          background-color: #240714 !important;
          color: #ffffff !important;
        }
      `}</style>

      <MapContainer
        center={defaultCenter}
        zoom={14}
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        {/* CartoDB Dark Matter dark tiles */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
          maxZoom={19}
        />

        <MapViewController
          userLocation={userLocation}
          routeCoordinates={normalizedRoute}
        />

        <MapClickHandler onSelectLocation={onSelectLocation} />

        {/* User Live Location Directional Pulse Marker */}
        {userLocation && (
          <Marker position={userLocation} icon={createDirectionalUserIcon(userHeading)}>
            <Popup>
              <div className="p-1 space-y-1">
                <span className="text-[10px] uppercase font-bold tracking-wider text-rose-400 bg-rose-950/60 border border-rose-900/40 rounded-full px-2 py-0.5 inline-block">
                  Live Telemetry
                </span>
                <h4 className="text-sm font-bold text-white">Live Safe Position</h4>
                <p className="text-[11px] text-zinc-400 font-mono">
                  {userLocation[0].toFixed(5)}, {userLocation[1].toFixed(5)}
                  {userHeading !== undefined && userHeading !== null ? ` • ${Math.round(userHeading)}°` : ''}
                </p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Destination Pin Marker */}
        {destinationPoint && (
          <Marker position={destinationPoint} icon={destinationPinIcon}>
            <Popup>
              <div className="p-1 space-y-1">
                <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 bg-emerald-950/60 border border-emerald-900/40 rounded-full px-2 py-0.5 inline-block">
                  Destination
                </span>
                <h4 className="text-sm font-bold text-white">Journey Goal</h4>
                <p className="text-[11px] text-zinc-400 font-mono">
                  {destinationPoint[0].toFixed(5)}, {destinationPoint[1].toFixed(5)}
                </p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Dynamic Hazard Zones (Rendered as Circle and CircleMarker) */}
        {hazards.map((hazard) => {
          const risk = hazard.risk_level?.toUpperCase() || 'MEDIUM';
          const isHigh = risk === 'HIGH';
          const isLow = risk === 'LOW';

          // Exact risk styling per specification:
          // Low Risk: Faint border, transparent fill (color: '#71717a', fillColor: 'transparent', fillOpacity: 0)
          // Medium Risk: Amber ring with yellow glow (color: '#f59e0b', fillColor: '#facc15', fillOpacity: 0.25)
          // High Risk: Saturated crimson ring with red fill (color: '#e11d48', fillColor: '#f43f5e', fillOpacity: 0.45)
          const circleColor = isHigh ? '#e11d48' : isLow ? '#71717a' : '#f59e0b';
          const circleFillColor = isHigh ? '#f43f5e' : isLow ? 'transparent' : '#facc15';
          const circleFillOpacity = isHigh ? 0.45 : isLow ? 0 : 0.25;
          const circleWeight = isHigh ? 2.5 : isLow ? 1.5 : 2;

          return (
            <React.Fragment key={hazard.id}>
              {/* Dynamic hazard zone Circle perimeter */}
              <Circle
                center={[hazard.lat, hazard.lng]}
                radius={hazard.radius || (isHigh ? 260 : isLow ? 180 : 220)}
                pathOptions={{
                  color: circleColor,
                  fillColor: circleFillColor,
                  fillOpacity: circleFillOpacity,
                  weight: circleWeight,
                  dashArray: isLow ? '4, 4' : undefined,
                }}
              >
                <Popup>
                  <div className="p-1 space-y-1.5 min-w-[200px]">
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[10px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-full border ${
                          isHigh
                            ? 'bg-rose-950/60 text-rose-300 border-rose-800/60'
                            : isLow
                            ? 'bg-zinc-800 text-zinc-300 border-zinc-700'
                            : 'bg-amber-950/60 text-amber-300 border-amber-800/60'
                        }`}
                      >
                        {isHigh ? 'High Risk Hazard' : isLow ? 'Low Risk Advisory' : 'Medium Risk Hazard'}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-white leading-tight">
                      {hazard.title}
                    </h4>
                    {hazard.description && (
                      <p className="text-xs text-zinc-300 leading-relaxed">
                        {hazard.description}
                      </p>
                    )}
                    <p className="text-[10px] text-zinc-500 font-mono pt-1 border-t border-rose-950/50">
                      Community Report • GPS: {hazard.lat.toFixed(4)}, {hazard.lng.toFixed(4)}
                    </p>
                  </div>
                </Popup>
              </Circle>

              {/* Pinpoint center marker for direct interaction */}
              <Marker
                position={[hazard.lat, hazard.lng]}
                icon={createHazardIcon(hazard.risk_level)}
              >
                <Popup>
                  <div className="p-1 space-y-1.5 min-w-[200px]">
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[10px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-full border ${
                          isHigh
                            ? 'bg-rose-950/60 text-rose-300 border-rose-800/60'
                            : isLow
                            ? 'bg-zinc-800 text-zinc-300 border-zinc-700'
                            : 'bg-amber-950/60 text-amber-300 border-amber-800/60'
                        }`}
                      >
                        {isHigh ? 'High Risk Hazard' : isLow ? 'Low Risk Advisory' : 'Medium Risk Hazard'}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-white leading-tight">
                      {hazard.title}
                    </h4>
                    {hazard.description && (
                      <p className="text-xs text-zinc-300 leading-relaxed">
                        {hazard.description}
                      </p>
                    )}
                    <p className="text-[10px] text-zinc-500 font-mono pt-1 border-t border-rose-950/50">
                      Community Report • GPS: {hazard.lat.toFixed(4)}, {hazard.lng.toFixed(4)}
                    </p>
                  </div>
                </Popup>
              </Marker>
            </React.Fragment>
          );
        })}

        {/* Route Polylines */}
        {normalizedRoute.length > 0 && (
          <>
            {/* Ambient glow outline */}
            <Polyline
              positions={normalizedRoute}
              pathOptions={{
                color: '#f43f5e',
                weight: 8,
                opacity: 0.35,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
            {/* Bright core route polyline */}
            <Polyline
              positions={normalizedRoute}
              pathOptions={{
                color: '#f43f5e',
                weight: 4,
                opacity: 1.0,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
          </>
        )}
      </MapContainer>
    </div>
  );
}

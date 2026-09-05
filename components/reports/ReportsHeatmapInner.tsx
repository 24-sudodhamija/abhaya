'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Client-side leaflet.heat attachment
if (typeof window !== 'undefined') {
  (window as any).L = L;
  try {
    require('leaflet.heat');
  } catch (e) {
    console.warn('Leaflet.heat module require notice:', e);
  }
}

export interface ReportItem {
  id: string;
  title: string;
  description?: string;
  category: string;
  lat: number;
  lng: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | string;
  risk_level?: string;
  imageUrl?: string;
  image_url?: string;
  verificationCount?: number;
  verification_count?: number;
  createdAt?: string;
  created_at?: string;
  distanceKm?: number | null;
  reporter?: {
    id?: string;
    fullName?: string;
    maskedId?: string;
    isVerified?: boolean;
  };
}

export interface ReportsHeatmapProps {
  reports: ReportItem[];
  activeReportId: string | null;
  onSelectReport: (reportId: string) => void;
  onMapClick: (coords: { lat: number; lng: number }) => void;
  userLocation?: [number, number] | null;
  className?: string;
}

// Custom Marker Pin with Risk Coloring and Selection Pulse
const createReportMarkerIcon = (riskLevel: string, isSelected: boolean) => {
  const isHigh = riskLevel?.toUpperCase() === 'HIGH';
  const isLow = riskLevel?.toUpperCase() === 'LOW';

  const color = isHigh ? '#f43f5e' : isLow ? '#38bdf8' : '#f59e0b';
  const glow = isHigh
    ? 'rgba(244, 63, 94, 0.7)'
    : isLow
    ? 'rgba(56, 189, 248, 0.6)'
    : 'rgba(245, 158, 11, 0.7)';

  return L.divIcon({
    className: `custom-report-pin ${isSelected ? 'selected-pin' : ''}`,
    html: `
      <div style="position: relative; width: ${isSelected ? '38px' : '26px'}; height: ${isSelected ? '38px' : '26px'}; display: flex; align-items: center; justify-content: center; cursor: pointer;">
        ${
          isSelected
            ? `<span style="position: absolute; width: 100%; height: 100%; border-radius: 9999px; background-color: ${glow}; animation: ping 1.4s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>`
            : ''
        }
        <div style="position: relative; width: ${isSelected ? '24px' : '18px'}; height: ${isSelected ? '24px' : '18px'}; border-radius: 9999px; background-color: ${color}; border: 2px solid #ffffff; box-shadow: 0 0 ${isSelected ? '18px' : '8px'} ${glow}; display: flex; align-items: center; justify-content: center; color: white; font-weight: 900; font-size: ${isSelected ? '11px' : '9px'};">
          !
        </div>
      </div>
    `,
    iconSize: isSelected ? [38, 38] : [26, 26],
    iconAnchor: isSelected ? [19, 19] : [13, 13],
  });
};

// User Location Pulse Marker
const userPulseIcon = L.divIcon({
  className: 'custom-user-marker',
  html: `
    <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;">
      <span style="position: absolute; width: 34px; height: 34px; border-radius: 9999px; background-color: rgba(244, 63, 94, 0.35); animation: ping 1.6s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>
      <span style="position: absolute; width: 22px; height: 22px; border-radius: 9999px; background-color: rgba(225, 29, 72, 0.6); box-shadow: 0 0 14px rgba(244, 63, 94, 0.9);"></span>
      <span style="position: relative; width: 12px; height: 12px; border-radius: 9999px; background-color: #f43f5e; border: 2px solid #ffffff;"></span>
    </div>
  `,
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});

// Map click event listener to drop pins
function MapClickHandler({ onMapClick }: { onMapClick?: (coords: { lat: number; lng: number }) => void }) {
  useMapEvents({
    click(e) {
      if (onMapClick) {
        onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
      }
    },
  });
  return null;
}

// Pan controller when selecting report
function MapViewController({
  selectedCoords,
  userLocation,
}: {
  selectedCoords?: { lat: number; lng: number } | null;
  userLocation?: [number, number] | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (selectedCoords && !isNaN(selectedCoords.lat) && !isNaN(selectedCoords.lng)) {
      map.setView([selectedCoords.lat, selectedCoords.lng], Math.max(map.getZoom(), 15), {
        animate: true,
      });
    }
  }, [selectedCoords, map]);

  return null;
}

// Dynamic Heatmap Layer Component using L.heatLayer
function HeatmapOverlay({ points }: { points: [number, number, number][] }) {
  const map = useMap();
  const heatLayerRef = useRef<any>(null);

  useEffect(() => {
    if (!map) return;

    // Clean previous layer if points change
    if (heatLayerRef.current) {
      try {
        map.removeLayer(heatLayerRef.current);
      } catch {}
      heatLayerRef.current = null;
    }

    // Gradient spec: { 0.2: '#3b82f6', 0.5: '#facc15', 0.8: '#f43f5e', 1.0: '#e11d48' }
    if (points && points.length > 0 && typeof (L as any).heatLayer === 'function') {
      try {
        const heat = (L as any).heatLayer(points, {
          radius: 28,
          blur: 18,
          maxZoom: 17,
          gradient: {
            0.2: '#3b82f6',
            0.5: '#facc15',
            0.8: '#f43f5e',
            1.0: '#e11d48',
          },
        });
        heat.addTo(map);
        heatLayerRef.current = heat;
      } catch (err) {
        console.warn('Error adding heatLayer:', err);
      }
    }

    return () => {
      if (heatLayerRef.current && map) {
        try {
          map.removeLayer(heatLayerRef.current);
        } catch {}
        heatLayerRef.current = null;
      }
    };
  }, [map, points]);

  return null;
}

export default function ReportsHeatmapInner({
  reports = [],
  activeReportId,
  onSelectReport,
  onMapClick,
  userLocation,
  className = '',
}: ReportsHeatmapProps) {
  // Feed coordinates and risk weights into L.heatLayer
  // (w: 0.2 for LOW, 0.6 for MEDIUM, 1.0 for HIGH)
  const heatmapPoints = useMemo<[number, number, number][]>(() => {
    return reports
      .filter((r) => typeof r.lat === 'number' && typeof r.lng === 'number' && !isNaN(r.lat) && !isNaN(r.lng))
      .map((r) => {
        const risk = (r.riskLevel || r.risk_level || 'MEDIUM').toUpperCase();
        const weight = risk === 'HIGH' ? 1.0 : risk === 'LOW' ? 0.2 : 0.6;
        return [r.lat, r.lng, weight];
      });
  }, [reports]);

  // Find active report coords for centering
  const activeReport = useMemo(() => {
    return reports.find((r) => r.id === activeReportId);
  }, [reports, activeReportId]);

  const defaultCenter: [number, number] = userLocation || [28.6139, 77.209]; // Default New Delhi center

  return (
    <div
      className={`relative w-full h-full min-h-[420px] rounded-3xl overflow-hidden border border-rose-950/50 shadow-2xl bg-[#0a0104] ${className}`}
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
      `}</style>

      <MapContainer
        center={defaultCenter}
        zoom={13}
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        {/* OpenStreetMap Tile Layer with Custom Dark Inversion */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
          className="dark-map-tiles"
        />

        <MapViewController
          selectedCoords={activeReport ? { lat: activeReport.lat, lng: activeReport.lng } : null}
          userLocation={userLocation}
        />

        <MapClickHandler onMapClick={onMapClick} />

        {/* Dynamic Heatmap Layer */}
        <HeatmapOverlay points={heatmapPoints} />

        {/* User GPS location if available */}
        {userLocation && (
          <Marker position={userLocation} icon={userPulseIcon}>
            <Popup>
              <div className="p-1 space-y-1">
                <span className="text-[10px] uppercase font-bold tracking-wider text-rose-400 bg-rose-950/60 border border-rose-900/40 rounded-full px-2 py-0.5 inline-block">
                  Live Location
                </span>
                <h4 className="text-sm font-bold text-white">Your Current Position</h4>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Marker Layer: Clickable Pins */}
        {reports.map((report) => {
          const isSelected = report.id === activeReportId;
          const risk = (report.riskLevel || report.risk_level || 'MEDIUM').toUpperCase();
          const photo = report.imageUrl || report.image_url;

          return (
            <Marker
              key={report.id}
              position={[report.lat, report.lng]}
              icon={createReportMarkerIcon(risk, isSelected)}
              eventHandlers={{
                click: () => onSelectReport(report.id),
              }}
            >
              <Popup>
                <div className="p-1.5 space-y-2 min-w-[210px] max-w-[260px]">
                  {photo && (
                    <img
                      src={photo}
                      alt={report.title}
                      className="w-full h-24 object-cover rounded-xl border border-rose-950/80 mb-1"
                    />
                  )}
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                        risk === 'HIGH'
                          ? 'bg-rose-950 text-rose-300 border-rose-800'
                          : risk === 'LOW'
                          ? 'bg-zinc-800 text-zinc-300 border-zinc-700'
                          : 'bg-amber-950 text-amber-300 border-amber-800'
                      }`}
                    >
                      {risk} Risk
                    </span>
                    <span className="text-[10px] font-mono text-zinc-400 truncate">
                      {report.category}
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-white leading-snug line-clamp-2">
                    {report.title}
                  </h4>

                  {report.description && (
                    <p className="text-[11px] text-zinc-300 leading-relaxed line-clamp-2">
                      {report.description}
                    </p>
                  )}

                  <div className="pt-1.5 border-t border-rose-950/60 flex items-center justify-between text-[10px] text-zinc-400 font-mono">
                    <span>
                      {report.reporter?.fullName || 'Verified Resident'}
                    </span>
                    <button
                      type="button"
                      onClick={() => onSelectReport(report.id)}
                      className="text-rose-400 font-bold hover:underline"
                    >
                      Focus ➔
                    </button>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}

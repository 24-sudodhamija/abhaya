'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/navigation/Navbar';
import SafetyMap, { HazardItem } from '@/components/map/SafetyMap';
import {
  Navigation,
  AlertTriangle,
  ShieldCheck,
  MapPin,
  Clock,
  Battery,
  BatteryCharging,
  BatteryWarning,
  Radio,
  Zap,
  ShieldAlert,
  CheckCircle2,
  PhoneCall,
  Compass,
  RefreshCw,
  LocateFixed,
  Eye,
  Route,
} from 'lucide-react';

// Standard fallback mock corridor (Janpath -> India Gate) when no active route was started on /map
const FALLBACK_MOCK_ROUTE: [number, number][] = [
  [28.6328, 77.2197], // Connaught Place Radial
  [28.6295, 77.2194],
  [28.6268, 77.2191], // Janpath Metro
  [28.6238, 77.2188], // Tolstoy Crossing
  [28.6205, 77.2184], // Windsor Place
  [28.6178, 77.2198], // Ashoka Road Approach
  [28.6146, 77.2225], // National Museum Court
  [28.6136, 77.2260], // Kartavya Path West
  [28.6129, 77.2295], // India Gate
];

type JourneyStatus = 'ACTIVE' | 'DEVIATED' | 'EMERGENCY' | 'COMPLETED';

// Haversine distance in meters
function haversineDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Distance from point P to line segment [A, B] in meters
function distanceToSegmentMeters(
  pLat: number,
  pLng: number,
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number
): number {
  const midLat = (((aLat + bLat) / 2) * Math.PI) / 180;
  const mPerLat = 111139;
  const mPerLng = 111139 * Math.cos(midLat);

  const abX = (bLng - aLng) * mPerLng;
  const abY = (bLat - aLat) * mPerLat;
  const apX = (pLng - aLng) * mPerLng;
  const apY = (pLat - aLat) * mPerLat;

  const abLenSq = abX * abX + abY * abY;
  if (abLenSq === 0) {
    return haversineDistanceMeters(pLat, pLng, aLat, aLng);
  }

  let t = (apX * abX + apY * abY) / abLenSq;
  t = Math.max(0, Math.min(1, t));

  const closestLat = aLat + t * (bLat - aLat);
  const closestLng = aLng + t * (bLng - aLng);

  return haversineDistanceMeters(pLat, pLng, closestLat, closestLng);
}

// Calculate minimum perpendicular distance from coordinate to route polyline
function calculateRouteDeviation(
  point: [number, number],
  route: [number, number][]
): number {
  if (!route || route.length === 0) return 0;
  if (route.length === 1) {
    return haversineDistanceMeters(point[0], point[1], route[0][0], route[0][1]);
  }

  let minDistance = Infinity;
  for (let i = 0; i < route.length - 1; i++) {
    const d = distanceToSegmentMeters(
      point[0],
      point[1],
      route[i][0],
      route[i][1],
      route[i + 1][0],
      route[i + 1][1]
    );
    if (d < minDistance) {
      minDistance = d;
    }
  }

  return Math.round(minDistance);
}

// Bearing calculation in degrees between consecutive coordinates
function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);
  const theta = Math.atan2(y, x);
  return ((theta * 180) / Math.PI + 360) % 360;
}

export default function LiveJourneyPage() {
  const router = useRouter();

  // Auth & Initial States
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isMounted, setIsMounted] = useState(false);

  // Journey Metadata
  const [journeyId, setJourneyId] = useState<string>('');
  const [originName, setOriginName] = useState<string>('Connaught Place');
  const [destinationName, setDestinationName] = useState<string>('India Gate');
  const [routeCoordinates, setRouteCoordinates] = useState<[number, number][]>(FALLBACK_MOCK_ROUTE);
  const [estimatedDurationMins, setEstimatedDurationMins] = useState<number>(24);
  const [totalDistanceKm, setTotalDistanceKm] = useState<string>('2.4');

  // Live Telemetry & Geolocation
  const [currentLocation, setCurrentLocation] = useState<[number, number] | null>(null);
  const [currentHeading, setCurrentHeading] = useState<number | null>(null);
  const [currentSpeed, setCurrentSpeed] = useState<number>(0);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [batteryLevel, setBatteryLevel] = useState<number>(92);
  const [isCharging, setIsCharging] = useState<boolean>(false);

  // Deviation & Safety Engine
  const [status, setStatus] = useState<JourneyStatus>('ACTIVE');
  const [deviationDistance, setDeviationDistance] = useState<number>(0);
  const [isBurstMode, setIsBurstMode] = useState<boolean>(false);
  const [lastPingTime, setLastPingTime] = useState<string>('Just now');
  const [pingCount, setPingCount] = useState<number>(0);

  // Dynamic Hazard Zones
  const [hazards, setHazards] = useState<HazardItem[]>([]);
  const [isLoadingHazards, setIsLoadingHazards] = useState(false);

  // Active Incident (SOS) Tracking
  const [incidentId, setIncidentId] = useState<string | null>(null);
  const [isTriggeringSOS, setIsTriggeringSOS] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Simulation controls for testing/demo
  const [isSimulatedOffRoute, setIsSimulatedOffRoute] = useState(false);

  // Refs for intervals & continuous operations
  const watchIdRef = useRef<number | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const previousLocationRef = useRef<[number, number] | null>(null);
  const batteryRef = useRef<any>(null);

  // 1. Mount & Auth Check
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    let isSubscribed = true;
    const timer = setTimeout(() => {
      if (!isSubscribed) return;

      try {
        const storedUser = localStorage.getItem('abhaya_user');
        if (!storedUser) {
          router.replace('/login');
          return;
        }
        const parsed = JSON.parse(storedUser);
        if (!parsed || parsed.is_verified !== true) {
          router.replace('/login');
        } else {
          setCurrentUser(parsed);
          setIsAuthenticated(true);
        }
      } catch {
        router.replace('/login');
      }
    }, 0);

    return () => {
      isSubscribed = false;
      clearTimeout(timer);
    };
  }, [isMounted, router]);

  // 2. Load Journey State from localStorage or fallback to mock
  useEffect(() => {
    if (!isAuthenticated) return;

    try {
      const activeId = localStorage.getItem('active_journey_id');
      const activeDest = localStorage.getItem('active_journey_destination');
      const activeOrigin = localStorage.getItem('active_journey_origin');
      const storedRoute = localStorage.getItem('active_journey_route');
      const storedDist = localStorage.getItem('active_journey_distance');
      const storedDur = localStorage.getItem('active_journey_duration');

      if (activeId) {
        setJourneyId(activeId);
      } else {
        // Fallback to mock journey ID if none active
        const fallbackId = 'mock-journey-' + Math.random().toString(36).substring(2, 9);
        setJourneyId(fallbackId);
      }

      if (activeDest) setDestinationName(activeDest);
      if (activeOrigin) setOriginName(activeOrigin);

      if (storedRoute) {
        const parsedRoute = JSON.parse(storedRoute);
        if (Array.isArray(parsedRoute) && parsedRoute.length > 0) {
          // Normalize coordinate order: if [lng, lat], convert to [lat, lng]
          const normalized: [number, number][] = parsedRoute.map((pt: any) => {
            if (Math.abs(pt[0]) > 45 && Math.abs(pt[1]) <= 45) {
              return [pt[1], pt[0]];
            }
            return [pt[0], pt[1]];
          });
          setRouteCoordinates(normalized);
          // Default initial location to route starting point
          setCurrentLocation(normalized[0]);
          previousLocationRef.current = normalized[0];
        }
      } else {
        // Use fallback route
        setCurrentLocation(FALLBACK_MOCK_ROUTE[0]);
        previousLocationRef.current = FALLBACK_MOCK_ROUTE[0];
      }

      if (storedDist) {
        const dMeters = parseFloat(storedDist);
        setTotalDistanceKm((dMeters / 1000).toFixed(1));
      }
      if (storedDur) {
        const dSec = parseFloat(storedDur);
        setEstimatedDurationMins(Math.max(1, Math.round(dSec / 60)));
      }
    } catch (err) {
      console.error('Failed to load active journey from storage:', err);
    }
  }, [isAuthenticated]);

  // 3. Fetch Dynamic Hazard Zones from /api/hazards
  const fetchHazards = useCallback(async () => {
    setIsLoadingHazards(true);
    try {
      const res = await fetch('/api/hazards');
      const data = await res.json();
      if (data.hazards && Array.isArray(data.hazards)) {
        setHazards(data.hazards);
      }
    } catch (err) {
      console.warn('Hazard zones fetch error (using cache or fallback):', err);
    } finally {
      setIsLoadingHazards(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchHazards();
    }
  }, [isAuthenticated, fetchHazards]);

  // 4. Battery Level Monitoring
  useEffect(() => {
    let batteryInstance: any = null;

    const updateBatteryInfo = (bat: any) => {
      const lvl = Math.round(bat.level * 100);
      setBatteryLevel(lvl);
      setIsCharging(bat.charging);
    };

    if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
      (navigator as any)
        .getBattery()
        .then((bat: any) => {
          batteryInstance = bat;
          batteryRef.current = bat;
          updateBatteryInfo(bat);

          bat.addEventListener('levelchange', () => updateBatteryInfo(bat));
          bat.addEventListener('chargingchange', () => updateBatteryInfo(bat));
        })
        .catch(() => {});
    }

    return () => {
      if (batteryInstance) {
        try {
          batteryInstance.removeEventListener('levelchange', () => {});
          batteryInstance.removeEventListener('chargingchange', () => {});
        } catch {}
      }
    };
  }, []);

  // 5. Geolocation Watcher (High Accuracy)
  useEffect(() => {
    if (!isAuthenticated) return;

    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      console.warn('Geolocation API not supported in browser.');
      return;
    }

    const onGeoSuccess = (pos: GeolocationPosition) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const speed = pos.coords.speed ? Math.round(pos.coords.speed * 3.6) : 0; // km/h
      const accuracy = Math.round(pos.coords.accuracy);

      // If simulated off-route is active for demo, do not overwrite with real coordinate
      if (!isSimulatedOffRoute) {
        const newCoords: [number, number] = [lat, lng];

        // Determine heading
        let heading = pos.coords.heading;
        if ((heading === null || isNaN(heading)) && previousLocationRef.current) {
          const prev = previousLocationRef.current;
          if (Math.abs(prev[0] - lat) > 0.00005 || Math.abs(prev[1] - lng) > 0.00005) {
            heading = calculateBearing(prev[0], prev[1], lat, lng);
          }
        }

        previousLocationRef.current = newCoords;
        setCurrentLocation(newCoords);
        setCurrentSpeed(speed);
        setGpsAccuracy(accuracy);
        if (heading !== null && !isNaN(heading)) {
          setCurrentHeading(heading);
        }

        // Calculate perpendicular distance to route
        const dist = calculateRouteDeviation(newCoords, routeCoordinates);
        setDeviationDistance(dist);

        // If distance > 75 meters and not already in SOS emergency, set DEVIATED
        if (status !== 'EMERGENCY') {
          if (dist > 75) {
            setStatus('DEVIATED');
          } else if (status === 'DEVIATED') {
            setStatus('ACTIVE');
          }
        }
      }
    };

    const onGeoError = (err: GeolocationPositionError) => {
      console.warn('Geolocation watch notice:', err.message);
    };

    try {
      watchIdRef.current = navigator.geolocation.watchPosition(
        onGeoSuccess,
        onGeoError,
        {
          enableHighAccuracy: true,
          maximumAge: 1000,
          timeout: 10000,
        }
      );
    } catch (e) {
      console.error('WatchPosition init failed:', e);
    }

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [isAuthenticated, routeCoordinates, status, isSimulatedOffRoute]);

  // 6. Elapsed Journey Timer
  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // Format Elapsed Time (MM:SS)
  const formattedElapsedTime = useMemo(() => {
    const mins = Math.floor(elapsedSeconds / 60);
    const secs = elapsedSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, [elapsedSeconds]);

  // 7. Telemetry & Burst Engine (/api/journeys/ping)
  // Interval rule:
  // If battery < 20% or status === 'DEVIATED' or status === 'EMERGENCY': Burst Mode (every 4s with is_burst: true)
  // Else: Standard Mode (every 15s with is_burst: false)
  const shouldBurst = useMemo(() => {
    return batteryLevel < 20 || status === 'DEVIATED' || status === 'EMERGENCY';
  }, [batteryLevel, status]);

  useEffect(() => {
    setIsBurstMode(shouldBurst);
  }, [shouldBurst]);

  const sendLocationPing = useCallback(
    async (burstFlag: boolean) => {
      if (!currentLocation) return;

      try {
        const payload = {
          journeyId,
          userId: currentUser?.id || null,
          lat: currentLocation[0],
          lng: currentLocation[1],
          speed: currentSpeed,
          accuracy: gpsAccuracy,
          batteryLevel,
          is_burst: burstFlag,
        };

        const res = await fetch('/api/journeys/ping', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          const now = new Date();
          setLastPingTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
          setPingCount((prev) => prev + 1);
        }
      } catch (err) {
        console.warn('Ping delivery failed:', err);
      }
    },
    [currentLocation, currentSpeed, gpsAccuracy, batteryLevel, journeyId, currentUser]
  );

  // Setup Ping Interval based on burst state
  useEffect(() => {
    if (!isAuthenticated || !currentLocation) return;

    // Send immediate ping upon interval transition
    sendLocationPing(shouldBurst);

    const pingIntervalMs = shouldBurst ? 4000 : 15000;

    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
    }

    pingIntervalRef.current = setInterval(() => {
      sendLocationPing(shouldBurst);
    }, pingIntervalMs);

    return () => {
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }
    };
  }, [isAuthenticated, shouldBurst, currentLocation, sendLocationPing]);

  // 8. Emergency SOS Trigger
  const handleTriggerEmergencySOS = async () => {
    if (!currentLocation) return;

    setIsTriggeringSOS(true);
    setStatus('EMERGENCY');

    try {
      const res = await fetch('/api/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser?.id || null,
          journeyId,
          triggerType: 'EMERGENCY_BUTTON_PRESS',
          lat: currentLocation[0],
          lng: currentLocation[1],
          batteryLevel,
          notes: `SOS pressed on active journey. Deviation: ${deviationDistance}m, Speed: ${currentSpeed}km/h`,
        }),
      });

      const data = await res.json();
      if (data.success && data.incidentId) {
        setIncidentId(data.incidentId);
      }

      // Immediately transmit high-frequency burst ping
      sendLocationPing(true);
    } catch (err) {
      console.error('Emergency SOS transmission error:', err);
    } finally {
      setIsTriggeringSOS(false);
    }
  };

  // Safe Recalibration / I'm Safe handler
  const handleAcknowledgeSafe = () => {
    if (status === 'DEVIATED') {
      setStatus('ACTIVE');
      setIsSimulatedOffRoute(false);
      // Snap location back to nearest route point if simulated
      if (routeCoordinates.length > 0) {
        setCurrentLocation(routeCoordinates[0]);
        setDeviationDistance(0);
      }
    } else if (status === 'EMERGENCY') {
      setStatus('ACTIVE');
      setIncidentId(null);
    }
  };

  // Interactive Simulation Toggles for rapid verification
  const handleSimulateDeviation = () => {
    if (!currentLocation) return;
    setIsSimulatedOffRoute(true);
    // Shift coordinate ~140m off corridor (0.0012 lat offset)
    const deviatedPos: [number, number] = [
      currentLocation[0] + 0.0013,
      currentLocation[1] + 0.0013,
    ];
    setCurrentLocation(deviatedPos);
    previousLocationRef.current = deviatedPos;
    const dist = calculateRouteDeviation(deviatedPos, routeCoordinates);
    setDeviationDistance(dist);
    setStatus('DEVIATED');
  };

  const handleSimulateNormalRoute = () => {
    setIsSimulatedOffRoute(false);
    if (routeCoordinates.length > 2) {
      // Place right on 2nd waypoint
      const pt = routeCoordinates[1];
      setCurrentLocation(pt);
      previousLocationRef.current = pt;
      const dist = calculateRouteDeviation(pt, routeCoordinates);
      setDeviationDistance(dist);
      setStatus('ACTIVE');
    }
  };

  // End / Complete Journey
  const handleEndJourney = () => {
    setStatus('COMPLETED');
    localStorage.removeItem('active_journey_id');
    localStorage.removeItem('active_journey_destination');
    router.push('/map');
  };

  // Auth Loading Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0a0104] text-rose-50 flex flex-col items-center justify-center p-4 font-sans antialiased">
        <div className="flex flex-col items-center gap-4 animate-in fade-in duration-300">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-rose-600 to-pink-600 flex items-center justify-center font-bold text-white text-3xl shadow-2xl shadow-rose-600/40 animate-pulse">
            A
          </div>
          <div className="flex items-center gap-2 text-rose-400 text-xs font-semibold tracking-wider uppercase">
            <ShieldCheck className="w-4 h-4 animate-spin text-rose-500" />
            Initializing Shield Engine Telemetry...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0104] text-zinc-100 flex flex-col md:flex-row font-sans antialiased relative selection:bg-rose-900 selection:text-white">
      {/* 
        1. Visual Alert Perimeter (Screen Edge Pulsing)
        Inactive: hidden (unmounted)
        DEVIATION: amber perimeter pulse
        SOS / EMERGENCY: rapid crimson strobe
      */}
      {status === 'DEVIATED' && (
        <div
          className="fixed inset-0 pointer-events-none z-50 border-[6px] border-amber-500/70 animate-pulse shadow-[inset_0_0_20px_rgba(245,158,11,0.5)]"
          aria-label="Deviation Warning Perimeter"
        />
      )}

      {status === 'EMERGENCY' && (
        <div
          className="fixed inset-0 pointer-events-none z-50 border-[8px] border-rose-600 animate-ping shadow-[inset_0_0_40px_rgba(225,29,72,0.8)]"
          aria-label="Emergency SOS Perimeter Strobe"
        />
      )}

      <Navbar />

      <main className="flex-1 md:ml-72 p-4 md:p-6 pb-28 md:pb-8 max-w-7xl mx-auto space-y-5">
        {/* Top Header & System Telemetry Bar */}
        <header className="flex flex-wrap justify-between items-center gap-4 bg-[#14040c]/90 border border-rose-950/60 p-5 rounded-3xl backdrop-blur-xl shadow-xl">
          <div className="flex items-center gap-3.5">
            <div
              className={`p-3 rounded-2xl shadow-inner ${
                status === 'EMERGENCY'
                  ? 'bg-rose-600 text-white animate-bounce'
                  : status === 'DEVIATED'
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'bg-gradient-to-br from-rose-600 to-pink-600 text-white'
              }`}
            >
              {status === 'EMERGENCY' ? (
                <ShieldAlert className="w-6 h-6" />
              ) : status === 'DEVIATED' ? (
                <AlertTriangle className="w-6 h-6" />
              ) : (
                <Navigation className="w-6 h-6" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black tracking-tight text-white">
                  Safe Journey Telemetry
                </h1>
                <span className="text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full bg-rose-950/70 text-rose-300 border border-rose-900/50">
                  Live Corridor
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5 font-medium flex items-center gap-2">
                <span>{originName}</span>
                <span className="text-rose-500">➔</span>
                <span className="text-rose-200 font-semibold">{destinationName}</span>
              </p>
            </div>
          </div>

          {/* Status Badge & System Signals */}
          <div className="flex items-center gap-3">
            {/* Battery Indicator */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-[#1d0511] border border-rose-950/70 text-xs font-mono">
              {batteryLevel < 20 ? (
                <BatteryWarning className="w-4 h-4 text-amber-400 animate-pulse" />
              ) : isCharging ? (
                <BatteryCharging className="w-4 h-4 text-emerald-400" />
              ) : (
                <Battery className="w-4 h-4 text-rose-400" />
              )}
              <span className={batteryLevel < 20 ? 'text-amber-300 font-bold' : 'text-zinc-300'}>
                {batteryLevel}%
              </span>
            </div>

            {/* Ping Frequency Chip */}
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border text-xs font-mono ${
                isBurstMode
                  ? 'bg-rose-950/80 text-rose-300 border-rose-700 animate-pulse'
                  : 'bg-[#18040d] text-zinc-400 border-rose-950/70'
              }`}
            >
              <Radio className={`w-3.5 h-3.5 ${isBurstMode ? 'text-rose-400 animate-spin' : 'text-zinc-500'}`} />
              <span>{isBurstMode ? 'Burst (4s)' : 'Standard (15s)'}</span>
            </div>

            {/* Overall Status Pill */}
            <span
              className={`px-4 py-1.5 rounded-full text-xs font-extrabold tracking-wide border shadow-md flex items-center gap-1.5 ${
                status === 'EMERGENCY'
                  ? 'bg-rose-600 text-white border-rose-400 animate-pulse'
                  : status === 'DEVIATED'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/60 animate-pulse'
                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  status === 'EMERGENCY'
                    ? 'bg-white animate-ping'
                    : status === 'DEVIATED'
                    ? 'bg-amber-400'
                    : 'bg-emerald-400'
                }`}
              />
              {status === 'EMERGENCY'
                ? 'SOS ACTIVE'
                : status === 'DEVIATED'
                ? 'ROUTE DEVIATED'
                : 'CORRIDOR VERIFIED'}
            </span>
          </div>
        </header>

        {/* Dynamic Warning Alert: Deviation Banner */}
        {status === 'DEVIATED' && (
          <div className="bg-gradient-to-r from-amber-950/60 via-[#260f08] to-amber-950/60 border-2 border-amber-500/80 p-5 rounded-3xl space-y-3 shadow-2xl animate-in slide-in-from-top duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="p-3 bg-amber-500/25 text-amber-300 rounded-2xl border border-amber-500/40 shrink-0">
                  <AlertTriangle className="w-6 h-6 animate-bounce" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-amber-200 text-lg">
                      Corridor Deviation Warning
                    </h3>
                    <span className="text-[11px] font-mono font-bold bg-amber-500/20 text-amber-300 px-2.5 py-0.5 rounded-full border border-amber-500/40">
                      {deviationDistance}m off corridor
                    </span>
                  </div>
                  <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                    You have moved <strong className="text-amber-300">{deviationDistance} meters</strong> beyond your planned safe route. Telemetry has switched into 4-second burst ping mode.
                  </p>
                </div>
              </div>

              <div className="flex gap-2.5 shrink-0">
                <button
                  onClick={handleAcknowledgeSafe}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all shadow-lg shadow-emerald-600/30 flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" /> I'm Safe / Re-center
                </button>
                <button
                  onClick={handleTriggerEmergencySOS}
                  className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl transition-all shadow-lg shadow-rose-600/40 flex items-center gap-2"
                >
                  <ShieldAlert className="w-4 h-4" /> Trigger SOS
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Dynamic Warning Alert: Emergency SOS Active Banner */}
        {status === 'EMERGENCY' && (
          <div className="bg-gradient-to-r from-rose-950 via-[#330514] to-rose-950 border-2 border-rose-500 p-5 rounded-3xl space-y-3 shadow-2xl animate-in slide-in-from-top duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="p-3 bg-rose-600 text-white rounded-2xl shadow-lg shadow-rose-600/50 shrink-0 animate-ping">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-white text-lg tracking-wide">
                      🚨 EMERGENCY SOS DISPATCHED
                    </h3>
                    <span className="text-[11px] font-mono font-bold bg-rose-900/60 text-rose-200 px-2.5 py-0.5 rounded-full border border-rose-700">
                      Rapid Strobe Active
                    </span>
                  </div>
                  <p className="text-xs text-rose-100 mt-1 leading-relaxed">
                    Live GPS broadcast transmitted to emergency contacts and community responders. High-frequency telemetry logging every 4 seconds.
                  </p>
                  {incidentId && (
                    <p className="text-[11px] text-rose-300 font-mono mt-1">
                      Incident Ref: {incidentId}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-2.5 shrink-0">
                <a
                  href="tel:112"
                  className="px-4 py-2.5 bg-white text-rose-950 hover:bg-rose-50 font-black text-xs rounded-xl transition-all shadow-lg flex items-center gap-2"
                >
                  <PhoneCall className="w-4 h-4 text-rose-600" /> Call 112 (Police)
                </a>
                <button
                  onClick={handleAcknowledgeSafe}
                  className="px-4 py-2.5 bg-rose-900/80 hover:bg-rose-800 text-rose-200 font-bold text-xs rounded-xl border border-rose-700/80 transition-all"
                >
                  Cancel Distress
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Map & Live Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Main Map Container (8 cols) */}
          <div className="lg:col-span-8 bg-[#14040c]/90 border border-rose-950/60 rounded-3xl p-3 md:p-4 shadow-2xl relative space-y-3">
            <div className="h-[460px] md:h-[540px] w-full rounded-2xl overflow-hidden relative border border-rose-950/40">
              <SafetyMap
                userLocation={currentLocation}
                userHeading={currentHeading}
                routeCoordinates={routeCoordinates}
                hazards={hazards}
                className="w-full h-full"
              />

              {/* Map Floating HUD Overlay */}
              <div className="absolute top-3 left-3 z-[400] flex flex-wrap gap-2 pointer-events-none">
                <div className="pointer-events-auto bg-[#14040c]/90 backdrop-blur-md border border-rose-950/80 px-3 py-1.5 rounded-xl text-[11px] font-mono text-zinc-300 flex items-center gap-2 shadow-lg">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                  <span>GPS: {currentLocation ? `${currentLocation[0].toFixed(4)}, ${currentLocation[1].toFixed(4)}` : 'Acquiring...'}</span>
                </div>
                {deviationDistance > 0 && (
                  <div
                    className={`pointer-events-auto backdrop-blur-md border px-3 py-1.5 rounded-xl text-[11px] font-mono font-bold flex items-center gap-1.5 shadow-lg ${
                      deviationDistance > 75
                        ? 'bg-amber-950/90 text-amber-300 border-amber-600/70 animate-pulse'
                        : 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60'
                    }`}
                  >
                    <Route className="w-3.5 h-3.5" />
                    <span>Corridor Offset: {deviationDistance}m</span>
                  </div>
                )}
              </div>

              {/* Simulation Quick-Bar on Bottom of Map */}
              <div className="absolute bottom-3 left-3 right-3 z-[400] flex items-center justify-between gap-2 p-2 rounded-2xl bg-[#0e0208]/90 backdrop-blur-md border border-rose-950/70 text-xs">
                <div className="flex items-center gap-2 pl-2 text-zinc-400">
                  <Zap className="w-3.5 h-3.5 text-rose-400" />
                  <span className="font-semibold text-rose-300 hidden sm:inline">Telemetry Sandbox:</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSimulateDeviation}
                    title="Simulate walking >75m off corridor to test amber perimeter pulse"
                    className="px-2.5 py-1 rounded-lg bg-amber-950/70 hover:bg-amber-900 border border-amber-800 text-amber-300 text-[11px] font-bold transition-all"
                  >
                    Simulate Deviation (&gt;75m)
                  </button>
                  <button
                    onClick={handleSimulateNormalRoute}
                    title="Return position to safe corridor"
                    className="px-2.5 py-1 rounded-lg bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 text-[11px] font-bold transition-all"
                  >
                    Snap To Route
                  </button>
                </div>
              </div>
            </div>

            {/* Map Legend Bar */}
            <div className="flex flex-wrap items-center justify-between text-xs text-zinc-400 px-2 pt-1 gap-3">
              <div className="flex items-center gap-4 flex-wrap">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_#f43f5e]" /> Directional GPS
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-4 h-1 bg-[#f43f5e] rounded-full shadow-[0_0_6px_#f43f5e]" /> Safe Corridor
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full border border-amber-500 bg-amber-400/30" /> Caution Zone
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full border border-rose-600 bg-rose-600/50" /> High Hazard
                </span>
              </div>
              <button
                onClick={fetchHazards}
                disabled={isLoadingHazards}
                className="flex items-center gap-1 text-[11px] text-rose-400 hover:text-rose-300 transition-colors"
              >
                <RefreshCw className={`w-3 h-3 ${isLoadingHazards ? 'animate-spin' : ''}`} />
                <span>Refresh Hazards</span>
              </button>
            </div>
          </div>

          {/* Side Telemetry Console & Actions (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            {/* Journey Stats Card */}
            <div className="bg-[#14040c]/90 border border-rose-950/60 p-5 rounded-3xl shadow-xl space-y-4">
              <h2 className="text-sm font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                <Compass className="w-4 h-4 text-rose-500" />
                Live Telemetry Metrics
              </h2>

              <div className="grid grid-cols-2 gap-3 font-mono">
                <div className="bg-[#0e0208] border border-rose-950/60 p-3 rounded-2xl">
                  <span className="text-[10px] text-zinc-500 uppercase block">Elapsed Time</span>
                  <span className="text-lg font-black text-white">{formattedElapsedTime}</span>
                  <span className="text-[10px] text-rose-400 block mt-0.5">ETA: ~{estimatedDurationMins}m</span>
                </div>

                <div className="bg-[#0e0208] border border-rose-950/60 p-3 rounded-2xl">
                  <span className="text-[10px] text-zinc-500 uppercase block">Speed</span>
                  <span className="text-lg font-black text-white">{currentSpeed} <span className="text-xs font-normal text-zinc-400">km/h</span></span>
                  <span className="text-[10px] text-zinc-500 block mt-0.5">Pedestrian Mode</span>
                </div>

                <div className="bg-[#0e0208] border border-rose-950/60 p-3 rounded-2xl">
                  <span className="text-[10px] text-zinc-500 uppercase block">Distance</span>
                  <span className="text-lg font-black text-white">{totalDistanceKm} <span className="text-xs font-normal text-zinc-400">km</span></span>
                  <span className="text-[10px] text-zinc-500 block mt-0.5">Planned Route</span>
                </div>

                <div className="bg-[#0e0208] border border-rose-950/60 p-3 rounded-2xl">
                  <span className="text-[10px] text-zinc-500 uppercase block">GPS Accuracy</span>
                  <span className="text-lg font-black text-white">±{gpsAccuracy ?? 5} <span className="text-xs font-normal text-zinc-400">m</span></span>
                  <span className="text-[10px] text-emerald-400 block mt-0.5">High Precision</span>
                </div>
              </div>

              {/* Heartbeat / Burst Transmission Log */}
              <div className="bg-[#0e0208] border border-rose-950/60 p-3.5 rounded-2xl space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400 flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-rose-500" />
                    Cloud Telemetry Sync:
                  </span>
                  <span className="font-mono text-zinc-200">{lastPingTime}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-zinc-500 font-mono pt-1 border-t border-rose-950/40">
                  <span>Logged Pings: {pingCount}</span>
                  <span className={isBurstMode ? 'text-amber-400 font-bold' : 'text-zinc-400'}>
                    Mode: {isBurstMode ? 'HIGH-FREQ BURST' : 'STANDARD'}
                  </span>
                </div>
              </div>
            </div>

            {/* Emergency SOS Trigger Button */}
            <div className="bg-gradient-to-b from-[#1e0513] to-[#12020a] border-2 border-rose-900/60 p-5 rounded-3xl shadow-2xl text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-600/20 text-rose-400 flex items-center justify-center mx-auto border border-rose-600/40">
                <ShieldAlert className="w-6 h-6 animate-pulse" />
              </div>

              <div>
                <h3 className="font-black text-white text-base">Emergency SOS Dispatch</h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Instant broadcast to trusted emergency network & high-rate burst logging.
                </p>
              </div>

              <button
                onClick={handleTriggerEmergencySOS}
                disabled={isTriggeringSOS || status === 'EMERGENCY'}
                className="w-full py-4 px-6 bg-gradient-to-r from-rose-600 via-rose-500 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-black text-sm tracking-wider uppercase rounded-2xl shadow-xl shadow-rose-950/80 transition-all transform active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2.5"
              >
                <ShieldAlert className="w-5 h-5" />
                {status === 'EMERGENCY'
                  ? 'SOS BROADCAST ACTIVE'
                  : isTriggeringSOS
                  ? 'TRANSMITTING...'
                  : 'TRIGGER EMERGENCY SOS'}
              </button>

              <button
                onClick={handleEndJourney}
                className="w-full py-3 px-4 bg-[#0a0104] hover:bg-[#1b040e] text-zinc-400 hover:text-zinc-200 text-xs font-semibold rounded-2xl border border-rose-950/70 transition-all flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                End & Complete Journey
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
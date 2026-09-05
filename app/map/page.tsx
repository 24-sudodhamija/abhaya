'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/navigation/Navbar';
import SafetyMap, { HazardItem } from '@/components/map/SafetyMap';
import {
  Navigation,
  MapPin,
  Crosshair,
  Search,
  ShieldCheck,
  AlertTriangle,
  Clock,
  ArrowRight,
  ArrowUpDown,
  Loader2,
  X,
  CheckCircle2,
  Flame,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

export default function MapPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [user, setUser] = useState<any>(null);

  // Map Coordinates & Route State
  const [userLocation, setUserLocation] = useState<[number, number] | null>([28.6139, 77.2090]); // Default New Delhi
  const [originText, setOriginText] = useState('Current Location (Connaught Place)');
  const [originCoords, setOriginCoords] = useState<[number, number]>([28.6315, 77.2167]);

  const [destinationText, setDestinationText] = useState('India Gate');
  const [destCoords, setDestCoords] = useState<[number, number] | null>([28.6129, 77.2295]);

  // Which location is being picked when tapping the map: 'origin' or 'destination'
  const [pinTarget, setPinTarget] = useState<'origin' | 'destination'>('origin');

  const [routeCoordinates, setRouteCoordinates] = useState<[number, number][]>([]);
  const [routeDistance, setRouteDistance] = useState<number | null>(null);
  const [routeDuration, setRouteDuration] = useState<number | null>(null);
  const [routeSafetyScore, setRouteSafetyScore] = useState<number | null>(null);
  const [hazardsAlongRoute, setHazardsAlongRoute] = useState<any[]>([]);
  const [detourMessage, setDetourMessage] = useState<string | null>(null);

  // Hazards
  const [hazards, setHazards] = useState<HazardItem[]>([]);
  const [isReportingHazard, setIsReportingHazard] = useState(false);
  const [hazardPin, setHazardPin] = useState<{ lat: number; lng: number } | null>(null);
  const [hazardTitle, setHazardTitle] = useState('');
  const [hazardDesc, setHazardDesc] = useState('');
  const [hazardRisk, setHazardRisk] = useState<'MEDIUM' | 'HIGH'>('HIGH');
  const [isSubmittingHazard, setIsSubmittingHazard] = useState(false);

  // Search Autocomplete State
  const [searchResults, setSearchResults] = useState<NominatimResult[]>([]);
  const [activeSearchField, setActiveSearchField] = useState<'origin' | 'destination' | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Loading & UI States
  const [isPlanning, setIsPlanning] = useState(false);
  const [isStartingJourney, setIsStartingJourney] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 1. Authentication Enforcement
  useEffect(() => {
    if (!isMounted) return;

    let isSubscribed = true;
    const timer = setTimeout(() => {
      if (!isSubscribed) return;

      try {
        const stored = localStorage.getItem('abhaya_user');
        if (!stored) {
          router.replace('/login');
          return;
        }
        const parsed = JSON.parse(stored);
        if (!parsed || parsed.is_verified !== true) {
          router.replace('/login');
        } else {
          setUser(parsed);
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

  // 2. Fetch Active Hazards
  const loadHazards = async () => {
    try {
      const res = await fetch('/api/hazards');
      const data = await res.json();
      if (res.ok && data.hazards) {
        setHazards(data.hazards);
      }
    } catch (err) {
      console.error('Failed to load hazards:', err);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadHazards();
    }
  }, [isAuthenticated]);

  // 3. Geolocation Handler (Auto-sets GPS position without locking it)
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setErrorMessage('Geolocation is not supported on this browser.');
      return;
    }

    setIsLocating(true);
    setErrorMessage(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords: [number, number] = [position.coords.latitude, position.coords.longitude];
        setUserLocation(coords);
        setOriginCoords(coords);
        setOriginText('Device GPS Position');
        setIsLocating(false);
      },
      (err) => {
        console.warn('Geolocation failed, retaining default coords:', err);
        setErrorMessage('Unable to retrieve GPS. Utilizing approximate location.');
        setIsLocating(false);
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  // 4. Autocomplete Search via Nominatim for both Origin and Destination
  const handleLocationSearch = (field: 'origin' | 'destination', text: string) => {
    if (field === 'origin') {
      setOriginText(text);
    } else {
      setDestinationText(text);
    }
    setActiveSearchField(field);
    setErrorMessage(null);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!text.trim() || text.length < 3) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const query = encodeURIComponent(text.trim());
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=5`
        );
        const data: NominatimResult[] = await res.json();
        setSearchResults(data || []);
        setShowDropdown(true);
      } catch (err) {
        console.error('Nominatim search failed:', err);
      } finally {
        setIsSearching(false);
      }
    }, 400);
  };

  const handleSelectSearchResult = (result: NominatimResult) => {
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);
    const label = result.display_name.split(',')[0];

    if (activeSearchField === 'origin') {
      // Auto-set starting point and GPS pulse position without locking it
      setOriginCoords([lat, lon]);
      setUserLocation([lat, lon]);
      setOriginText(label);
    } else {
      setDestCoords([lat, lon]);
      setDestinationText(label);
    }

    setShowDropdown(false);
    setActiveSearchField(null);
  };

  // Swap Origin and Destination
  const handleSwapLocations = () => {
    if (!destCoords) return;
    const prevOriginText = originText;
    const prevOriginCoords = originCoords;
    const prevDestText = destinationText;
    const prevDestCoords = destCoords;

    setOriginText(prevDestText);
    setOriginCoords(prevDestCoords);
    setUserLocation(prevDestCoords); // Auto-sets GPS to new starting point

    setDestinationText(prevOriginText);
    setDestCoords(prevOriginCoords);

    // Reset calculated route to allow recalculated path
    setRouteCoordinates([]);
    setRouteDistance(null);
    setRouteDuration(null);
    setRouteSafetyScore(null);
    setHazardsAlongRoute([]);
    setDetourMessage(null);
  };

  // 5. Calculate Route
  const handleCalculateRoute = async () => {
    if (!originCoords || !destCoords) {
      setErrorMessage('Please specify both an origin and destination.');
      return;
    }

    setIsPlanning(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/journeys/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originLat: originCoords[0],
          originLng: originCoords[1],
          destLat: destCoords[0],
          destLng: destCoords[1],
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.coordinates) {
        throw new Error(data.error || 'Failed to calculate pedestrian route.');
      }

      setRouteCoordinates(data.coordinates);
      setRouteDistance(data.distance);
      setRouteDuration(data.duration);
      if (typeof data.safetyScore === 'number') {
        setRouteSafetyScore(data.safetyScore);
      }
      if (Array.isArray(data.hazardsAlongRoute)) {
        setHazardsAlongRoute(data.hazardsAlongRoute);
      }
      if (data.detourMessage) {
        setDetourMessage(data.detourMessage);
      } else {
        setDetourMessage(null);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Route planning request failed.');
    } finally {
      setIsPlanning(false);
    }
  };

  // 6. Hazard Proximity Intersection Calculation
  const hazardCorridorWarning = useMemo(() => {
    if (!routeCoordinates || routeCoordinates.length === 0 || hazards.length === 0) {
      return null;
    }

    // Haversine distance in meters
    const getDistanceMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
      const R = 6371e3;
      const phi1 = (lat1 * Math.PI) / 180;
      const phi2 = (lat2 * Math.PI) / 180;
      const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
      const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;
      const a =
        Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
        Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    let highCount = 0;
    let mediumCount = 0;

    for (const h of hazards) {
      for (const pt of routeCoordinates) {
        // Handle both [lat, lng] and [lng, lat]
        const ptLat = Math.abs(pt[0]) > 45 ? pt[1] : pt[0];
        const ptLng = Math.abs(pt[0]) > 45 ? pt[0] : pt[1];

        const dist = getDistanceMeters(h.lat, h.lng, ptLat, ptLng);
        if (dist <= 300) {
          if (h.risk_level?.toUpperCase() === 'HIGH') highCount++;
          else mediumCount++;
          break;
        }
      }
    }

    if (highCount > 0) {
      return {
        level: 'HIGH',
        message: `Caution: Route passes within 300m of ${highCount} reported high-risk zone(s).`,
      };
    }

    if (mediumCount > 0) {
      return {
        level: 'MEDIUM',
        message: `Notice: Route traverses ${mediumCount} community-reported hazard(s).`,
      };
    }

    return {
      level: 'SAFE',
      message: 'Verified Safe: 0 active hazard intersections detected on this route.',
    };
  }, [routeCoordinates, hazards]);

  // 7. Start Monitored Journey
  const handleStartJourney = async () => {
    if (!destCoords || !originCoords) return;

    setIsStartingJourney(true);
    setErrorMessage(null);

    try {
      let batteryLevel = 88;
      if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
        try {
          const battery: any = await (navigator as any).getBattery();
          batteryLevel = Math.round(battery.level * 100);
        } catch {
          // Fallback
        }
      }

      const res = await fetch('/api/journeys/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          originName: originText,
          destinationName: destinationText,
          startLat: originCoords[0],
          startLng: originCoords[1],
          destLat: destCoords[0],
          destLng: destCoords[1],
          batteryStart: batteryLevel,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.journeyId) {
        throw new Error(data.error || 'Failed to initialize active journey.');
      }

      localStorage.setItem('active_journey_id', data.journeyId);
      localStorage.setItem('active_journey_destination', destinationText);
      localStorage.setItem('active_journey_origin', originText);
      if (routeCoordinates && routeCoordinates.length > 0) {
        localStorage.setItem('active_journey_route', JSON.stringify(routeCoordinates));
      }
      if (originCoords) {
        localStorage.setItem('active_journey_start_coords', JSON.stringify(originCoords));
      }
      if (destCoords) {
        localStorage.setItem('active_journey_dest_coords', JSON.stringify(destCoords));
      }
      if (routeDistance) {
        localStorage.setItem('active_journey_distance', routeDistance.toString());
      }
      if (routeDuration) {
        localStorage.setItem('active_journey_duration', routeDuration.toString());
      }

      router.push('/journey');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Could not start monitored journey.');
    } finally {
      setIsStartingJourney(false);
    }
  };

  // 8. Submit New Hazard Zone
  const handleSubmitHazard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hazardPin || !hazardTitle.trim()) {
      setErrorMessage('Please specify hazard location and title.');
      return;
    }

    if (!user || user.is_verified !== true) {
      setErrorMessage('Only verified residents with active ledger credentials can report hazard zones.');
      return;
    }

    setIsSubmittingHazard(true);
    try {
      const res = await fetch('/api/hazards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: hazardTitle.trim(),
          description: hazardDesc.trim(),
          lat: hazardPin.lat,
          lng: hazardPin.lng,
          risk_level: hazardRisk,
          reportedBy: user?.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit hazard.');

      // Refresh hazards list
      await loadHazards();
      setIsReportingHazard(false);
      setHazardPin(null);
      setHazardTitle('');
      setHazardDesc('');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Could not report hazard.');
    } finally {
      setIsSubmittingHazard(false);
    }
  };

  // Prevent UI flash if unauthenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0a0104] text-pink-50 flex flex-col items-center justify-center p-4 font-sans antialiased">
        <div className="flex flex-col items-center gap-4 animate-in fade-in duration-300">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-pink-600 to-rose-500 flex items-center justify-center font-bold text-white text-3xl shadow-2xl shadow-pink-500/40 animate-pulse">
            A
          </div>
          <div className="flex items-center gap-2 text-pink-400 text-xs font-semibold tracking-wider uppercase">
            <ShieldCheck className="w-4 h-4 animate-spin" /> Shield Engine Verifying Access...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0104] text-pink-50 flex flex-col md:flex-row font-sans antialiased">
      <Navbar />

      <main className="flex-1 md:ml-72 p-3 sm:p-6 pb-24 md:pb-6 flex flex-col gap-5 h-screen overflow-hidden">
        {/* Top Floating Control Row */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-rose-950/30 border border-pink-900/40 px-5 py-3.5 rounded-3xl backdrop-blur-xl shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-pink-600/20 text-pink-400 rounded-xl">
              <Navigation className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-wide">
                Route Sentinel &amp; Hazard Radar
              </h1>
              <p className="text-xs text-pink-200/70">
                Choose start &amp; destination on map • Live pedestrian telemetry
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => {
                if (!user || user.is_verified !== true) {
                  setErrorMessage(
                    'Identity Verification Required: Only verified residents with active ledger credentials can report hazard zones.'
                  );
                  return;
                }
                setIsReportingHazard(!isReportingHazard);
                setHazardPin(null);
              }}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-2xl text-xs font-semibold transition-all flex items-center justify-center gap-2 shadow-sm ${
                isReportingHazard
                  ? 'bg-amber-500 text-black border border-amber-400 font-bold'
                  : 'bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              {isReportingHazard ? 'Reporting Mode (Click Map)' : 'Report Hazard Here'}
            </button>
          </div>
        </header>

        {/* Error Banner */}
        {errorMessage && (
          <div className="bg-rose-950/60 border border-rose-800/80 rounded-2xl px-4 py-3 text-xs text-rose-200 flex items-center justify-between shrink-0 animate-in fade-in">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-rose-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Map & Planning Grid */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-0 relative">
          {/* Left Floating Search & Summary Panel */}
          <div className="lg:col-span-4 flex flex-col gap-4 overflow-y-auto pr-1 z-10">
            {/* 1. Journey Planning Card */}
            <div className="bg-[#16040c]/90 border border-rose-950/60 backdrop-blur-xl rounded-3xl p-5 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-pink-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Pedestrian Navigation
                </span>
                <span className="text-[10px] text-zinc-400">
                  Tap Map to Set Coordinates
                </span>
              </div>

              {/* Map Click Target Selector: Choose Start vs Destination */}
              <div className="flex items-center gap-1.5 p-1 bg-[#0d0207] border border-rose-950/60 rounded-2xl">
                <button
                  type="button"
                  onClick={() => {
                    setPinTarget('origin');
                    setIsReportingHazard(false);
                  }}
                  className={`flex-1 py-1.5 px-2.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                    pinTarget === 'origin' && !isReportingHazard
                      ? 'bg-rose-600 text-white shadow-md shadow-rose-950/60'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-rose-950/30'
                  }`}
                  title="Clicking on the map sets the starting point and auto-positions GPS"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                  <span className="truncate">Pin Start Point</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPinTarget('destination');
                    setIsReportingHazard(false);
                  }}
                  className={`flex-1 py-1.5 px-2.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                    pinTarget === 'destination' && !isReportingHazard
                      ? 'bg-rose-600 text-white shadow-md shadow-rose-950/60'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-rose-950/30'
                  }`}
                  title="Clicking on the map sets the journey destination"
                >
                  <span className="w-2 h-2 rounded-full bg-rose-400 shrink-0" />
                  <span className="truncate">Pin Destination</span>
                </button>
              </div>

              {/* Origin / Starting Point Field */}
              <div className="space-y-1.5 relative">
                <div className="flex items-center justify-between text-xs font-semibold text-zinc-300">
                  <label htmlFor="origin-input" className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span>Start Point</span>
                  </label>
                  <span className="text-[10px] text-pink-400 font-normal">
                    {pinTarget === 'origin' ? 'Active Pin Target' : 'GPS Auto-Set'}
                  </span>
                </div>

                <div
                  className={`flex items-center bg-[#0d0207] border rounded-2xl px-3 py-2.5 gap-2 transition-colors ${
                    pinTarget === 'origin'
                      ? 'border-emerald-500/80 ring-1 ring-emerald-500/40'
                      : 'border-rose-950/70 focus-within:border-rose-500 focus-within:ring-1 focus-within:ring-rose-500'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setPinTarget('origin');
                      setIsReportingHazard(false);
                    }}
                    className="text-emerald-400 hover:text-emerald-300 transition-colors"
                    title="Click here to pick start point by clicking on the map"
                  >
                    <MapPin className="w-4 h-4 shrink-0" />
                  </button>

                  <input
                    id="origin-input"
                    type="text"
                    value={originText}
                    onChange={(e) => handleLocationSearch('origin', e.target.value)}
                    onFocus={() => {
                      setActiveSearchField('origin');
                      if (searchResults.length > 0) setShowDropdown(true);
                    }}
                    placeholder="Search or click map to set start..."
                    className="w-full bg-transparent text-xs text-zinc-100 placeholder-zinc-600 outline-none"
                  />

                  {originText && (
                    <button
                      type="button"
                      onClick={() => {
                        setOriginText('');
                        setShowDropdown(false);
                      }}
                      className="text-zinc-500 hover:text-zinc-200"
                      title="Clear"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleGetCurrentLocation}
                    disabled={isLocating}
                    className="p-1.5 hover:bg-rose-950/60 rounded-xl text-rose-300 hover:text-white transition-colors shrink-0"
                    title="Auto-fetch live device GPS"
                  >
                    <Crosshair className={`w-4 h-4 ${isLocating ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Swap Origin and Destination Button */}
              <div className="flex justify-center -my-2 z-10 relative">
                <button
                  type="button"
                  onClick={handleSwapLocations}
                  className="p-1.5 rounded-full bg-[#1e0511] hover:bg-[#2b0819] border border-rose-900/60 text-pink-300 hover:text-white transition-all shadow-md active:scale-95 flex items-center gap-1 px-3 text-[11px]"
                  title="Swap Start and Destination"
                >
                  <ArrowUpDown className="w-3.5 h-3.5" />
                  <span>Swap Direction</span>
                </button>
              </div>

              {/* Destination Field with Autocomplete */}
              <div className="space-y-1.5 relative">
                <div className="flex items-center justify-between text-xs font-semibold text-zinc-300">
                  <label htmlFor="destination-input" className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-400" />
                    <span>Destination</span>
                  </label>
                  {isSearching && activeSearchField === 'destination' && (
                    <span className="text-[10px] text-pink-400 flex items-center gap-1 font-normal">
                      <Loader2 className="w-3 h-3 animate-spin" /> Searching OSM...
                    </span>
                  )}
                  {pinTarget === 'destination' && (
                    <span className="text-[10px] text-rose-400 font-normal">Active Pin Target</span>
                  )}
                </div>

                <div
                  className={`flex items-center bg-[#0d0207] border rounded-2xl px-3 py-2.5 gap-2 transition-colors ${
                    pinTarget === 'destination'
                      ? 'border-rose-500/80 ring-1 ring-rose-500/40'
                      : 'border-rose-950/70 focus-within:border-rose-500 focus-within:ring-1 focus-within:ring-rose-500'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setPinTarget('destination');
                      setIsReportingHazard(false);
                    }}
                    className="text-pink-400 hover:text-pink-300 transition-colors"
                    title="Click here to pick destination by clicking on the map"
                  >
                    <Search className="w-4 h-4 shrink-0" />
                  </button>

                  <input
                    id="destination-input"
                    type="text"
                    value={destinationText}
                    onChange={(e) => handleLocationSearch('destination', e.target.value)}
                    onFocus={() => {
                      setActiveSearchField('destination');
                      if (searchResults.length > 0) setShowDropdown(true);
                    }}
                    placeholder="Search place, landmark or click map..."
                    className="w-full bg-transparent text-xs text-zinc-100 placeholder-zinc-600 outline-none"
                  />

                  {destinationText && (
                    <button
                      type="button"
                      onClick={() => {
                        setDestinationText('');
                        setDestCoords(null);
                        setRouteCoordinates([]);
                        setShowDropdown(false);
                      }}
                      className="text-zinc-500 hover:text-zinc-200"
                      title="Clear"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Dropdown Autocomplete Results */}
                {showDropdown && searchResults.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 bg-[#16040c] border border-rose-900/60 rounded-2xl shadow-2xl z-50 overflow-hidden max-h-48 overflow-y-auto">
                    {searchResults.map((item) => (
                      <button
                        key={item.place_id}
                        type="button"
                        onClick={() => handleSelectSearchResult(item)}
                        className="w-full text-left px-3.5 py-2.5 hover:bg-rose-950/60 border-b border-rose-950/40 text-xs text-zinc-200 flex items-start gap-2 transition-colors"
                      >
                        <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                        <span className="truncate">{item.display_name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Preset Badges */}
              <div className="space-y-1">
                <span className="text-[10px] text-zinc-500 block">Quick Landmarks:</span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { name: 'India Gate', coords: [28.6129, 77.2295] },
                    { name: 'Connaught Place', coords: [28.6315, 77.2167] },
                    { name: 'Hauz Khas', coords: [28.5494, 77.2001] },
                  ].map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => {
                        if (pinTarget === 'origin') {
                          setOriginText(preset.name);
                          setOriginCoords(preset.coords as [number, number]);
                          setUserLocation(preset.coords as [number, number]); // Auto-sets GPS
                        } else {
                          setDestinationText(preset.name);
                          setDestCoords(preset.coords as [number, number]);
                        }
                        setShowDropdown(false);
                      }}
                      className="text-[11px] bg-rose-950/40 hover:bg-rose-900/40 border border-rose-900/40 text-pink-300 rounded-xl px-2.5 py-1 transition-colors"
                    >
                      + {preset.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Calculate Safe Route Button */}
              <button
                type="button"
                onClick={handleCalculateRoute}
                disabled={isPlanning || !destCoords || !originCoords}
                className="w-full bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-semibold py-3.5 rounded-2xl transition-all shadow-lg shadow-rose-950/50 flex items-center justify-center gap-2 text-xs disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isPlanning ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Analyzing Pedestrian Corridors...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Calculate Safe Route</span>
                  </>
                )}
              </button>
            </div>

            {/* 2. Route Summary Card (Visible after calculation) */}
            {routeDistance !== null && (
              <div className="bg-[#16040c]/90 border border-rose-950/60 backdrop-blur-xl rounded-3xl p-5 shadow-2xl space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                <div className="flex items-center justify-between border-b border-rose-950/50 pb-3">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Route Generated
                  </span>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-rose-950/60 text-rose-300 border border-rose-900/40">
                    OSRM Pedestrian
                  </span>
                </div>

                {/* Metrics Matrix */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#0d0207] border border-rose-950/70 p-3 rounded-2xl">
                    <span className="text-[11px] text-zinc-400 block mb-0.5">Est. Distance</span>
                    <span className="text-lg font-black text-rose-400">
                      {(routeDistance / 1000).toFixed(2)}{' '}
                      <span className="text-xs font-medium text-zinc-400">km</span>
                    </span>
                  </div>

                  <div className="bg-[#0d0207] border border-rose-950/70 p-3 rounded-2xl">
                    <span className="text-[11px] text-zinc-400 flex items-center gap-1 mb-0.5">
                      <Clock className="w-3 h-3 text-pink-400" /> Walking Time
                    </span>
                    <span className="text-lg font-black text-white">
                      {routeDuration ? Math.max(1, Math.round(routeDuration / 60)) : 0}{' '}
                      <span className="text-xs font-medium text-zinc-400">mins</span>
                    </span>
                  </div>
                </div>

                {/* Route Safety Score Index */}
                {routeSafetyScore !== null && (
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-[#1c0612] border border-rose-950/70">
                    <span className="text-xs text-zinc-300 font-medium">Route Safety Index</span>
                    <span
                      className={`text-xs font-bold font-mono px-2.5 py-0.5 rounded-full border ${
                        routeSafetyScore >= 80
                          ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700/60'
                          : 'bg-rose-950/60 text-rose-300 border-rose-700/60 animate-pulse'
                      }`}
                    >
                      {routeSafetyScore}/100 {routeSafetyScore >= 80 ? '• Optimal Corridor' : '• Caution Advised'}
                    </span>
                  </div>
                )}

                {/* Recommended Detour Alert */}
                {detourMessage && (
                  <div className="p-3 rounded-2xl bg-rose-950/50 border border-rose-700/70 text-xs text-rose-200 flex items-start gap-2.5 shadow-md animate-pulse">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <span className="leading-snug font-medium">{detourMessage}</span>
                  </div>
                )}

                {/* Hazard Corridor Assessment */}
                {hazardCorridorWarning && !detourMessage && (
                  <div
                    className={`p-3 rounded-2xl border text-xs flex items-start gap-2.5 ${
                      hazardCorridorWarning.level === 'HIGH'
                        ? 'bg-rose-950/40 border-rose-800/60 text-rose-200'
                        : hazardCorridorWarning.level === 'MEDIUM'
                        ? 'bg-amber-950/40 border-amber-800/60 text-amber-200'
                        : 'bg-emerald-950/40 border-emerald-800/60 text-emerald-200'
                    }`}
                  >
                    {hazardCorridorWarning.level === 'SAFE' ? (
                      <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    )}
                    <span className="leading-snug font-medium">
                      {hazardCorridorWarning.message}
                    </span>
                  </div>
                )}

                {/* Start Monitored Journey CTA */}
                <button
                  type="button"
                  onClick={handleStartJourney}
                  disabled={isStartingJourney}
                  className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 text-xs transition-all"
                >
                  {isStartingJourney ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Engaging Live Sentinel...</span>
                    </>
                  ) : (
                    <>
                      <span>Start Monitored Journey</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            )}

            {/* 3. Add Hazard Reporting Panel (When toggle is active) */}
            {isReportingHazard && (
              <form
                onSubmit={handleSubmitHazard}
                className="bg-[#16040c]/95 border border-amber-900/60 backdrop-blur-xl rounded-3xl p-5 shadow-2xl space-y-3.5 animate-in fade-in"
              >
                <div className="flex items-center justify-between border-b border-rose-950/50 pb-2">
                  <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    <Flame className="w-4 h-4 text-amber-400" />
                    Submit Hazard Warning
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsReportingHazard(false)}
                    className="text-zinc-500 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-[11px] text-zinc-400">
                  {hazardPin
                    ? `Location locked: [${hazardPin.lat.toFixed(4)}, ${hazardPin.lng.toFixed(4)}]`
                    : 'Click anywhere on the map to pinpoint the hazardous area.'}
                </p>

                <div className="space-y-1">
                  <input
                    type="text"
                    required
                    placeholder="Hazard Title (e.g. Broken Streetlights)"
                    value={hazardTitle}
                    onChange={(e) => setHazardTitle(e.target.value)}
                    className="w-full bg-[#0d0207] border border-rose-950/70 rounded-xl px-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 outline-none focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1">
                  <textarea
                    rows={2}
                    placeholder="Additional context or safety notes..."
                    value={hazardDesc}
                    onChange={(e) => setHazardDesc(e.target.value)}
                    className="w-full bg-[#0d0207] border border-rose-950/70 rounded-xl px-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 outline-none focus:border-amber-500 resize-none"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setHazardRisk('HIGH')}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                      hazardRisk === 'HIGH'
                        ? 'bg-rose-600 text-white border-rose-400'
                        : 'bg-rose-950/40 text-zinc-400 border-rose-900/40'
                    }`}
                  >
                    High Risk
                  </button>
                  <button
                    type="button"
                    onClick={() => setHazardRisk('MEDIUM')}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                      hazardRisk === 'MEDIUM'
                        ? 'bg-amber-600 text-white border-amber-400'
                        : 'bg-amber-950/40 text-zinc-400 border-amber-900/40'
                    }`}
                  >
                    Caution
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={!hazardPin || isSubmittingHazard}
                  className="w-full bg-gradient-to-r from-amber-600 to-rose-600 text-white font-semibold py-2.5 rounded-xl text-xs shadow-md disabled:opacity-40"
                >
                  {isSubmittingHazard ? 'Submitting...' : 'Confirm & Save Hazard'}
                </button>
              </form>
            )}
          </div>

          {/* Right Area: Interactive SafetyMap */}
          <div className="lg:col-span-8 h-[450px] lg:h-full relative rounded-3xl overflow-hidden shadow-2xl">
            <SafetyMap
              userLocation={userLocation}
              routeCoordinates={routeCoordinates}
              hazards={hazards}
              safetyScore={routeSafetyScore}
              hazardsAlongRoute={hazardsAlongRoute}
              detourMessage={detourMessage}
              onSelectLocation={(lat, lng) => {
                if (isReportingHazard) {
                  setHazardPin({ lat, lng });
                  return;
                }

                if (pinTarget === 'origin') {
                  // Choose starting point and auto-set GPS without locking it
                  setOriginCoords([lat, lng]);
                  setUserLocation([lat, lng]);
                  setOriginText(`Start Point (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
                  // Smoothly switch to destination for the next click
                  setPinTarget('destination');
                } else {
                  // Set destination
                  setDestCoords([lat, lng]);
                  setDestinationText(`Destination (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
                }
              }}
              className="h-full"
            />

            {/* In-Map Interactive Target Indicator */}
            <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
              <div className="bg-[#16040c]/90 backdrop-blur-md border border-rose-900/50 px-3.5 py-1.5 rounded-full text-xs font-medium text-pink-200 shadow-xl flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    isReportingHazard
                      ? 'bg-amber-400 animate-ping'
                      : pinTarget === 'origin'
                      ? 'bg-emerald-400 animate-pulse'
                      : 'bg-rose-500'
                  }`}
                />
                <span>
                  {isReportingHazard
                    ? 'Click map to mark hazard point'
                    : pinTarget === 'origin'
                    ? 'Map Click: Sets Starting Point & Auto-sets GPS'
                    : 'Map Click: Sets Destination'}
                </span>
              </div>
            </div>

            {/* In-Map Floating Legend / Status Chip */}
            <div className="absolute top-4 right-4 z-10 bg-[#16040c]/80 backdrop-blur-md border border-rose-900/40 px-3.5 py-1.5 rounded-full text-[11px] font-medium text-pink-300 shadow-lg flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Live Dark Map Active</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

interface PlanRouteBody {
  originLat?: number | string;
  originLng?: number | string;
  destLat?: number | string;
  destLng?: number | string;
}

// Haversine geodesic distance in meters
function haversineDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export async function POST(request: NextRequest) {
  try {
    const body: PlanRouteBody = await request.json().catch(() => ({}));
    const { originLat, originLng, destLat, destLng } = body;

    const oLat = Number(originLat);
    const oLng = Number(originLng);
    const dLat = Number(destLat);
    const dLng = Number(destLng);

    if (isNaN(oLat) || isNaN(oLng) || isNaN(dLat) || isNaN(dLng)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing or invalid coordinates. originLat, originLng, destLat, and destLng must be numbers.',
        },
        { status: 400 }
      );
    }

    // 1. Fetch base walking route coordinates from OSRM (format: {lng},{lat})
    const osrmUrl = `https://router.project-osrm.org/route/v1/walking/${oLng},${oLat};${dLng},${dLat}?overview=full&geometries=geojson`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    let primaryRoute: { coordinates: [number, number][]; distance: number; duration: number } | null = null;

    try {
      const osrmRes = await fetch(osrmUrl, {
        headers: {
          'User-Agent': 'Abhaya-Safety-Platform/1.0',
          Accept: 'application/json',
        },
        signal: controller.signal,
      });

      if (osrmRes.ok) {
        const data = await osrmRes.json();
        if (data.routes && data.routes.length > 0) {
          primaryRoute = {
            coordinates: data.routes[0].geometry.coordinates,
            distance: data.routes[0].distance,
            duration: data.routes[0].duration,
          };
        }
      }
    } catch (fetchErr) {
      console.warn('OSRM route fetch failed or timed out, generating interpolated direct corridor:', fetchErr);
    } finally {
      clearTimeout(timeout);
    }

    // Fallback if OSRM service is unreachable
    if (!primaryRoute) {
      const directDist = haversineDistanceMeters(oLat, oLng, dLat, dLng);
      const intermediateSteps = 10;
      const coords: [number, number][] = [];
      for (let i = 0; i <= intermediateSteps; i++) {
        const fraction = i / intermediateSteps;
        const lat = oLat + (dLat - oLat) * fraction;
        const lng = oLng + (dLng - oLng) * fraction;
        coords.push([lng, lat]);
      }
      primaryRoute = {
        coordinates: coords,
        distance: Math.round(directDist),
        duration: Math.round(directDist / 1.4), // ~1.4 m/s walking speed
      };
    }

    const routeCoordinates = primaryRoute.coordinates;

    // 2. Query all active hazards from hazard_zones
    let activeHazards: Array<{
      id: string;
      title: string;
      description?: string | null;
      lat: number | string;
      lng: number | string;
      risk_level: string;
    }> = [];

    try {
      activeHazards = (await sql`
        SELECT id, title, description, lat, lng, risk_level
        FROM hazard_zones
      `) as any;
    } catch (dbErr) {
      console.warn('Failed to query hazard_zones for safe route analysis:', dbErr);
    }

    // 3. Safe Routing Engine Logic:
    // - Check distance between each route coordinate and every high/medium hazard point.
    // - Calculate a "Route Safety Score" (100 minus penalty points for each hazard within 80 meters).
    // - If route passes within 60 meters of a 'HIGH' risk hazard, flag hasHazardConflict: true and return safe detour message.
    let totalPenalty = 0;
    let hasHazardConflict = false;
    let conflictHazard: { title: string; distance: number } | null = null;
    const hazardsAlongRoute: Array<{
      id: string;
      title: string;
      description?: string | null;
      lat: number;
      lng: number;
      risk_level: string;
      distanceToRoute: number;
    }> = [];

    for (const hazard of activeHazards) {
      const hLat = Number(hazard.lat);
      const hLng = Number(hazard.lng);
      if (isNaN(hLat) || isNaN(hLng)) continue;

      const riskUpper = (hazard.risk_level || 'MEDIUM').toUpperCase();

      // Find minimum distance between any point along the route and this hazard
      let minDistanceToRoute = Infinity;
      for (const pt of routeCoordinates) {
        // OSRM coordinates are [lng, lat]
        const ptLng = pt[0];
        const ptLat = pt[1];
        const d = haversineDistanceMeters(ptLat, ptLng, hLat, hLng);
        if (d < minDistanceToRoute) {
          minDistanceToRoute = d;
        }
      }

      // Check proximity within 80 meters for safety scoring
      if (minDistanceToRoute <= 80) {
        hazardsAlongRoute.push({
          id: hazard.id,
          title: hazard.title,
          description: hazard.description,
          lat: hLat,
          lng: hLng,
          risk_level: riskUpper,
          distanceToRoute: Math.round(minDistanceToRoute),
        });

        // Penalize score: -25 for HIGH, -15 for MEDIUM, -5 for LOW
        if (riskUpper === 'HIGH') {
          totalPenalty += 25;
        } else if (riskUpper === 'MEDIUM') {
          totalPenalty += 15;
        } else {
          totalPenalty += 5;
        }
      }

      // Proximity within 60 meters of a 'HIGH' risk hazard -> hasHazardConflict: true
      if (riskUpper === 'HIGH' && minDistanceToRoute <= 60) {
        hasHazardConflict = true;
        if (!conflictHazard || minDistanceToRoute < conflictHazard.distance) {
          conflictHazard = {
            title: hazard.title,
            distance: Math.round(minDistanceToRoute),
          };
        }
      }
    }

    // Calculate final Route Safety Score clamped between 0 and 100
    const safetyScore = Math.max(0, Math.min(100, Math.round(100 - totalPenalty)));

    // Sort hazards along route by distance ascending
    hazardsAlongRoute.sort((a, b) => a.distanceToRoute - b.distanceToRoute);

    const detourMessage = hasHazardConflict && conflictHazard
      ? `Route passes within ${conflictHazard.distance}m of high-risk hazard "${conflictHazard.title}". Safe detour via lit main perimeter recommended.`
      : null;

    return NextResponse.json({
      success: true,
      coordinates: routeCoordinates,
      distance: primaryRoute.distance,
      duration: primaryRoute.duration,
      safetyScore,
      hasHazardConflict,
      detourMessage,
      hazardsAlongRoute,
    });
  } catch (error: any) {
    console.error('Route planning error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.name === 'AbortError'
          ? 'Route calculation timed out. Please try again.'
          : 'Failed to calculate pedestrian route.',
      },
      { status: 500 }
    );
  }
}


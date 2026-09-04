import { NextRequest, NextResponse } from 'next/server';

interface PlanRouteBody {
  originLat?: number | string;
  originLng?: number | string;
  destLat?: number | string;
  destLng?: number | string;
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

    // Call public OSRM walking route endpoint (coordinates format: {lng},{lat})
    const osrmUrl = `https://router.project-osrm.org/route/v1/walking/${oLng},${oLat};${dLng},${dLat}?overview=full&geometries=geojson`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const osrmRes = await fetch(osrmUrl, {
      headers: {
        'User-Agent': 'Abhaya-Safety-Platform/1.0',
        Accept: 'application/json',
      },
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    if (!osrmRes.ok) {
      throw new Error(`OSRM service responded with HTTP ${osrmRes.status}`);
    }

    const data = await osrmRes.json();

    if (!data.routes || data.routes.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No navigable pedestrian route found between locations.' },
        { status: 404 }
      );
    }

    const primaryRoute = data.routes[0];

    return NextResponse.json({
      success: true,
      coordinates: primaryRoute.geometry.coordinates,
      distance: primaryRoute.distance,
      duration: primaryRoute.duration,
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
      { status: 502 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

interface StartJourneyBody {
  userId?: string;
  originName?: string;
  destinationName?: string;
  startLat?: number | string;
  startLng?: number | string;
  destLat?: number | string;
  destLng?: number | string;
  batteryStart?: number | string;
}

export async function POST(request: NextRequest) {
  try {
    const body: StartJourneyBody = await request.json().catch(() => ({}));
    const {
      userId,
      originName,
      destinationName,
      startLat,
      startLng,
      destLat,
      destLng,
      batteryStart,
    } = body;

    if (!destinationName || typeof destinationName !== 'string' || !destinationName.trim()) {
      return NextResponse.json(
        { success: false, error: 'destinationName is required.' },
        { status: 400 }
      );
    }

    const sLat = Number(startLat);
    const sLng = Number(startLng);
    const dLat = Number(destLat);
    const dLng = Number(destLng);

    if (isNaN(sLat) || isNaN(sLng) || isNaN(dLat) || isNaN(dLng)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Valid numeric start coordinates (startLat, startLng) and destination coordinates (destLat, destLng) are required.',
        },
        { status: 400 }
      );
    }

    // Validate UUID format if userId is provided
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    let validUserId: string | null = null;
    if (userId) {
      if (!uuidRegex.test(userId.trim())) {
        return NextResponse.json(
          { success: false, error: 'Invalid userId UUID format.' },
          { status: 400 }
        );
      }
      validUserId = userId.trim();
    }

    const battery = batteryStart !== undefined && batteryStart !== null && !isNaN(Number(batteryStart))
      ? Math.round(Number(batteryStart))
      : null;

    const trimmedOrigin = originName ? originName.trim().slice(0, 150) : null;
    const trimmedDestination = destinationName.trim().slice(0, 150);

    const rows = await sql`
      INSERT INTO journeys (
        user_id,
        origin_name,
        destination_name,
        start_lat,
        start_lng,
        dest_lat,
        dest_lng,
        status,
        battery_start,
        battery_current,
        started_at
      ) VALUES (
        ${validUserId},
        ${trimmedOrigin},
        ${trimmedDestination},
        ${sLat},
        ${sLng},
        ${dLat},
        ${dLng},
        'ACTIVE',
        ${battery},
        ${battery},
        NOW()
      )
      RETURNING id, user_id, origin_name, destination_name, status, started_at;
    `;

    const insertedJourney = rows[0];

    return NextResponse.json(
      {
        success: true,
        journeyId: insertedJourney.id,
        journey: insertedJourney,
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error?.code === '23503') {
      return NextResponse.json(
        { success: false, error: 'User does not exist.' },
        { status: 404 }
      );
    }

    console.error('Error starting journey:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to start journey.' },
      { status: 500 }
    );
  }
}

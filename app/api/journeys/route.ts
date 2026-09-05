import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// GET /api/journeys?id=<journeyId>&userId=<userId>
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const userId = searchParams.get('userId');

    if (id) {
      if (!UUID_REGEX.test(id)) {
        return NextResponse.json(
          { success: false, error: 'Invalid journey ID format.' },
          { status: 400 }
        );
      }

      const rows = await sql`
        SELECT 
          id,
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
          started_at,
          ended_at
        FROM journeys
        WHERE id = ${id}
        LIMIT 1;
      `;

      if (rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Journey not found.' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        journey: rows[0],
      });
    }

    if (userId) {
      if (!UUID_REGEX.test(userId)) {
        return NextResponse.json(
          { success: false, error: 'Invalid user ID format.' },
          { status: 400 }
        );
      }

      const rows = await sql`
        SELECT 
          id,
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
          started_at,
          ended_at
        FROM journeys
        WHERE user_id = ${userId}
        ORDER BY started_at DESC
        LIMIT 20;
      `;

      return NextResponse.json({
        success: true,
        journeys: rows,
      });
    }

    return NextResponse.json(
      { success: false, error: 'Query parameter id or userId is required.' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Error fetching journey:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve journey data.' },
      { status: 500 }
    );
  }
}

// PATCH /api/journeys
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const journeyId = body.journeyId || body.id;
    const status = body.status || 'COMPLETED';

    if (!journeyId || !UUID_REGEX.test(journeyId)) {
      return NextResponse.json(
        { success: false, error: 'Valid journeyId UUID is required.' },
        { status: 400 }
      );
    }

    const rows = await sql`
      UPDATE journeys
      SET 
        status = ${status},
        ended_at = NOW()
      WHERE id = ${journeyId}
      RETURNING 
        id,
        user_id,
        origin_name,
        destination_name,
        start_lat,
        start_lng,
        dest_lat,
        dest_lng,
        status,
        started_at,
        ended_at;
    `;

    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Journey not found.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Journey completed successfully.',
      journey: rows[0],
    });
  } catch (error: any) {
    console.error('Error completing journey:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update journey status.' },
      { status: 500 }
    );
  }
}

// POST /api/journeys
export async function POST(request: NextRequest) {
  return PATCH(request);
}

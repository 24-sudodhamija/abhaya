import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

interface CreateHazardBody {
  title?: string;
  description?: string;
  lat?: number | string;
  lng?: number | string;
  risk_level?: string;
  reportedBy?: string;
}

// GET: Retrieve all hazard zones
export async function GET() {
  try {
    const hazards = await sql`
      SELECT 
        id,
        title,
        description,
        lat,
        lng,
        risk_level,
        reported_by,
        created_at
      FROM hazard_zones
      ORDER BY created_at DESC;
    `;

    return NextResponse.json({
      success: true,
      hazards,
    });
  } catch (error: any) {
    console.error('Error fetching hazard zones:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve hazard zones.' },
      { status: 500 }
    );
  }
}

// POST: Insert a new hazard zone
export async function POST(request: NextRequest) {
  try {
    const body: CreateHazardBody = await request.json().catch(() => ({}));
    const { title, description, lat, lng, risk_level, reportedBy } = body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json(
        { success: false, error: 'Hazard title is required.' },
        { status: 400 }
      );
    }

    const latitude = Number(lat);
    const longitude = Number(lng);

    if (isNaN(latitude) || isNaN(longitude)) {
      return NextResponse.json(
        { success: false, error: 'Valid numerical coordinates (lat, lng) are required.' },
        { status: 400 }
      );
    }

    const riskLevel = risk_level?.toUpperCase() === 'HIGH' || risk_level?.toUpperCase() === 'LOW'
      ? risk_level.toUpperCase()
      : 'MEDIUM';

    // Validate reportedBy UUID format if provided
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const validReportedBy = reportedBy && uuidRegex.test(reportedBy) ? reportedBy : null;

    const rows = await sql`
      INSERT INTO hazard_zones (
        title,
        description,
        lat,
        lng,
        risk_level,
        reported_by
      ) VALUES (
        ${title.trim()},
        ${description?.trim() || null},
        ${latitude},
        ${longitude},
        ${riskLevel},
        ${validReportedBy}
      )
      RETURNING id, title, description, lat, lng, risk_level, reported_by, created_at;
    `;

    const createdHazard = rows[0];

    return NextResponse.json(
      {
        success: true,
        hazard: createdHazard,
        id: createdHazard.id,
        title: createdHazard.title,
        description: createdHazard.description,
        lat: createdHazard.lat,
        lng: createdHazard.lng,
        risk_level: createdHazard.risk_level,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating hazard zone:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to report hazard zone.' },
      { status: 500 }
    );
  }
}

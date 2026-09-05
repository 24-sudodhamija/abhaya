import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Haversine distance in kilometers
function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
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

// GET: Retrieve community reports with optional geospatial & category filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const latParam = searchParams.get('lat');
    const lngParam = searchParams.get('lng');
    const radiusParam = searchParams.get('radiusKm') || searchParams.get('radius_km');
    const categoryParam = searchParams.get('category');

    const filterLat = latParam !== null ? parseFloat(latParam) : null;
    const filterLng = lngParam !== null ? parseFloat(lngParam) : null;
    const radiusKm = radiusParam !== null ? parseFloat(radiusParam) : null;

    let query;
    if (categoryParam && categoryParam.trim()) {
      query = sql`
        SELECT 
          h.id,
          h.reported_by,
          h.title,
          h.description,
          h.category,
          h.lat,
          h.lng,
          h.risk_level,
          h.image_url,
          h.verification_count,
          h.created_at,
          u.full_name,
          u.masked_id,
          u.is_verified
        FROM hazard_zones h
        LEFT JOIN users u ON h.reported_by = u.id
        WHERE LOWER(h.category) = LOWER(${categoryParam.trim()})
        ORDER BY h.created_at DESC;
      `;
    } else {
      query = sql`
        SELECT 
          h.id,
          h.reported_by,
          h.title,
          h.description,
          h.category,
          h.lat,
          h.lng,
          h.risk_level,
          h.image_url,
          h.verification_count,
          h.created_at,
          u.full_name,
          u.masked_id,
          u.is_verified
        FROM hazard_zones h
        LEFT JOIN users u ON h.reported_by = u.id
        ORDER BY h.created_at DESC;
      `;
    }

    const rows = await query;

    let reports = rows.map((row: any) => {
      let distanceKm: number | null = null;
      if (
        filterLat !== null &&
        filterLng !== null &&
        !isNaN(filterLat) &&
        !isNaN(filterLng) &&
        row.lat !== null &&
        row.lng !== null
      ) {
        distanceKm = parseFloat(
          calculateHaversineDistanceKm(filterLat, filterLng, row.lat, row.lng).toFixed(2)
        );
      }

      return {
        id: row.id,
        title: row.title,
        description: row.description,
        category: row.category || 'GENERAL_HAZARD',
        lat: row.lat,
        lng: row.lng,
        risk_level: row.risk_level,
        riskLevel: row.risk_level,
        imageUrl: row.image_url,
        image_url: row.image_url,
        verificationCount: row.verification_count ?? 0,
        createdAt: row.created_at,
        distanceKm,
        reporter: {
          id: row.reported_by,
          fullName: row.full_name || 'Anonymous Resident',
          maskedId: row.masked_id || 'ID-VERIFIED',
          isVerified: Boolean(row.is_verified),
        },
      };
    });

    // Apply radius filter if center coordinates and radiusKm are provided
    if (
      filterLat !== null &&
      filterLng !== null &&
      !isNaN(filterLat) &&
      !isNaN(filterLng) &&
      radiusKm !== null &&
      !isNaN(radiusKm) &&
      radiusKm > 0
    ) {
      reports = reports.filter(
        (r) => r.distanceKm !== null && r.distanceKm <= radiusKm
      );
      // Sort by proximity when location filter is applied
      reports.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
    }

    return NextResponse.json({
      success: true,
      count: reports.length,
      reports,
    });
  } catch (error: any) {
    console.error('Error fetching community reports:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve community reports.' },
      { status: 500 }
    );
  }
}

// POST: Submit a new community report with photo upload & strict resident verification check
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const userId = body.userId || body.user_id;
    const title = body.title;
    const description = body.description;
    const category = body.category || 'GENERAL_HAZARD';
    const riskLevel = body.riskLevel || body.risk_level || 'MEDIUM';
    const lat = Number(body.lat);
    const lng = Number(body.lng);
    const imageBase64 = body.imageBase64 || body.image_base64 || body.imageUrl || body.image_url || null;

    // 1. Strict Verification Check (Disallow Anonymous Submissions):
    // Validate that userId is present, valid UUID, and belongs to a verified user.
    // Reject with 401 Unauthorized if missing, invalid, or unverified.
    if (!userId || !UUID_REGEX.test(userId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Anonymous reporting is disabled. All hazard and incident logs must be tied to a verified account.',
        },
        { status: 401 }
      );
    }

    const userRows = await sql`
      SELECT id, full_name, is_verified, masked_id
      FROM users
      WHERE id = ${userId};
    `;

    if (!userRows || userRows.length === 0 || userRows[0].is_verified !== true) {
      return NextResponse.json(
        {
          success: false,
          error: 'Anonymous reporting is disabled. All hazard and incident logs must be tied to a verified account.',
        },
        { status: 401 }
      );
    }

    const verifiedUser = userRows[0];

    // 2. Validate report payload
    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json(
        { success: false, error: 'Report title is required.' },
        { status: 400 }
      );
    }

    if (isNaN(lat) || isNaN(lng)) {
      return NextResponse.json(
        { success: false, error: 'Valid numerical coordinates (lat, lng) are required.' },
        { status: 400 }
      );
    }

    const normalizedRisk =
      typeof riskLevel === 'string' &&
      ['LOW', 'MEDIUM', 'HIGH'].includes(riskLevel.toUpperCase())
        ? riskLevel.toUpperCase()
        : 'MEDIUM';

    // 3. Insert report into hazard_zones
    const insertedRows = await sql`
      INSERT INTO hazard_zones (
        reported_by,
        title,
        description,
        category,
        lat,
        lng,
        risk_level,
        image_url,
        verification_count,
        created_at
      ) VALUES (
        ${userId},
        ${title.trim()},
        ${description?.trim() || null},
        ${category.trim()},
        ${lat},
        ${lng},
        ${normalizedRisk},
        ${imageBase64},
        1,
        NOW()
      )
      RETURNING 
        id,
        reported_by,
        title,
        description,
        category,
        lat,
        lng,
        risk_level,
        image_url,
        verification_count,
        created_at;
    `;

    const insertedReport = insertedRows[0];

    return NextResponse.json(
      {
        success: true,
        report: {
          ...insertedReport,
          reporter: {
            id: verifiedUser.id,
            fullName: verifiedUser.full_name,
            maskedId: verifiedUser.masked_id,
            isVerified: true,
          },
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error submitting community safety report:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to submit community report.' },
      { status: 500 }
    );
  }
}

// PATCH: Confirm / Endorse a community safety report (+1 verification_count)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const reportId = body.reportId || body.id;

    if (!reportId || !UUID_REGEX.test(reportId)) {
      return NextResponse.json(
        { success: false, error: 'Valid reportId UUID is required.' },
        { status: 400 }
      );
    }

    const updatedRows = await sql`
      UPDATE hazard_zones
      SET verification_count = COALESCE(verification_count, 0) + 1
      WHERE id = ${reportId}
      RETURNING id, verification_count;
    `;

    if (updatedRows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Report not found.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      reportId: updatedRows[0].id,
      verificationCount: updatedRows[0].verification_count,
    });
  } catch (error: any) {
    console.error('Error endorsing report:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to endorse community report.' },
      { status: 500 }
    );
  }
}


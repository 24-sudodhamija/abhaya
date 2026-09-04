import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

/**
 * Strict identification masking utility.
 * Guarantees that unmasked citizen ID digits are never exposed under any circumstances.
 * Format returned: XXXX-XXXX-1234 (or null if not provided)
 */
function ensureStrictlyMaskedId(rawId: string | null | undefined): string | null {
  if (!rawId) return null;
  const trimmed = String(rawId).trim();
  if (!trimmed) return null;

  // Extract all digit characters
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length >= 4) {
    const last4 = digits.slice(-4);
    return `XXXX-XXXX-${last4}`;
  }

  // If already formatted like XXXX-XXXX-1234
  const maskedMatch = trimmed.match(/[X*x]{4}-[X*x]{4}-(\d{4})/i);
  if (maskedMatch) {
    return `XXXX-XXXX-${maskedMatch[1]}`;
  }

  // Fallback safe mask if fewer than 4 digits
  return 'XXXX-XXXX-****';
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId || !userId.trim()) {
      return NextResponse.json(
        { success: false, error: 'userId parameter is required.' },
        { status: 400 }
      );
    }

    const trimmedUserId = userId.trim();

    if (!UUID_REGEX.test(trimmedUserId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid userId UUID format.' },
        { status: 400 }
      );
    }

    // Execute user query and aggregate counts in parallel
    const [userRows, friendsRows, journeysRows, reportsRows] = await Promise.all([
      sql`
        SELECT 
          id,
          full_name,
          phone,
          masked_id,
          is_verified,
          verified_at,
          dob,
          gender,
          state_region,
          trust_score,
          is_volunteer
        FROM users
        WHERE id = ${trimmedUserId}
        LIMIT 1;
      `,
      sql`
        SELECT COUNT(*)::int AS count
        FROM friendships
        WHERE (user_id = ${trimmedUserId} OR friend_id = ${trimmedUserId})
          AND status = 'ACCEPTED';
      `,
      sql`
        SELECT COUNT(*)::int AS count
        FROM journeys
        WHERE user_id = ${trimmedUserId};
      `,
      sql`
        SELECT COUNT(*)::int AS count
        FROM hazard_zones
        WHERE reported_by = ${trimmedUserId};
      `,
    ]);

    if (!userRows || userRows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'User profile not found.' },
        { status: 404 }
      );
    }

    const user = userRows[0];
    const friendsCount = Number(friendsRows[0]?.count || 0);
    const journeysCount = Number(journeysRows[0]?.count || 0);
    const reportsCount = Number(reportsRows[0]?.count || 0);

    const strictlyMaskedId = ensureStrictlyMaskedId(user.masked_id);

    const profile = {
      id: user.id,
      fullName: user.full_name,
      full_name: user.full_name,
      phone: user.phone,
      maskedId: strictlyMaskedId,
      masked_id: strictlyMaskedId,
      isVerified: Boolean(user.is_verified),
      is_verified: Boolean(user.is_verified),
      verifiedAt: user.verified_at,
      verified_at: user.verified_at,
      dob: user.dob || null,
      gender: user.gender || null,
      stateRegion: user.state_region || null,
      state_region: user.state_region || null,
      trustScore: user.trust_score ?? 100,
      trust_score: user.trust_score ?? 100,
      isVolunteer: Boolean(user.is_volunteer),
      is_volunteer: Boolean(user.is_volunteer),
      friendsCount,
      journeysCount,
      reportsCount,
    };

    return NextResponse.json(
      {
        success: true,
        profile,
      },
      { status: 200 }
    );
  } catch (error: any) {
    if (error?.code === '22P02') {
      return NextResponse.json(
        { success: false, error: 'Invalid userId UUID format.' },
        { status: 400 }
      );
    }

    console.error('Error fetching user profile metadata:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'An internal server error occurred while retrieving user profile metadata.',
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { userId, isVolunteer } = body;

    if (!userId || typeof userId !== 'string' || !userId.trim()) {
      return NextResponse.json(
        { success: false, error: 'userId is required.' },
        { status: 400 }
      );
    }

    const trimmedUserId = userId.trim();

    if (!UUID_REGEX.test(trimmedUserId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid userId UUID format.' },
        { status: 400 }
      );
    }

    const updated = await sql`
      UPDATE users
      SET is_volunteer = ${Boolean(isVolunteer)}
      WHERE id = ${trimmedUserId}
      RETURNING id, full_name, is_volunteer;
    `;

    if (updated.length === 0) {
      return NextResponse.json(
        { success: false, error: 'User not found.' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        isVolunteer: Boolean(updated[0].is_volunteer),
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error updating volunteer status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update volunteer status.' },
      { status: 500 }
    );
  }
}


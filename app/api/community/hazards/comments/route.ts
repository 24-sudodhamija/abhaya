import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// GET: Retrieve all comments for a hazard zone joined with verified user details
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const hazardId = searchParams.get('hazardId') || searchParams.get('hazard_id');

    if (!hazardId || !UUID_REGEX.test(hazardId)) {
      return NextResponse.json(
        { success: false, error: 'A valid hazardId UUID parameter is required.' },
        { status: 400 }
      );
    }

    const comments = await sql`
      SELECT 
        c.id,
        c.hazard_id,
        c.user_id,
        c.message,
        c.created_at,
        u.full_name,
        u.masked_id,
        u.is_verified,
        u.is_volunteer
      FROM hazard_comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.hazard_id = ${hazardId}
      ORDER BY c.created_at ASC;
    `;

    return NextResponse.json({
      success: true,
      count: comments.length,
      comments: comments.map((row: any) => ({
        id: row.id,
        hazardId: row.hazard_id,
        userId: row.user_id,
        message: row.message,
        createdAt: row.created_at,
        user: {
          id: row.user_id,
          fullName: row.full_name,
          maskedId: row.masked_id || 'ID-VERIFIED',
          isVerified: Boolean(row.is_verified),
          isVolunteer: Boolean(row.is_volunteer),
        },
      })),
    });
  } catch (error: any) {
    console.error('Error fetching hazard comments:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve hazard comments.' },
      { status: 500 }
    );
  }
}

// POST: Add a new community comment on a hazard zone with strict resident verification
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const hazardId = body.hazardId || body.hazard_id;
    const userId = body.userId || body.user_id;
    const message = body.message;

    if (!hazardId || !UUID_REGEX.test(hazardId)) {
      return NextResponse.json(
        { success: false, error: 'A valid hazardId UUID is required.' },
        { status: 400 }
      );
    }

    if (!userId || !UUID_REGEX.test(userId)) {
      return NextResponse.json(
        { success: false, error: 'A valid userId UUID is required.' },
        { status: 400 }
      );
    }

    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json(
        { success: false, error: 'Comment message cannot be empty.' },
        { status: 400 }
      );
    }

    // 1. Enforce resident verification: check that is_verified = TRUE
    const userRows = await sql`
      SELECT id, full_name, masked_id, is_verified, is_volunteer
      FROM users
      WHERE id = ${userId};
    `;

    if (!userRows || userRows.length === 0 || userRows[0].is_verified !== true) {
      return NextResponse.json(
        {
          success: false,
          error: 'Only verified residents can post comments on hazards.',
        },
        { status: 403 }
      );
    }

    const verifiedUser = userRows[0];

    // 2. Insert comment into hazard_comments
    const insertedRows = await sql`
      INSERT INTO hazard_comments (
        hazard_id,
        user_id,
        message,
        created_at
      ) VALUES (
        ${hazardId},
        ${userId},
        ${message.trim()},
        NOW()
      )
      RETURNING id, hazard_id, user_id, message, created_at;
    `;

    const inserted = insertedRows[0];

    return NextResponse.json(
      {
        success: true,
        comment: {
          id: inserted.id,
          hazardId: inserted.hazard_id,
          userId: inserted.user_id,
          message: inserted.message,
          createdAt: inserted.created_at,
          user: {
            id: verifiedUser.id,
            fullName: verifiedUser.full_name,
            maskedId: verifiedUser.masked_id || 'ID-VERIFIED',
            isVerified: true,
            isVolunteer: Boolean(verifiedUser.is_volunteer),
          },
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error posting hazard comment:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to post comment.' },
      { status: 500 }
    );
  }
}

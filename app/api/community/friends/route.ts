import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// GET: Retrieve all accepted friends and discoverable verified users
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || searchParams.get('user_id');

    if (!userId || !UUID_REGEX.test(userId)) {
      return NextResponse.json(
        { success: false, error: 'A valid userId UUID parameter is required.' },
        { status: 400 }
      );
    }

    // 1. Fetch all accepted friends
    const friendsRows = await sql`
      SELECT DISTINCT 
        u.id, 
        u.full_name, 
        u.masked_id, 
        u.is_volunteer, 
        u.is_verified,
        f.id AS friendship_id,
        f.status AS friendship_status,
        f.created_at AS friendship_date
      FROM users u
      JOIN friendships f 
        ON ((f.user_id = ${userId} AND f.friend_id = u.id) OR (f.friend_id = ${userId} AND f.user_id = u.id))
      WHERE f.status = 'ACCEPTED' AND u.id != ${userId}
      ORDER BY f.created_at DESC;
    `;

    // 2. Fetch discoverable verified residents who are not yet friends
    const discoverableRows = await sql`
      SELECT 
        u.id, 
        u.full_name, 
        u.masked_id, 
        u.is_volunteer, 
        u.is_verified
      FROM users u
      WHERE u.is_verified = TRUE 
        AND u.id != ${userId}
        AND u.id NOT IN (
          SELECT friend_id FROM friendships WHERE user_id = ${userId}
          UNION
          SELECT user_id FROM friendships WHERE friend_id = ${userId}
        )
      ORDER BY u.full_name ASC
      LIMIT 25;
    `;

    const friends = friendsRows.map((row: any) => ({
      id: row.id,
      fullName: row.full_name,
      maskedId: row.masked_id || 'ID-VERIFIED',
      isVolunteer: Boolean(row.is_volunteer),
      isVerified: Boolean(row.is_verified),
      friendshipId: row.friendship_id,
      friendshipStatus: row.friendship_status,
      friendshipDate: row.friendship_date,
    }));

    const discoverableUsers = discoverableRows.map((row: any) => ({
      id: row.id,
      fullName: row.full_name,
      maskedId: row.masked_id || 'ID-VERIFIED',
      isVolunteer: Boolean(row.is_volunteer),
      isVerified: Boolean(row.is_verified),
    }));

    return NextResponse.json({
      success: true,
      friends,
      discoverableUsers,
    });
  } catch (error: any) {
    console.error('Error fetching friends & discoverable users:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve friends.' },
      { status: 500 }
    );
  }
}

// POST: Add a new friend connection (status: 'ACCEPTED')
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const userId = body.userId || body.user_id;
    const friendId = body.friendId || body.friend_id;

    if (!userId || !UUID_REGEX.test(userId)) {
      return NextResponse.json(
        { success: false, error: 'A valid userId UUID is required.' },
        { status: 400 }
      );
    }

    if (!friendId || !UUID_REGEX.test(friendId)) {
      return NextResponse.json(
        { success: false, error: 'A valid friendId UUID is required.' },
        { status: 400 }
      );
    }

    if (userId === friendId) {
      return NextResponse.json(
        { success: false, error: 'Cannot add yourself as a friend.' },
        { status: 400 }
      );
    }

    // Verify both users exist
    const userCheck = await sql`
      SELECT id, is_verified, full_name, masked_id FROM users WHERE id IN (${userId}, ${friendId});
    `;

    if (userCheck.length < 2) {
      return NextResponse.json(
        { success: false, error: 'One or both users do not exist.' },
        { status: 404 }
      );
    }

    // Insert or update friendship
    const insertedRows = await sql`
      INSERT INTO friendships (
        user_id,
        friend_id,
        status,
        created_at
      ) VALUES (
        ${userId},
        ${friendId},
        'ACCEPTED',
        NOW()
      )
      ON CONFLICT (user_id, friend_id) DO UPDATE 
        SET status = 'ACCEPTED'
      RETURNING id, user_id, friend_id, status, created_at;
    `;

    return NextResponse.json({
      success: true,
      friendship: insertedRows[0],
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating friendship:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to establish friendship.' },
      { status: 500 }
    );
  }
}

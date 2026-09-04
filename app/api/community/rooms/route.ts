import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// GET: Retrieve all active support rooms with creator details and message count
export async function GET() {
  try {
    const rooms = await sql`
      SELECT 
        r.id,
        r.creator_id,
        r.title,
        r.topic,
        r.description,
        r.is_volunteer_led,
        r.is_active,
        r.created_at,
        u.full_name AS creator_name,
        u.masked_id AS creator_masked_id,
        u.is_verified AS creator_is_verified,
        u.is_volunteer AS creator_is_volunteer,
        COALESCE(COUNT(m.id), 0)::INT AS message_count
      FROM support_rooms r
      JOIN users u ON r.creator_id = u.id
      LEFT JOIN room_messages m ON m.room_id = r.id
      WHERE r.is_active = TRUE
      GROUP BY r.id, u.id
      ORDER BY r.created_at DESC;
    `;

    return NextResponse.json({
      success: true,
      count: rooms.length,
      rooms: rooms.map((r: any) => ({
        id: r.id,
        title: r.title,
        topic: r.topic || 'General Support',
        description: r.description,
        isVolunteerLed: Boolean(r.is_volunteer_led),
        isActive: Boolean(r.is_active),
        createdAt: r.created_at,
        messageCount: r.message_count ?? 0,
        creator: {
          id: r.creator_id,
          fullName: r.creator_name,
          maskedId: r.creator_masked_id || 'ID-VERIFIED',
          isVerified: Boolean(r.creator_is_verified),
          isVolunteer: Boolean(r.creator_is_volunteer),
        },
      })),
    });
  } catch (error: any) {
    console.error('Error fetching support rooms:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve support rooms.' },
      { status: 500 }
    );
  }
}

// POST: Create a new support room (Enforce resident verification)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const creatorId = body.creatorId || body.creator_id;
    const title = body.title;
    const topic = body.topic || 'General Support';
    const description = body.description;

    if (!creatorId || !UUID_REGEX.test(creatorId)) {
      return NextResponse.json(
        { success: false, error: 'A valid creatorId UUID is required.' },
        { status: 400 }
      );
    }

    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json(
        { success: false, error: 'Room title cannot be empty.' },
        { status: 400 }
      );
    }

    // Enforce verification: check that user exists and is_verified = TRUE
    const userRows = await sql`
      SELECT id, full_name, masked_id, is_verified, is_volunteer
      FROM users
      WHERE id = ${creatorId};
    `;

    if (!userRows || userRows.length === 0 || userRows[0].is_verified !== true) {
      return NextResponse.json(
        {
          success: false,
          error: 'Only verified accounts can volunteer and launch a new room.',
        },
        { status: 403 }
      );
    }

    const creator = userRows[0];
    const isVolunteer = Boolean(creator.is_volunteer);

    const insertedRows = await sql`
      INSERT INTO support_rooms (
        creator_id,
        title,
        topic,
        description,
        is_volunteer_led,
        is_active,
        created_at
      ) VALUES (
        ${creatorId},
        ${title.trim()},
        ${topic.trim()},
        ${description?.trim() || null},
        ${isVolunteer},
        TRUE,
        NOW()
      )
      RETURNING id, creator_id, title, topic, description, is_volunteer_led, is_active, created_at;
    `;

    const inserted = insertedRows[0];

    return NextResponse.json(
      {
        success: true,
        room: {
          id: inserted.id,
          title: inserted.title,
          topic: inserted.topic,
          description: inserted.description,
          isVolunteerLed: Boolean(inserted.is_volunteer_led),
          isActive: Boolean(inserted.is_active),
          createdAt: inserted.created_at,
          messageCount: 0,
          creator: {
            id: creator.id,
            fullName: creator.full_name,
            maskedId: creator.masked_id || 'ID-VERIFIED',
            isVerified: true,
            isVolunteer,
          },
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating support room:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create support room.' },
      { status: 500 }
    );
  }
}

// PUT: Sub-action for room messages (post message inside support room)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const roomId = body.roomId || body.room_id;
    const senderId = body.senderId || body.sender_id;
    const message = body.message;

    if (!roomId || !UUID_REGEX.test(roomId)) {
      return NextResponse.json(
        { success: false, error: 'A valid roomId UUID is required.' },
        { status: 400 }
      );
    }

    if (!senderId || !UUID_REGEX.test(senderId)) {
      return NextResponse.json(
        { success: false, error: 'A valid senderId UUID is required.' },
        { status: 400 }
      );
    }

    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json(
        { success: false, error: 'Room message cannot be empty.' },
        { status: 400 }
      );
    }

    // Verify sender is verified
    const userRows = await sql`
      SELECT id, full_name, masked_id, is_verified, is_volunteer
      FROM users
      WHERE id = ${senderId};
    `;

    if (!userRows || userRows.length === 0 || userRows[0].is_verified !== true) {
      return NextResponse.json(
        {
          success: false,
          error: 'Only verified users can send messages in support rooms.',
        },
        { status: 403 }
      );
    }

    const sender = userRows[0];

    const insertedRows = await sql`
      INSERT INTO room_messages (
        room_id,
        sender_id,
        message,
        created_at
      ) VALUES (
        ${roomId},
        ${senderId},
        ${message.trim()},
        NOW()
      )
      RETURNING id, room_id, sender_id, message, created_at;
    `;

    const inserted = insertedRows[0];

    return NextResponse.json({
      success: true,
      message: {
        id: inserted.id,
        roomId: inserted.room_id,
        senderId: inserted.sender_id,
        message: inserted.message,
        createdAt: inserted.created_at,
        sender: {
          id: sender.id,
          fullName: sender.full_name,
          maskedId: sender.masked_id || 'ID-VERIFIED',
          isVerified: true,
          isVolunteer: Boolean(sender.is_volunteer),
        },
      },
    });
  } catch (error: any) {
    console.error('Error posting message to room:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to post message to room.' },
      { status: 500 }
    );
  }
}

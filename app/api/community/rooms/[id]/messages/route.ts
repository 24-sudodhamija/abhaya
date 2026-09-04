import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET: Retrieve all messages inside a specific support room
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id: roomId } = await context.params;

    if (!roomId || !UUID_REGEX.test(roomId)) {
      return NextResponse.json(
        { success: false, error: 'A valid room UUID is required.' },
        { status: 400 }
      );
    }

    const messages = await sql`
      SELECT 
        m.id,
        m.room_id,
        m.sender_id,
        m.message,
        m.created_at,
        u.full_name,
        u.masked_id,
        u.is_verified,
        u.is_volunteer
      FROM room_messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.room_id = ${roomId}
      ORDER BY m.created_at ASC;
    `;

    return NextResponse.json({
      success: true,
      count: messages.length,
      messages: messages.map((m: any) => ({
        id: m.id,
        roomId: m.room_id,
        senderId: m.sender_id,
        message: m.message,
        createdAt: m.created_at,
        sender: {
          id: m.sender_id,
          fullName: m.full_name,
          maskedId: m.masked_id || 'ID-VERIFIED',
          isVerified: Boolean(m.is_verified),
          isVolunteer: Boolean(m.is_volunteer),
        },
      })),
    });
  } catch (error: any) {
    console.error('Error fetching room messages:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve room messages.' },
      { status: 500 }
    );
  }
}

// POST: Send a message inside a specific support room
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id: roomId } = await context.params;
    const body = await request.json().catch(() => ({}));
    const senderId = body.senderId || body.sender_id;
    const message = body.message;

    if (!roomId || !UUID_REGEX.test(roomId)) {
      return NextResponse.json(
        { success: false, error: 'A valid room UUID is required.' },
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
        { success: false, error: 'Message content cannot be empty.' },
        { status: 400 }
      );
    }

    // Verify sender exists and is verified
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

    return NextResponse.json(
      {
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
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error posting room message:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to post room message.' },
      { status: 500 }
    );
  }
}

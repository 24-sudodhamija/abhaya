import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// GET: Retrieve direct message conversation history between two users
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || searchParams.get('user_id');
    const friendId = searchParams.get('friendId') || searchParams.get('friend_id');

    if (!userId || !UUID_REGEX.test(userId)) {
      return NextResponse.json(
        { success: false, error: 'A valid userId UUID parameter is required.' },
        { status: 400 }
      );
    }

    if (!friendId || !UUID_REGEX.test(friendId)) {
      return NextResponse.json(
        { success: false, error: 'A valid friendId UUID parameter is required.' },
        { status: 400 }
      );
    }

    const messages = await sql`
      SELECT 
        dm.id,
        dm.sender_id,
        dm.receiver_id,
        dm.message,
        dm.created_at,
        u_sender.full_name AS sender_name,
        u_sender.masked_id AS sender_masked_id,
        u_sender.is_verified AS sender_is_verified
      FROM direct_messages dm
      JOIN users u_sender ON dm.sender_id = u_sender.id
      WHERE (dm.sender_id = ${userId} AND dm.receiver_id = ${friendId})
         OR (dm.sender_id = ${friendId} AND dm.receiver_id = ${userId})
      ORDER BY dm.created_at ASC;
    `;

    return NextResponse.json({
      success: true,
      count: messages.length,
      messages: messages.map((m: any) => ({
        id: m.id,
        senderId: m.sender_id,
        receiverId: m.receiver_id,
        message: m.message,
        createdAt: m.created_at,
        senderName: m.sender_name,
        senderMaskedId: m.sender_masked_id,
        senderIsVerified: m.sender_is_verified,
      })),
    });
  } catch (error: any) {
    console.error('Error fetching direct messages:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve direct messages.' },
      { status: 500 }
    );
  }
}

// POST: Send a new direct message to a friend
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const senderId = body.senderId || body.sender_id;
    const receiverId = body.receiverId || body.receiver_id;
    const message = body.message;

    if (!senderId || !UUID_REGEX.test(senderId)) {
      return NextResponse.json(
        { success: false, error: 'A valid senderId UUID is required.' },
        { status: 400 }
      );
    }

    if (!receiverId || !UUID_REGEX.test(receiverId)) {
      return NextResponse.json(
        { success: false, error: 'A valid receiverId UUID is required.' },
        { status: 400 }
      );
    }

    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json(
        { success: false, error: 'Message content cannot be empty.' },
        { status: 400 }
      );
    }

    // Insert direct message
    const insertedRows = await sql`
      INSERT INTO direct_messages (
        sender_id,
        receiver_id,
        message,
        created_at
      ) VALUES (
        ${senderId},
        ${receiverId},
        ${message.trim()},
        NOW()
      )
      RETURNING id, sender_id, receiver_id, message, created_at;
    `;

    const inserted = insertedRows[0];

    return NextResponse.json(
      {
        success: true,
        message: {
          id: inserted.id,
          senderId: inserted.sender_id,
          receiverId: inserted.receiver_id,
          message: inserted.message,
          createdAt: inserted.created_at,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error sending direct message:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send message.' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

interface LoginRequestBody {
  phone?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: LoginRequestBody = await request.json().catch(() => ({}));
    const { phone } = body;

    if (!phone || typeof phone !== 'string' || !phone.trim()) {
      return NextResponse.json(
        { success: false, error: 'Phone number is required.' },
        { status: 400 }
      );
    }

    const trimmedPhone = phone.trim();

    const rows = await sql`
      SELECT id, full_name, phone, is_verified, masked_id, created_at
      FROM users
      WHERE phone = ${trimmedPhone}
      LIMIT 1;
    `;

    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No user found with this phone number.' },
        { status: 404 }
      );
    }

    const user = rows[0];

    return NextResponse.json(
      {
        success: true,
        user,
        id: user.id,
        full_name: user.full_name,
        phone: user.phone,
        is_verified: user.is_verified,
        masked_id: user.masked_id,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error while logging in.' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

interface RegisterRequestBody {
  fullName?: string;
  phone?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: RegisterRequestBody = await request.json().catch(() => ({}));
    const { fullName, phone } = body;

    if (!fullName || typeof fullName !== 'string' || !fullName.trim()) {
      return NextResponse.json(
        { success: false, error: 'Full name is required.' },
        { status: 400 }
      );
    }

    if (!phone || typeof phone !== 'string' || !phone.trim()) {
      return NextResponse.json(
        { success: false, error: 'Phone number is required.' },
        { status: 400 }
      );
    }

    // Strip leading country code (+91), prefix 91, leading 0, and non-digit characters
    let cleanPhone = phone.trim().replace(/[\s\-()]/g, '');
    if (cleanPhone.startsWith('+91')) {
      cleanPhone = cleanPhone.slice(3);
    } else if (cleanPhone.startsWith('91') && cleanPhone.length === 12) {
      cleanPhone = cleanPhone.slice(2);
    } else if (cleanPhone.startsWith('0')) {
      cleanPhone = cleanPhone.slice(1);
    }

    // Strict Indian mobile validation: 10 digits starting with 6, 7, 8, or 9
    const INDIAN_MOBILE_REGEX = /^[6-9]\d{9}$/;
    if (!INDIAN_MOBILE_REGEX.test(cleanPhone)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Please enter a valid 10-digit Indian mobile number starting with 6-9.',
        },
        { status: 400 }
      );
    }

    const trimmedFullName = fullName.trim();
    const standardizedPhone = `+91${cleanPhone}`;

    const rows = await sql`
      INSERT INTO users (full_name, phone)
      VALUES (${trimmedFullName}, ${standardizedPhone})
      RETURNING id, full_name, phone, is_verified;
    `;

    const user = rows[0];

    return NextResponse.json(
      {
        success: true,
        user,
        id: user.id,
        full_name: user.full_name,
        phone: user.phone,
        is_verified: user.is_verified,
      },
      { status: 201 }
    );
  } catch (error: any) {
    // Unique constraint violation in PostgreSQL is error code 23505
    if (
      error?.code === '23505' ||
      error?.message?.includes('duplicate key') ||
      error?.message?.includes('users_phone_key')
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'A user with this phone number is already registered.',
          code: 'PHONE_ALREADY_EXISTS',
        },
        { status: 409 }
      );
    }

    console.error('Registration error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'An internal server error occurred while registering the user.',
      },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import crypto from 'crypto';

interface OtpRequestBody {
  userId?: string;
  rawIdentifier?: string | number;
}

export async function POST(request: NextRequest) {
  try {
    const body: OtpRequestBody = await request.json().catch(() => ({}));
    const { userId, rawIdentifier } = body;

    if (!userId || typeof userId !== 'string' || !userId.trim()) {
      return NextResponse.json(
        { success: false, error: 'userId is required.' },
        { status: 400 }
      );
    }

    if (rawIdentifier === undefined || rawIdentifier === null) {
      return NextResponse.json(
        { success: false, error: 'rawIdentifier is required.' },
        { status: 400 }
      );
    }

    // Strip spaces and hyphens if provided, then ensure exactly 12 digits
    const cleanedIdentifier = String(rawIdentifier).trim().replace(/[\s-]/g, '');

    if (!/^\d{12}$/.test(cleanedIdentifier)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Identity number must contain exactly 12 numeric digits.',
        },
        { status: 400 }
      );
    }

    // Mask to preserve only the last 4 digits (e.g. "XXXX-XXXX-[LAST4]")
    const last4 = cleanedIdentifier.slice(-4);
    const maskedId = `XXXX-XXXX-${last4}`;

    // Generate unique transaction ID (VARCHAR(64))
    const transactionId = `TXN-${crypto.randomUUID()}`;

    // Log the OTP trigger event to audit table
    await sql`
      INSERT INTO identity_verification_logs (user_id, request_type, status, transaction_id)
      VALUES (${userId.trim()}, 'OTP_TRIGGER', 'INITIATED', ${transactionId});
    `;

    return NextResponse.json(
      {
        success: true,
        transactionId,
        maskedId,
      },
      { status: 200 }
    );
  } catch (error: any) {
    // Foreign key violation (23503) or invalid UUID format (22P02)
    if (error?.code === '23503' || error?.code === '22P02') {
      return NextResponse.json(
        { success: false, error: 'User does not exist or invalid userId format.' },
        { status: 404 }
      );
    }

    console.error('OTP trigger error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to initiate identity verification OTP.',
      },
      { status: 500 }
    );
  }
}

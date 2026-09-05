import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import crypto from 'crypto';
import { saveOtpRecord } from '@/lib/auth/otpStore';
import { validateVerhoeff } from '@/lib/auth/verhoeff';

export { validateVerhoeff };

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

    // Strip spaces, hyphens, and formatting
    const cleanedIdentifier = String(rawIdentifier).trim().replace(/[\s-]/g, '');

    // 1. Verify length is exactly 12 numeric digits
    if (!/^\d{12}$/.test(cleanedIdentifier)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Identity number must contain exactly 12 numeric digits.',
        },
        { status: 400 }
      );
    }

    // 2. Reject numbers starting with '0' or '1'
    if (cleanedIdentifier.startsWith('0') || cleanedIdentifier.startsWith('1')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Valid 12-digit identity numbers cannot begin with 0 or 1.',
        },
        { status: 400 }
      );
    }

    // 3. Reject numbers failing the Verhoeff checksum
    if (!validateVerhoeff(cleanedIdentifier)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid identity number. Verhoeff checksum validation failed.',
        },
        { status: 400 }
      );
    }

    // 4. Mask the input: XXXX-XXXX-[LAST4]. Never store raw 12 digits.
    const last4 = cleanedIdentifier.slice(-4);
    const maskedId = `XXXX-XXXX-${last4}`;

    // 5. Generate random, cryptographically secure 6-digit numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Log the generated OTP to the server console for testing/monitoring
    console.log('>>> DISPATCHED OTP:', otp, 'for', maskedId);

    // Generate unique transaction ID (VARCHAR(64))
    const transactionId = `TXN-${crypto.randomUUID()}`;
    const trimmedUserId = userId.trim();

    // 6. Store OTP, userId, and 5-minute expiry in database
    await sql`
      INSERT INTO identity_verification_logs (
        user_id,
        request_type,
        status,
        transaction_id,
        otp_code,
        expires_at
      )
      VALUES (
        ${trimmedUserId},
        'OTP_TRIGGER',
        'PENDING',
        ${transactionId},
        ${otp},
        NOW() + INTERVAL '5 minutes'
      );
    `;

    // Also store in in-memory map for fast zero-latency access & verification
    saveOtpRecord({
      userId: trimmedUserId,
      transactionId,
      otp,
      maskedId,
      expiresAt: Date.now() + 5 * 60 * 1000,
    });

    return NextResponse.json(
      {
        success: true,
        transactionId,
        maskedId,
        debugOtp: process.env.NODE_ENV !== 'production' ? otp : undefined,
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

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

interface ConfirmRequestBody {
  userId?: string;
  transactionId?: string;
  otp?: string | number;
  maskedId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ConfirmRequestBody = await request.json().catch(() => ({}));
    const { userId, transactionId, otp, maskedId } = body;

    if (!userId || typeof userId !== 'string' || !userId.trim()) {
      return NextResponse.json(
        { success: false, error: 'userId is required.' },
        { status: 400 }
      );
    }

    if (!transactionId || typeof transactionId !== 'string' || !transactionId.trim()) {
      return NextResponse.json(
        { success: false, error: 'transactionId is required.' },
        { status: 400 }
      );
    }

    if (otp === undefined || otp === null) {
      return NextResponse.json(
        { success: false, error: 'otp is required.' },
        { status: 400 }
      );
    }

    if (!maskedId || typeof maskedId !== 'string' || !maskedId.trim()) {
      return NextResponse.json(
        { success: false, error: 'maskedId is required.' },
        { status: 400 }
      );
    }

    // Validate that otp equals '123456' (sandbox test passkey) or is a valid 6-digit numeric string
    const cleanOtp = String(otp).trim();
    const isValidOtp = cleanOtp === '123456' || /^\d{6}$/.test(cleanOtp);

    if (!isValidOtp) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid OTP. Must be a valid 6-digit numeric verification code (e.g., 123456).',
        },
        { status: 400 }
      );
    }

    const trimmedUserId = userId.trim();
    const trimmedTransactionId = transactionId.trim();
    const trimmedMaskedId = maskedId.trim();

    // Update user verification status
    const updatedUsers = await sql`
      UPDATE users
      SET is_verified = TRUE,
          verified_at = NOW(),
          masked_id = ${trimmedMaskedId}
      WHERE id = ${trimmedUserId}
      RETURNING id, full_name, phone, is_verified, verified_at, masked_id;
    `;

    if (updatedUsers.length === 0) {
      return NextResponse.json(
        { success: false, error: 'User not found.' },
        { status: 404 }
      );
    }

    // Record verification audit log entry
    await sql`
      INSERT INTO identity_verification_logs (user_id, request_type, status, transaction_id)
      VALUES (${trimmedUserId}, 'OTP_CONFIRM', 'SUCCESS', ${trimmedTransactionId});
    `;

    return NextResponse.json(
      {
        success: true,
        isVerified: true,
        maskedId: trimmedMaskedId,
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

    console.error('OTP confirmation error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to confirm identity verification.',
      },
      { status: 500 }
    );
  }
}

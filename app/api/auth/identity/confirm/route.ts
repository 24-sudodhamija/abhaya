import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getOtpRecord, invalidateOtpRecord } from '@/lib/auth/otpStore';

// Common Indian female and male demographic heuristics for verification-time validation
function validateFemaleDemographic(fullName?: string | null, recordGender?: string | null): boolean {
  if (recordGender) {
    const g = recordGender.trim().toLowerCase();
    if (g === 'male' || g === 'm') return false;
    if (g === 'female' || g === 'f') return true;
  }

  if (!fullName || typeof fullName !== 'string') return false;

  const clean = fullName.trim().toLowerCase();
  const firstName = clean.split(/\s+/)[0];

  // Explicit male names list (common Indian male names) to strictly reject
  const maleNames = new Set([
    'rahul', 'rohit', 'amit', 'ajay', 'vijay', 'suresh', 'ramesh', 'rajesh',
    'sanjay', 'vikram', 'raj', 'deepak', 'anil', 'sunil', 'manoj', 'sachin',
    'arjun', 'rohan', 'karan', 'varun', 'aditya', 'gaurav', 'mohit', 'abhishek',
    'alok', 'prashant', 'nitin', 'ashish', 'vikas', 'aman', 'ankit', 'nikhil',
    'vivek', 'pankaj', 'harish', 'naresh', 'dinesh', 'rakesh', 'mahesh', 'mukesh',
    'ashok', 'vinod', 'arun', 'akhil', 'pradeep', 'sandeep', 'kuldeep', 'mohammed',
    'ahmed', 'ali', 'hassan', 'hussein', 'john', 'david', 'peter', 'michael',
    'ravi', 'suraj', 'pawan', 'dev', 'shyam', 'krishna', 'ram', 'lakshman', 'bharat',
    'satish', 'yogesh', 'umesh', 'kamal', 'chandan', 'tarun', 'chetan', 'mayank',
    'ayush', 'kartik', 'harsh', 'shivam', 'saurabh', 'utkarsh', 'anurag', 'parth',
    'rishabh', 'tushar', 'yash', 'sid', 'siddharth', 'akash', 'aakash', 'vipin',
    'abhimanyu', 'anand', 'deep', 'dhruv', 'gautam', 'harshil', 'hemant', 'ishaan',
    'kabir', 'kunal', 'madhav', 'manish', 'neeraj', 'om', 'piyush', 'pranav',
    'raghav', 'ranveer', 'ranbir', 'samar', 'samarth', 'samir', 'sameer', 'shaan',
    'shantanu', 'shaurya', 'tanmay', 'uday', 'vaibhav', 'vedant', 'veer', 'virat',
    'vivekanand', 'zaheer', 'zayn'
  ]);

  if (maleNames.has(firstName)) {
    return false;
  }

  // Female markers in Indic naming conventions
  if (
    clean.includes(' kaur') ||
    clean.includes(' devi') ||
    clean.includes(' begum') ||
    clean.includes(' kumari') ||
    clean.includes(' bano') ||
    clean.includes(' bai')
  ) {
    return true;
  }

  // Common Indian female first names
  const femaleNames = new Set([
    'priya', 'pooja', 'ananya', 'sneha', 'neha', 'riya', 'shreya', 'divya',
    'aarti', 'aditi', 'sunita', 'anita', 'geeta', 'rekha', 'kavita', 'deepa',
    'meena', 'swati', 'tanvi', 'payal', 'komal', 'ishita', 'suman', 'radha',
    'simran', 'harpreet', 'fatima', 'ayesha', 'zainab', 'mary', 'anjali',
    'meera', 'bhavna', 'rashmi', 'shilpa', 'jyoti', 'khushi', 'muskan',
    'aishwarya', 'deepika', 'priyanka', 'kareena', 'katrina', 'shraddha',
    'alia', 'kriti', 'kiara', 'sara', 'janhvi', 'tanya', 'sakshi', 'prerna',
    'sonia', 'nisha', 'monika', 'rita', 'seema', 'poonam', 'arti', 'parul',
    'pallavi', 'diksha', 'deeksha', 'mansi', 'garima', 'vidya', 'sheetal',
    'ruchika', 'surabhi', 'kanika', 'shikha', 'namrata', 'aparna', 'madhuri',
    'juhi', 'rani', 'kajol', 'sushmita', 'raveena', 'twinkle', 'preity', 'bipasha',
    'mallika', 'kangna', 'kangana', 'taapsee', 'tamanna', 'anushka', 'samantha',
    'nayanthara', 'rashmika', 'trisha', 'kajal', 'ileana', 'asin', 'genelia',
    'shruti', 'sonam', 'parineeti', 'vaani', 'yami', 'bhumi', 'sanya', 'radhika',
    'mrunal', 'alizeh', 'tripti', 'wamiqa', 'medha', 'manushi', 'harnaaz',
    'urvashi', 'dishani', 'disha', 'riya', 'alka', 'usha', 'sarita', 'vandana',
    'kamla', 'shobha', 'lalita', 'saroj', 'chhaya', 'sudha', 'manju', 'pushpa',
    'santosh', 'santoshi', 'archana', 'sapna', 'kalpana', 'anupama', 'anu',
    'bina', 'chitra', 'durga', 'ekta', 'geetanjali', 'hema', 'indira', 'jaya',
    'kamlesh', 'lata', 'mamta', 'nandini', 'padma', 'renu', 'rupali', 'sarala',
    'savita', 'shashi', 'sharda', 'tulsi', 'uma', 'varsha', 'yasmin', 'zoya'
  ]);

  if (femaleNames.has(firstName)) {
    return true;
  }

  // Common Indic female phonetic endings (e.g. -a, -i, -ee, -ya, -ka, -na, -ti, -ri, -shi, -ta, -ni, -la, -ma)
  const femaleEndings = ['a', 'i', 'ee', 'ya', 'ka', 'na', 'ti', 'ri', 'shi', 'ta', 'ni', 'la', 'ma'];
  return femaleEndings.some((ending) => firstName.endsWith(ending));
}

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

    // Strictly validate that OTP is a 6-digit numeric string
    const cleanOtp = String(otp).trim();
    if (!/^\d{6}$/.test(cleanOtp)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid OTP. Must be a 6-digit numeric code.',
        },
        { status: 400 }
      );
    }

    const trimmedUserId = userId.trim();
    const trimmedTransactionId = transactionId.trim();
    const trimmedMaskedId = maskedId.trim();

    // 1. Query the active verification record from database
    const rows = await sql`
      SELECT id, user_id, transaction_id, otp_code, expires_at, status
      FROM identity_verification_logs
      WHERE transaction_id = ${trimmedTransactionId}
        AND user_id = ${trimmedUserId}
      ORDER BY created_at DESC
      LIMIT 1;
    `;

    // Fallback to in-memory store if needed
    const memoryRecord = getOtpRecord(trimmedTransactionId);

    if (rows.length === 0 && !memoryRecord) {
      return NextResponse.json(
        {
          success: false,
          error: 'No active verification session found for this transaction ID. Please request a new OTP.',
        },
        { status: 404 }
      );
    }

    const dbRecord = rows[0];

    // 2. Prevent replay attacks: ensure the record is still PENDING
    if (dbRecord && dbRecord.status !== 'PENDING') {
      return NextResponse.json(
        {
          success: false,
          error: 'This verification code has already been used or invalidated. Please request a new code.',
        },
        { status: 400 }
      );
    }

    // 3. Check expiration: expires_at > NOW()
    const now = Date.now();
    const expiresAt = dbRecord?.expires_at
      ? new Date(dbRecord.expires_at).getTime()
      : memoryRecord?.expiresAt || 0;

    if (expiresAt <= now) {
      if (dbRecord) {
        await sql`
          UPDATE identity_verification_logs
          SET status = 'EXPIRED'
          WHERE id = ${dbRecord.id};
        `;
      }
      invalidateOtpRecord(trimmedTransactionId);

      return NextResponse.json(
        {
          success: false,
          error: 'Verification OTP has expired (5-minute validity). Please request a new code.',
        },
        { status: 400 }
      );
    }

    // 4. Validate OTP match
    const validOtpCode = dbRecord?.otp_code || memoryRecord?.otp;
    if (!validOtpCode || validOtpCode !== cleanOtp) {
      return NextResponse.json(
        {
          success: false,
          error: 'Incorrect OTP code. Please check the code and try again.',
        },
        { status: 400 }
      );
    }

    // 5. Invalidate OTP immediately to prevent replay attacks
    if (dbRecord) {
      await sql`
        UPDATE identity_verification_logs
        SET status = 'CONSUMED',
            otp_code = NULL
        WHERE id = ${dbRecord.id};
      `;
    }
    invalidateOtpRecord(trimmedTransactionId);

    // 6. Demographic Extraction & Verification-Time Gender Validation
    const userToVerify = await sql`
      SELECT id, full_name, phone, gender, is_verified
      FROM users
      WHERE id = ${trimmedUserId};
    `;

    if (userToVerify.length === 0) {
      return NextResponse.json(
        { success: false, error: 'User record not found.' },
        { status: 404 }
      );
    }

    const targetUser = userToVerify[0];
    const isFemale = validateFemaleDemographic(targetUser.full_name, targetUser.gender);

    if (!isFemale) {
      // Demographic check failed: reject verification attempt
      await sql`
        UPDATE users
        SET is_verified = FALSE,
            gender = 'Non-Female'
        WHERE id = ${trimmedUserId};
      `;

      await sql`
        INSERT INTO identity_verification_logs (user_id, request_type, status, transaction_id)
        VALUES (${trimmedUserId}, 'DEMOGRAPHIC_GENDER_CHECK', 'REJECTED_NON_FEMALE', ${trimmedTransactionId});
      `;

      return NextResponse.json(
        {
          success: false,
          error: 'Access Denied: Abhaya community protection is restricted to female commuters and verified women safety responders.',
        },
        { status: 403 }
      );
    }

    // 7. Update user verification status in database (persist gender: 'Female')
    const updatedUsers = await sql`
      UPDATE users
      SET is_verified = TRUE,
          verified_at = NOW(),
          masked_id = ${trimmedMaskedId},
          gender = 'Female'
      WHERE id = ${trimmedUserId}
      RETURNING id, full_name, phone, is_verified, verified_at, masked_id, gender, is_volunteer, trust_score;
    `;

    const updatedUser = updatedUsers[0];

    // 8. Record verification audit log entry
    await sql`
      INSERT INTO identity_verification_logs (user_id, request_type, status, transaction_id)
      VALUES (${trimmedUserId}, 'OTP_CONFIRM', 'SUCCESS', ${trimmedTransactionId});
    `;

    return NextResponse.json(
      {
        success: true,
        isVerified: true,
        maskedId: trimmedMaskedId,
        user: {
          id: updatedUser.id,
          fullName: updatedUser.full_name,
          phone: updatedUser.phone,
          is_verified: true,
          gender: 'Female',
          masked_id: trimmedMaskedId,
          maskedId: trimmedMaskedId,
          is_volunteer: updatedUser.is_volunteer,
          trust_score: updatedUser.trust_score,
        },
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

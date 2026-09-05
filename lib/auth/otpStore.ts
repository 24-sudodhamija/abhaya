/**
 * In-memory OTP Verification Store
 * Persists active verification codes with expiry across API requests in Node global scope.
 */

export interface VerificationRecord {
  userId: string;
  transactionId: string;
  otp: string;
  maskedId: string;
  expiresAt: number; // UNIX timestamp in ms
}

declare global {
  // eslint-disable-next-line no-var
  var __abhaya_otp_store: Map<string, VerificationRecord> | undefined;
}

const otpStore: Map<string, VerificationRecord> =
  globalThis.__abhaya_otp_store || new Map();

if (process.env.NODE_ENV !== 'production') {
  globalThis.__abhaya_otp_store = otpStore;
}

export function saveOtpRecord(record: VerificationRecord): void {
  // Prune expired records
  const now = Date.now();
  for (const [key, value] of otpStore.entries()) {
    if (value.expiresAt <= now) {
      otpStore.delete(key);
    }
  }

  // Key by transactionId for O(1) lookup
  otpStore.set(record.transactionId, record);
}

export function getOtpRecord(transactionId: string): VerificationRecord | undefined {
  const record = otpStore.get(transactionId);
  if (!record) return undefined;

  // If expired, remove and return undefined
  if (record.expiresAt <= Date.now()) {
    otpStore.delete(transactionId);
    return undefined;
  }

  return record;
}

export function invalidateOtpRecord(transactionId: string): void {
  otpStore.delete(transactionId);
}

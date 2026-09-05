'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  X,
  Loader2,
  AlertCircle,
  KeyRound,
  ArrowLeft,
  CheckCircle2,
  RotateCw,
  Clock,
} from 'lucide-react';
import { validateVerhoeff } from '@/lib/auth/verhoeff';

interface IdentityVerificationModalProps {
  userId: string;
  onSuccess: (maskedId: string, updatedUser?: any) => void;
  onClose: () => void;
}

export default function IdentityVerificationModal({
  userId,
  onSuccess,
  onClose,
}: IdentityVerificationModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [rawIdInput, setRawIdInput] = useState('');
  const [inlineIdError, setInlineIdError] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState('');
  const [maskedId, setMaskedId] = useState('');
  const [otp, setOtp] = useState('');
  const [resendCooldown, setResendCooldown] = useState(30);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConfirmed, setIsConfirmed] = useState(false);

  const otpInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus OTP input when entering step 2
  useEffect(() => {
    if (step === 2) {
      setTimeout(() => {
        otpInputRef.current?.focus();
      }, 50);
    }
  }, [step]);

  // 30-second countdown timer for Resend Code
  useEffect(() => {
    if (step !== 2 || resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [step, resendCooldown]);

  // Format 12-digit number into spaced blocks: #### #### ####
  const handleIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setInlineIdError(null);

    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 12);
    const chunks = digitsOnly.match(/.{1,4}/g);
    const formatted = chunks ? chunks.join(' ') : digitsOnly;
    setRawIdInput(formatted);

    // Dynamic inline validation as user reaches 12 digits
    if (digitsOnly.length === 12) {
      if (digitsOnly.startsWith('0') || digitsOnly.startsWith('1')) {
        setInlineIdError('Identity numbers cannot begin with 0 or 1.');
      } else if (!validateVerhoeff(digitsOnly)) {
        setInlineIdError('Invalid identity number (Verhoeff checksum failed).');
      } else {
        setInlineIdError(null);
      }
    }
  };

  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 6);
    setOtp(digitsOnly);
  };

  const cleanRawIdentifier = rawIdInput.replace(/\s/g, '');

  const handleDispatchOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (cleanRawIdentifier.length !== 12) {
      setInlineIdError('Identity number must contain exactly 12 numeric digits.');
      return;
    }

    if (cleanRawIdentifier.startsWith('0') || cleanRawIdentifier.startsWith('1')) {
      setInlineIdError('Identity numbers cannot begin with 0 or 1.');
      return;
    }

    if (!validateVerhoeff(cleanRawIdentifier)) {
      setInlineIdError('Invalid identity number (Verhoeff checksum failed).');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/identity/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          rawIdentifier: cleanRawIdentifier,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to dispatch verification code.');
      }

      setTransactionId(data.transactionId);
      setMaskedId(data.maskedId);
      setResendCooldown(30);
      setOtp('');
      setStep(2);
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || isResending) return;
    setError(null);
    setIsResending(true);

    try {
      const res = await fetch('/api/auth/identity/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          rawIdentifier: cleanRawIdentifier,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to resend verification code.');
      }

      setTransactionId(data.transactionId);
      setResendCooldown(30);
      setOtp('');
    } catch (err: any) {
      setError(err?.message || 'Failed to resend verification code.');
    } finally {
      setIsResending(false);
    }
  };

  const handleConfirmOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setError('Please enter the 6-digit verification passkey.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/identity/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          transactionId,
          otp,
          maskedId,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Identity confirmation failed.');
      }

      // Update localStorage with verified female profile if returned
      if (data.user) {
        try {
          const stored = localStorage.getItem('abhaya_user');
          const existing = stored ? JSON.parse(stored) : {};
          localStorage.setItem(
            'abhaya_user',
            JSON.stringify({ ...existing, ...data.user, is_verified: true, gender: 'Female' })
          );
        } catch (e) {
          console.error('Failed to update localStorage with verified profile:', e);
        }
      }

      setIsConfirmed(true);
      setTimeout(() => {
        onSuccess(data.maskedId || maskedId, data.user);
      }, 700);
    } catch (err: any) {
      setError(err?.message || 'Verification confirmation failed. Please check your OTP.');
    } finally {
      setIsLoading(false);
    }
  };

  const isIdValid = cleanRawIdentifier.length === 12 && !inlineIdError && validateVerhoeff(cleanRawIdentifier);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md rounded-3xl border border-rose-950/60 bg-[#16040c] p-7 shadow-2xl text-zinc-100 relative">
        {/* Header Bar */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-rose-950/50 border border-rose-900/50 rounded-2xl text-rose-400 shadow-inner">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <span className="text-rose-400 bg-rose-950/40 border border-rose-900/40 rounded-full px-3 py-1 text-xs inline-block mb-1">
                Identity Trust
              </span>
              <h2 className="text-xl font-bold text-white tracking-tight">
                National Identity Verification
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-rose-950/50 rounded-xl transition-colors disabled:opacity-50"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-zinc-400 leading-relaxed mt-3">
          Encrypted tokenization ensures complete numbers are never stored.
        </p>

        {/* Global Error Banner / Demographic Rejection Banner */}
        {error && (
          <div className="mt-4 flex items-start gap-2.5 bg-rose-950/40 border border-rose-900 text-rose-300 text-xs rounded-xl p-3.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span className="leading-snug">{error}</span>
          </div>
        )}

        {/* Success Confirmation State */}
        {isConfirmed ? (
          <div className="mt-6 py-6 text-center space-y-3">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-950/60 border border-emerald-800/50 text-emerald-400 shadow-lg">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-white">Identity Verified</h3>
            <p className="text-xs text-zinc-400">
              Verified Token: <span className="font-mono text-rose-300 font-semibold">{maskedId}</span>
            </p>
          </div>
        ) : (
          <>
            {/* Step 1: ID Entry */}
            {step === 1 && (
              <form onSubmit={handleDispatchOtp} className="mt-6 space-y-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="rawIdentifier" className="block text-xs font-medium text-zinc-300">
                      12-Digit Identity Number
                    </label>
                    {isIdValid && (
                      <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Validated
                      </span>
                    )}
                  </div>
                  <input
                    id="rawIdentifier"
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    value={rawIdInput}
                    onChange={handleIdChange}
                    placeholder="#### #### ####"
                    maxLength={14}
                    disabled={isLoading}
                    className={`w-full bg-[#0d0207] border rounded-2xl px-4 py-3.5 text-zinc-100 placeholder-zinc-700 outline-none font-mono tracking-widest disabled:opacity-50 text-base sm:text-sm transition-colors ${
                      inlineIdError
                        ? 'border-rose-600 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                        : isIdValid
                        ? 'border-emerald-600/80 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500'
                        : 'border-rose-950/80 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                    }`}
                  />

                  {/* Inline Verhoeff / Digit Error */}
                  {inlineIdError ? (
                    <div className="flex items-center gap-1.5 text-rose-400 text-xs pt-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{inlineIdError}</span>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center text-[11px] text-zinc-500 pt-0.5 px-1">
                      <span>Aadhaar / National ID Format</span>
                      <span className="font-mono">{cleanRawIdentifier.length}/12</span>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={cleanRawIdentifier.length !== 12 || Boolean(inlineIdError) || isLoading}
                  className="w-full bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-semibold rounded-2xl py-3.5 shadow-lg shadow-rose-950/50 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Dispatching Security Code...</span>
                    </>
                  ) : (
                    <span>Dispatch Security Code</span>
                  )}
                </button>
              </form>
            )}

            {/* Step 2: OTP Entry */}
            {step === 2 && (
              <form onSubmit={handleConfirmOtp} className="mt-6 space-y-4">
                {/* Masked ID Tag */}
                <div className="flex items-center justify-between bg-[#0d0207] border border-rose-950/80 rounded-2xl p-3.5">
                  <div className="flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-rose-400" />
                    <span className="text-xs text-zinc-400">Target Identifier</span>
                  </div>
                  <span className="text-rose-400 bg-rose-950/40 border border-rose-900/40 rounded-full px-3 py-1 text-xs font-mono font-medium">
                    {maskedId}
                  </span>
                </div>

                {/* OTP Input */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="otp" className="text-xs font-medium text-zinc-300">
                      6-Digit Security Passkey
                    </label>
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      disabled={isLoading}
                      className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1 transition-colors"
                    >
                      <ArrowLeft className="w-3 h-3" /> Change ID
                    </button>
                  </div>
                  <input
                    ref={otpInputRef}
                    id="otp"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    autoFocus
                    value={otp}
                    onChange={handleOtpChange}
                    placeholder=""
                    maxLength={6}
                    disabled={isLoading}
                    className="w-full bg-[#0d0207] border border-rose-950/80 rounded-2xl px-4 py-3.5 text-zinc-100 placeholder-zinc-700 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none font-mono tracking-widest text-center text-xl disabled:opacity-50"
                  />

                  {/* 30-Second Resend Countdown Bar */}
                  <div className="flex items-center justify-between text-xs px-1 text-zinc-400 pt-1">
                    <span>Didn't receive code?</span>
                    {resendCooldown > 0 ? (
                      <span className="font-mono text-zinc-500 text-xs flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-zinc-500" />
                        <span>Resend in {resendCooldown}s</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResendOtp}
                        disabled={isLoading || isResending}
                        className="text-rose-400 hover:text-rose-300 font-semibold underline disabled:opacity-50 transition-colors flex items-center gap-1"
                      >
                        {isResending ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <RotateCw className="w-3 h-3" />
                        )}
                        <span>Resend Code</span>
                      </button>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={otp.length !== 6 || isLoading}
                  className="w-full bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-semibold rounded-2xl py-3.5 shadow-lg shadow-rose-950/50 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Verifying Passkey...</span>
                    </>
                  ) : (
                    <span>Confirm &amp; Verify</span>
                  )}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}

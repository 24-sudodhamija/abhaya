'use client';

import React, { useState } from 'react';
import { ShieldCheck, X, Loader2, AlertCircle, KeyRound, ArrowLeft, CheckCircle2 } from 'lucide-react';

interface IdentityVerificationModalProps {
  userId: string;
  onSuccess: (maskedId: string) => void;
  onClose: () => void;
}

export default function IdentityVerificationModal({
  userId,
  onSuccess,
  onClose,
}: IdentityVerificationModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [rawIdInput, setRawIdInput] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [maskedId, setMaskedId] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConfirmed, setIsConfirmed] = useState(false);

  // Format 12-digit number into 4-digit chunks: 0000 0000 0000
  const handleIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 12);
    const formatted = digitsOnly.match(/.{1,4}/g)?.join(' ') || digitsOnly;
    setRawIdInput(formatted);
  };

  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 6);
    setOtp(digitsOnly);
  };

  const cleanRawIdentifier = rawIdInput.replace(/\s/g, '');

  const handleDispatchOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cleanRawIdentifier.length !== 12) {
      setError('Please enter a valid 12-digit identity number.');
      return;
    }

    setIsLoading(true);
    setError(null);

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
      setStep(2);
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
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

      setIsConfirmed(true);
      setTimeout(() => {
        onSuccess(data.maskedId || maskedId);
      }, 700);
    } catch (err: any) {
      setError(err?.message || 'Verification confirmation failed. Please check your OTP.');
    } finally {
      setIsLoading(false);
    }
  };

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

        {/* Error Banner */}
        {error && (
          <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-rose-800/80 bg-rose-950/50 p-3.5 text-xs text-rose-200 animate-in fade-in">
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
                  <label htmlFor="rawIdentifier" className="block text-xs font-medium text-zinc-300">
                    12-Digit Identity Number
                  </label>
                  <input
                    id="rawIdentifier"
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    value={rawIdInput}
                    onChange={handleIdChange}
                    placeholder="0000 0000 0000"
                    maxLength={14}
                    disabled={isLoading}
                    className="w-full bg-[#0d0207] border border-rose-950/80 rounded-2xl px-4 py-3.5 text-zinc-100 placeholder-zinc-600 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none font-mono tracking-widest disabled:opacity-50 text-base sm:text-sm"
                  />
                  <div className="flex justify-between items-center text-[11px] text-zinc-500 pt-0.5 px-1">
                    <span>Aadhaar / National ID Format</span>
                    <span className="font-mono">{cleanRawIdentifier.length}/12</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={cleanRawIdentifier.length !== 12 || isLoading}
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
                    id="otp"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={otp}
                    onChange={handleOtpChange}
                    placeholder="123456"
                    maxLength={6}
                    disabled={isLoading}
                    className="w-full bg-[#0d0207] border border-rose-950/80 rounded-2xl px-4 py-3.5 text-zinc-100 placeholder-zinc-600 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none font-mono tracking-widest text-center text-lg disabled:opacity-50"
                  />
                  <div className="flex items-center justify-between text-xs px-1 text-zinc-400 pt-0.5">
                    <span>Demo Passkey: <strong className="font-mono text-rose-300">123456</strong></span>
                    <button
                      type="button"
                      onClick={() => setOtp('123456')}
                      className="text-rose-400 hover:text-rose-300 text-xs underline font-medium"
                    >
                      Autofill
                    </button>
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

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  Heart,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  Lock,
} from 'lucide-react';
import IdentityVerificationModal from '@/components/auth/IdentityVerificationModal';

export default function LoginPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [maskedId, setMaskedId] = useState<string | null>(null);

  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hydrate initial state from localStorage if a previous session exists
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('abhaya_user');
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        const name = parsed.fullName || parsed.full_name;
        if (name) setFullName(name);
        if (parsed.phone) {
          const rawDigits = parsed.phone.replace(/^\+91/, '').replace(/\D/g, '');
          setPhoneNumber(rawDigits);
        }
        if (parsed.id) setUserId(parsed.id);
        if (parsed.is_verified === true) {
          setIsVerified(true);
          setMaskedId(parsed.maskedId || parsed.masked_id || null);
        }
      }
    } catch {
      // Ignore corrupted localStorage
    }
  }, []);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 10);
    setPhoneNumber(digitsOnly);
  };

  const handleStartVerification = async () => {
    setError(null);
    if (!fullName.trim()) {
      setError('Please provide your full name before initiating verification.');
      return;
    }

    const cleanDigits = phoneNumber.replace(/\D/g, '');
    if (cleanDigits.length !== 10) {
      setError('Please enter a valid 10-digit mobile number first.');
      return;
    }

    // If userId is already established, open verification modal immediately
    if (userId) {
      setShowVerificationModal(true);
      return;
    }

    setIsActionLoading(true);
    try {
      const formattedPhone = `+91${cleanDigits}`;
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: fullName.trim(),
          phone: formattedPhone,
        }),
      });

      const data = await res.json();

      if (res.status === 409) {
        // User already exists, fetch profile
        const loginRes = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: formattedPhone }),
        });
        const loginData = await loginRes.json();

        if (loginRes.ok && loginData.user) {
          setUserId(loginData.user.id);
          if (loginData.user.is_verified === true) {
            setIsVerified(true);
            const userMaskedId = loginData.user.masked_id || 'XXXX-XXXX-****';
            setMaskedId(userMaskedId);
            const payload = {
              id: loginData.user.id,
              fullName: loginData.user.full_name || fullName.trim(),
              phone: formattedPhone,
              is_verified: true,
              maskedId: userMaskedId,
            };
            localStorage.setItem('abhaya_user', JSON.stringify(payload));
            sessionStorage.setItem('abhaya_session_active', 'true');
            setIsRedirecting(true);
            setTimeout(() => {
              router.push('/');
            }, 800);
            return;
          }
          setShowVerificationModal(true);
          return;
        }
      }

      if (!res.ok || !data.user) {
        throw new Error(data.error || 'Could not register user session.');
      }

      const createdUser = data.user;
      setUserId(createdUser.id);
      setShowVerificationModal(true);
    } catch (err: any) {
      setError(err?.message || 'Failed to prepare verification session.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isVerified) {
      setError('Resident ID verification is mandatory to enter Abhaya Protection.');
      return;
    }

    if (!fullName.trim()) {
      setError('Full name is required.');
      return;
    }

    const cleanDigits = phoneNumber.replace(/\D/g, '');
    if (cleanDigits.length !== 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setIsLoading(true);
    try {
      const formattedPhone = `+91${cleanDigits}`;
      const sessionPayload = {
        id: userId,
        fullName: fullName.trim(),
        phone: formattedPhone,
        is_verified: true,
        maskedId: maskedId || '',
      };

      // Store full session payload under abhaya_user
      localStorage.setItem('abhaya_user', JSON.stringify(sessionPayload));
      sessionStorage.setItem('abhaya_session_active', 'true');

      // Redirect to main dashboard
      router.push('/');
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0104] text-zinc-100 flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden font-sans antialiased">
      {/* Ambient background glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-rose-900/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-pink-900/15 rounded-full blur-3xl pointer-events-none" />

      <main className="w-full max-w-md relative z-10 space-y-6">
        {/* Header Branding */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-600 to-rose-500 flex items-center justify-center font-bold text-white text-xl shadow-lg shadow-pink-500/30">
              A
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-wide">ABHAYA</h1>
              <p className="text-xs text-pink-400 font-medium flex items-center gap-1">
                Women Safety <Heart className="w-3 h-3 fill-pink-500 text-pink-500 inline" />
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-pink-500/10 border border-pink-500/30 text-pink-300 px-3.5 py-1.5 rounded-full text-xs font-semibold shadow-sm">
            <ShieldCheck className="w-4 h-4 text-pink-400" />
            Shield Engine Active
          </div>
        </header>

        {/* Title Section */}
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-pink-400 flex items-center gap-1.5 mb-1">
            <Sparkles className="w-3.5 h-3.5" /> Abhaya Community Protection
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-zinc-100 tracking-tight">
            Welcome to Abhaya
          </h2>
          <p className="text-zinc-400 text-sm mt-1">
            Your intelligent, proactive safety companion.
          </p>
        </div>

        {/* Auth Card */}
        <div className="w-full bg-[#18040d] border border-rose-950/50 rounded-3xl p-7 sm:p-8 shadow-2xl relative">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Full Name Input */}
            <div className="space-y-1.5">
              <label htmlFor="fullName" className="block text-xs font-semibold text-zinc-300">
                Full Name
              </label>
              <input
                id="fullName"
                type="text"
                required
                value={fullName}
                onChange={(e) => {
                  setError(null);
                  setFullName(e.target.value);
                }}
                placeholder="e.g. Aarohi Patel"
                disabled={isLoading || isActionLoading}
                className="w-full bg-[#0d0207] border border-rose-950/70 rounded-2xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none transition-colors disabled:opacity-50"
              />
            </div>

            {/* Mobile Number Input with +91 prefix */}
            <div className="space-y-1.5">
              <label htmlFor="phone" className="block text-xs font-semibold text-zinc-300">
                Mobile Number
              </label>
              <div className="flex items-center bg-[#0d0207] border border-rose-950/70 rounded-2xl overflow-hidden focus-within:border-rose-500 focus-within:ring-1 focus-within:ring-rose-500 transition-colors">
                <div className="px-3.5 py-3 text-sm font-mono text-pink-400 font-semibold bg-[#13030b] border-r border-rose-950/70 select-none">
                  +91
                </div>
                <input
                  id="phone"
                  type="tel"
                  inputMode="numeric"
                  required
                  value={phoneNumber}
                  onChange={handlePhoneChange}
                  placeholder="98765 43210"
                  maxLength={10}
                  disabled={isLoading || isActionLoading}
                  className="w-full bg-transparent px-3.5 py-3 text-sm text-zinc-100 placeholder-zinc-600 outline-none font-mono disabled:opacity-50"
                />
              </div>
            </div>

            {/* Verification Status Box */}
            <div className="rounded-2xl border border-rose-950/60 bg-[#0d0207] p-4 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-medium text-zinc-400">
                <span>Resident Verification</span>
                <span className="text-[11px] text-zinc-500 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-zinc-600" /> Aadhaar Tokenization
                </span>
              </div>

              {isVerified ? (
                /* Verified State: Emerald/green badge */
                <div className="flex items-center justify-between bg-emerald-950/40 border border-emerald-800/40 rounded-xl p-3">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div>
                      <span className="text-xs font-bold text-emerald-400 block leading-tight">
                        Verified Resident
                      </span>
                      <span className="text-[11px] font-mono text-emerald-200/80">
                        {maskedId || 'XXXX-XXXX-****'}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Active
                  </span>
                </div>
              ) : (
                /* Unverified State: Action button to launch verification */
                <div className="flex items-center justify-between bg-rose-950/25 border border-rose-900/30 rounded-xl p-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
                    <span className="text-xs font-medium text-zinc-300">
                      Unverified Profile
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleStartVerification}
                    disabled={isLoading || isActionLoading}
                    className="text-xs font-semibold text-rose-300 bg-rose-950/60 hover:bg-rose-900/60 border border-rose-800/50 hover:border-rose-700/60 rounded-xl px-3 py-1.5 transition-all flex items-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-50"
                  >
                    {isActionLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-300" />
                    ) : (
                      <ShieldCheck className="w-3.5 h-3.5 text-rose-400" />
                    )}
                    Verify Resident ID
                  </button>
                </div>
              )}
            </div>

            {/* Error Message Banner */}
            {error && (
              <div className="flex items-start gap-2.5 rounded-2xl border border-rose-800/80 bg-rose-950/50 p-3.5 text-xs text-rose-200 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span className="leading-snug">{error}</span>
              </div>
            )}

            {/* Main CTA Button - Disabled until is_verified === true */}
            <div className="space-y-2">
              <button
                type="submit"
                disabled={!isVerified || isLoading || isActionLoading || isRedirecting}
                className="w-full bg-gradient-to-r from-rose-600 to-pink-600 text-white font-semibold py-4 rounded-2xl hover:opacity-95 transition-all shadow-lg shadow-rose-950/60 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed group text-sm"
              >
                {isLoading || isRedirecting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>{isRedirecting ? 'Identity Verified! Launching...' : 'Entering Protection Mode...'}</span>
                  </>
                ) : (
                  <>
                    <span>Enter Abhaya Protection</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>

              {!isVerified && (
                <p className="text-[11px] text-zinc-500 text-center flex items-center justify-center gap-1.5 pt-1">
                  <Lock className="w-3 h-3 text-rose-400/80" />
                  Resident ID verification is mandatory to activate Abhaya Protection.
                </p>
              )}
            </div>
          </form>
        </div>
      </main>

      {/* Identity Verification Modal */}
      {showVerificationModal && userId && (
        <IdentityVerificationModal
          userId={userId}
          onSuccess={(verifiedMaskedId) => {
            setIsVerified(true);
            setMaskedId(verifiedMaskedId);
            setShowVerificationModal(false);

            const cleanDigits = phoneNumber.replace(/\D/g, '');
            const formattedPhone = `+91${cleanDigits}`;

            // Store full session payload under abhaya_user
            const sessionPayload = {
              id: userId,
              fullName: fullName.trim(),
              phone: formattedPhone,
              is_verified: true,
              maskedId: verifiedMaskedId,
            };

            localStorage.setItem('abhaya_user', JSON.stringify(sessionPayload));
            sessionStorage.setItem('abhaya_session_active', 'true');

            // Automatically redirect the user to the main dashboard (/) only upon verified submission
            setIsRedirecting(true);
            setTimeout(() => {
              router.push('/');
            }, 700);
          }}
          onClose={() => setShowVerificationModal(false)}
        />
      )}
    </div>
  );
}

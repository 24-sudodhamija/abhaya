'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/navigation/Navbar';
import {
  Shield,
  ShieldCheck,
  Users,
  Navigation,
  AlertTriangle,
  Fingerprint,
  Sparkles,
  RefreshCw,
  X,
  Phone,
  Calendar,
  MapPin,
  Clock,
  HeartHandshake,
  Award,
  ExternalLink,
  ChevronRight,
  UserCheck,
  CheckCircle2,
  Lock,
} from 'lucide-react';

interface UserProfile {
  id: string;
  fullName: string;
  phone: string;
  maskedId: string;
  isVerified: boolean;
  verifiedAt: string | null;
  dob: string | null;
  gender: string | null;
  stateRegion: string | null;
  trustScore: number;
  isVolunteer: boolean;
  friendsCount: number;
  journeysCount: number;
  reportsCount: number;
}

export default function ProfilePage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isIdentityModalOpen, setIsIdentityModalOpen] = useState<boolean>(false);
  const [isTogglingVolunteer, setIsTogglingVolunteer] = useState<boolean>(false);

  // Fetch full profile from API
  const fetchProfile = useCallback(async (userId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch(`/api/user/profile?userId=${encodeURIComponent(userId)}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to load profile.');
      }

      setProfile(data.profile);
    } catch (err: any) {
      console.error('Profile fetch error:', err);
      setError(err.message || 'Unable to retrieve profile metadata.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 1. Verification Check on Mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem('abhaya_user');
      if (!stored) {
        router.replace('/login');
        return;
      }

      const parsed = JSON.parse(stored);
      if (!parsed || !parsed.id || !parsed.is_verified) {
        router.replace('/login');
        return;
      }

      setIsAuthenticated(true);
      fetchProfile(parsed.id);
    } catch (e) {
      console.error('Auth verification error:', e);
      router.replace('/login');
    }
  }, [router, fetchProfile]);

  // Toggle Volunteer Status
  const handleToggleVolunteer = async () => {
    if (!profile || isTogglingVolunteer) return;

    const newStatus = !profile.isVolunteer;
    setIsTogglingVolunteer(true);

    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: profile.id,
          isVolunteer: newStatus,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update volunteer status.');
      }

      // Optimistically update local state & localStorage
      setProfile((prev) => (prev ? { ...prev, isVolunteer: newStatus } : null));

      try {
        const stored = localStorage.getItem('abhaya_user');
        if (stored) {
          const parsed = JSON.parse(stored);
          parsed.is_volunteer = newStatus;
          localStorage.setItem('abhaya_user', JSON.stringify(parsed));
        }
      } catch (storageErr) {
        console.warn('Could not update localStorage cache:', storageErr);
      }
    } catch (err: any) {
      console.error('Volunteer toggle error:', err);
      alert(err.message || 'Could not update volunteer responder status.');
    } finally {
      setIsTogglingVolunteer(false);
    }
  };

  // Helper for initials
  const getInitials = (name?: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Helper for formatted date
  const formatDate = (isoString?: string | null) => {
    if (!isoString) return 'Not available';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0a0104] text-rose-50 flex flex-col items-center justify-center p-4 font-sans antialiased">
        <div className="flex flex-col items-center gap-4 animate-in fade-in duration-300">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-rose-600 to-pink-600 flex items-center justify-center font-bold text-white text-3xl shadow-2xl shadow-rose-600/40 animate-pulse">
            A
          </div>
          <div className="flex items-center gap-2 text-rose-400 text-xs font-semibold tracking-wider uppercase">
            <ShieldCheck className="w-4 h-4 animate-spin text-rose-500" /> Verifying Citizen Credentials...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0104] text-zinc-100 flex flex-col md:flex-row font-sans antialiased relative selection:bg-rose-900 selection:text-white">
      <Navbar />

      {/* Main Content Area: md:ml-72 clears the fixed w-64 sidebar */}
      <main className="flex-1 md:ml-72 p-4 md:p-8 pb-28 md:pb-12 max-w-7xl mx-auto w-full space-y-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-rose-950/60 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono tracking-widest text-rose-400 uppercase bg-rose-950/80 px-2.5 py-1 rounded-full border border-rose-900/60">
                Encrypted Resident Portal
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight mt-2">
              Citizen Safety Profile
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Cryptographically verified identity, network protection metrics, and community trust standing.
            </p>
          </div>

          <button
            onClick={() => profile?.id && fetchProfile(profile.id)}
            disabled={isLoading}
            className="self-start sm:self-center px-4 py-2 bg-[#18040d] border border-rose-950/80 hover:border-rose-900 rounded-2xl text-xs font-semibold text-rose-300 flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-rose-500' : ''}`} />
            <span>Refresh Telemetry</span>
          </button>
        </div>

        {/* Loading Skeleton */}
        {isLoading && !profile ? (
          <div className="space-y-6 animate-pulse">
            <div className="bg-[#18040d] border border-rose-950/60 rounded-3xl p-6 md:p-8 h-72 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3 text-rose-400">
                <RefreshCw className="w-8 h-8 animate-spin" />
                <span className="text-xs font-mono">Authenticating secure ledger record...</span>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="bg-[#18040d] border border-rose-950/60 rounded-3xl h-36" />
              <div className="bg-[#18040d] border border-rose-950/60 rounded-3xl h-36" />
              <div className="bg-[#18040d] border border-rose-950/60 rounded-3xl h-36" />
            </div>
          </div>
        ) : error ? (
          <div className="p-6 rounded-3xl bg-rose-950/40 border border-rose-900/60 text-center space-y-3">
            <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto" />
            <h3 className="text-base font-bold text-white">Profile Retrieval Failed</h3>
            <p className="text-xs text-rose-300 max-w-md mx-auto">{error}</p>
            <button
              onClick={() => {
                const stored = localStorage.getItem('abhaya_user');
                if (stored) fetchProfile(JSON.parse(stored).id);
              }}
              className="px-4 py-2 rounded-xl bg-rose-800 text-white font-semibold text-xs hover:bg-rose-700"
            >
              Retry
            </button>
          </div>
        ) : profile ? (
          <>
            {/* 2. Primary Profile Card */}
            <div className="relative bg-[#18040d] border border-rose-950/60 rounded-3xl p-6 md:p-8 shadow-2xl shadow-rose-950/40 overflow-hidden space-y-6">
              {/* Background ambient gradient glow */}
              <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-rose-600/10 via-pink-600/5 to-transparent rounded-full blur-3xl pointer-events-none" />

              {/* Card Top Row: Avatar & Corner Verified Details Trigger */}
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 relative z-10">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                  {/* Avatar Circle with glowing emerald Trust Badge */}
                  <div className="relative shrink-0">
                    <div className="w-20 h-20 md:w-24 md:h-24 rounded-3xl bg-gradient-to-br from-rose-600 via-pink-600 to-purple-800 flex items-center justify-center font-black text-white text-2xl md:text-3xl shadow-xl shadow-rose-950/60 border border-rose-400/30">
                      {getInitials(profile.fullName)}
                    </div>
                    {/* Glowing Emerald "Verified Resident" Badge */}
                    <span className="absolute -bottom-1.5 -right-1.5 flex h-7 w-7">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-7 w-7 bg-emerald-500 border-2 border-[#18040d] items-center justify-center text-white shadow-lg">
                        <ShieldCheck className="w-4 h-4" />
                      </span>
                    </span>
                  </div>

                  {/* Name, Phone & Status */}
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                        {profile.fullName}
                      </h2>
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-800/70 shadow-sm">
                        <ShieldCheck className="w-3 h-3 text-emerald-400" />
                        Verified Resident
                      </span>
                    </div>

                    <p className="font-mono text-xs md:text-sm text-zinc-400 flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-rose-400" />
                      {profile.phone}
                    </p>

                    <p className="text-xs text-zinc-500">
                      Member since {formatDate(profile.verifiedAt).split(',')[0]} • Region: {profile.stateRegion || 'Delhi NCR'}
                    </p>
                  </div>
                </div>

                {/* 4. Discrete Corner Button: "Verified Identity Data" */}
                <button
                  onClick={() => setIsIdentityModalOpen(true)}
                  className="self-start md:self-auto px-4 py-2.5 rounded-2xl bg-[#0e0208] hover:bg-rose-950/60 border border-rose-900/60 text-rose-200 text-xs font-bold transition-all flex items-center gap-2 shadow-md shadow-rose-950/40 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Fingerprint className="w-4 h-4 text-pink-400" />
                  <span>Verified Identity Data</span>
                </button>
              </div>

              {/* Prominent Masked Identity Chip */}
              <div className="p-4 rounded-2xl bg-[#0e0208] border border-rose-950/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-rose-950/80 to-[#280515] border border-rose-900/60 text-rose-300 shadow-inner">
                    <Shield className="w-6 h-6 text-rose-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                        Masked Identity Token
                      </span>
                      <span className="text-[10px] bg-emerald-950/80 text-emerald-300 border border-emerald-800/80 px-2 py-0.5 rounded-full font-mono flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Validated
                      </span>
                    </div>
                    <p className="font-mono text-lg md:text-xl font-black text-white tracking-widest mt-0.5">
                      {profile.maskedId || 'XXXX-XXXX-****'}
                    </p>
                  </div>
                </div>

                <div className="text-left sm:text-right">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-rose-300 bg-rose-950/50 px-3.5 py-1.5 rounded-xl border border-rose-900/50 shadow-sm">
                    <Sparkles className="w-3.5 h-3.5 text-pink-400" />
                    Cryptographically Verified via Tokenized Ledger
                  </span>
                </div>
              </div>

              {/* Volunteer Responder Toggle Switch */}
              <div className="pt-4 border-t border-rose-950/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <HeartHandshake className="w-4 h-4 text-rose-400" />
                    <h4 className="text-sm font-bold text-white">
                      Volunteer Responder Status
                    </h4>
                    {profile.isVolunteer && (
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-2 py-0.5 rounded-full">
                        ACTIVE VOLUNTEER
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-400 max-w-xl">
                    Signal your willingness to host virtual safe spaces and assist nearby residents during commute check-ins or localized alerts.
                  </p>
                </div>

                {/* Animated Toggle Switch */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={profile.isVolunteer}
                  onClick={handleToggleVolunteer}
                  disabled={isTogglingVolunteer}
                  className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 focus:ring-offset-[#18040d] disabled:opacity-50 ${
                    profile.isVolunteer
                      ? 'bg-gradient-to-r from-rose-600 to-pink-600 shadow-md shadow-rose-950/60'
                      : 'bg-[#2a0818]'
                  }`}
                >
                  <span className="sr-only">Toggle Volunteer Responder Status</span>
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      profile.isVolunteer ? 'translate-x-7' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* 3. Statistics Summary Grid (3 Cards) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Card 1: Guardian Circle */}
              <div className="bg-[#18040d] border border-rose-950/60 rounded-3xl p-6 shadow-xl relative overflow-hidden group hover:border-rose-900/80 transition-all">
                <div className="absolute top-0 right-0 w-28 h-28 bg-rose-600/10 rounded-full blur-2xl group-hover:bg-rose-600/20 transition-all pointer-events-none" />
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                    Guardian Circle
                  </span>
                  <div className="p-2.5 rounded-2xl bg-[#0e0208] border border-rose-950 text-rose-400">
                    <Users className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-4">
                  <div className="text-3xl md:text-4xl font-black text-white font-mono tracking-tight">
                    {profile.friendsCount}
                  </div>
                  <p className="text-xs text-zinc-400 mt-1 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    Verified peer connections
                  </p>
                </div>
              </div>

              {/* Card 2: Protected Journeys */}
              <div className="bg-[#18040d] border border-rose-950/60 rounded-3xl p-6 shadow-xl relative overflow-hidden group hover:border-rose-900/80 transition-all">
                <div className="absolute top-0 right-0 w-28 h-28 bg-pink-600/10 rounded-full blur-2xl group-hover:bg-pink-600/20 transition-all pointer-events-none" />
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                    Protected Journeys
                  </span>
                  <div className="p-2.5 rounded-2xl bg-[#0e0208] border border-rose-950 text-pink-400">
                    <Navigation className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-4">
                  <div className="text-3xl md:text-4xl font-black text-white font-mono tracking-tight">
                    {profile.journeysCount}
                  </div>
                  <p className="text-xs text-zinc-400 mt-1 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-rose-400" />
                    Monitored corridor travels
                  </p>
                </div>
              </div>

              {/* Card 3: Community Hazards */}
              <div className="bg-[#18040d] border border-rose-950/60 rounded-3xl p-6 shadow-xl relative overflow-hidden group hover:border-rose-900/80 transition-all">
                <div className="absolute top-0 right-0 w-28 h-28 bg-amber-600/10 rounded-full blur-2xl group-hover:bg-amber-600/20 transition-all pointer-events-none" />
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                    Community Hazards
                  </span>
                  <div className="p-2.5 rounded-2xl bg-[#0e0208] border border-rose-950 text-amber-400">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-4">
                  <div className="text-3xl md:text-4xl font-black text-white font-mono tracking-tight">
                    {profile.reportsCount}
                  </div>
                  <p className="text-xs text-zinc-400 mt-1 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    Submitted & endorsed reports
                  </p>
                </div>
              </div>
            </div>

            {/* Trust Index Banner */}
            <div className="bg-gradient-to-r from-[#18040d] to-[#250616] border border-rose-950/80 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-base font-bold text-white">
                    Citizen Trust Index & Authenticity
                  </h3>
                </div>
                <p className="text-xs text-zinc-400 max-w-xl">
                  Calculated dynamically from verified identity compliance, confirmed peer endorsements, and incident reporting fidelity.
                </p>
              </div>

              <div className="flex items-center gap-4 self-start md:self-auto bg-[#0d0207] px-5 py-3 rounded-2xl border border-rose-950/70">
                <div>
                  <div className="text-2xl font-black text-white font-mono leading-none">
                    {profile.trustScore} <span className="text-xs text-zinc-500 font-normal">/ 100</span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                    High Community Standing
                  </span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-950/60 border border-emerald-800/60 flex items-center justify-center text-emerald-400 font-bold text-sm">
                  ★
                </div>
              </div>
            </div>
          </>
        ) : null}

        {/* 4. Verified Identity Token Record Modal */}
        {isIdentityModalOpen && profile && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md"
            role="dialog"
            aria-modal="true"
          >
            <div className="w-full max-w-lg rounded-3xl border border-rose-950/80 bg-[#16040c] p-6 shadow-2xl text-zinc-100 relative overflow-hidden space-y-5">
              {/* Background ambient light */}
              <div className="absolute -top-10 -right-10 w-48 h-48 bg-rose-600/15 rounded-full blur-2xl pointer-events-none" />

              {/* Modal Header */}
              <div className="flex items-start justify-between pb-3 border-b border-rose-950/60">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
                      Zero-Knowledge e-KYC
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <Fingerprint className="w-5 h-5 text-pink-400" />
                    Verified Identity Token Record
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => setIsIdentityModalOpen(false)}
                  className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-rose-950/60 transition-colors border border-rose-950/80"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Microcopy */}
              <p className="text-xs text-zinc-400 leading-relaxed bg-[#0d0207] p-3 rounded-2xl border border-rose-950/70">
                Demographic details retrieved through tokenized e-KYC verification. Raw government identification numbers are zero-knowledge protected and never stored unmasked.
              </p>

              {/* Tabular Rows */}
              <div className="space-y-2 text-xs">
                {/* Row 1: Masked Identifier */}
                <div className="p-3 rounded-2xl bg-[#0d0207] border border-rose-950/70 flex items-center justify-between">
                  <span className="text-zinc-400 font-medium">Masked Identifier</span>
                  <span className="font-mono font-bold text-white tracking-wider">
                    {profile.maskedId || 'XXXX-XXXX-****'}
                  </span>
                </div>

                {/* Row 2: Date of Birth */}
                <div className="p-3 rounded-2xl bg-[#0d0207] border border-rose-950/70 flex items-center justify-between">
                  <span className="text-zinc-400 font-medium">Date of Birth</span>
                  <span className="font-semibold text-zinc-200">
                    {profile.dob || 'Recorded in KYC Registry'}
                  </span>
                </div>

                {/* Row 3: Registered Gender */}
                <div className="p-3 rounded-2xl bg-[#0d0207] border border-rose-950/70 flex items-center justify-between">
                  <span className="text-zinc-400 font-medium">Gender</span>
                  <span className="font-semibold text-zinc-200">
                    {profile.gender || 'Female (KYC Confirmed)'}
                  </span>
                </div>

                {/* Row 4: Registered Region */}
                <div className="p-3 rounded-2xl bg-[#0d0207] border border-rose-950/70 flex items-center justify-between">
                  <span className="text-zinc-400 font-medium">Registered Region / State</span>
                  <span className="font-semibold text-zinc-200">
                    {profile.stateRegion || 'Delhi NCR, India'}
                  </span>
                </div>

                {/* Row 5: Verification Timestamp */}
                <div className="p-3 rounded-2xl bg-[#0d0207] border border-rose-950/70 flex items-center justify-between">
                  <span className="text-zinc-400 font-medium">Verification Timestamp</span>
                  <span className="font-mono text-zinc-300 text-[11px]">
                    {formatDate(profile.verifiedAt)}
                  </span>
                </div>

                {/* Row 6: Citizen Trust Index */}
                <div className="p-3 rounded-2xl bg-[#0d0207] border border-rose-950/70 flex items-center justify-between">
                  <span className="text-zinc-400 font-medium">Citizen Trust Index</span>
                  <span className="font-mono font-bold text-emerald-400">
                    {profile.trustScore} / 100 <span className="text-[10px] text-zinc-400 font-normal">(High Community Trust)</span>
                  </span>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setIsIdentityModalOpen(false)}
                  className="w-full py-3 rounded-2xl border border-rose-950/80 bg-rose-950/40 hover:bg-rose-900/60 text-rose-200 font-bold text-xs transition-all shadow-md"
                >
                  Close Record
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

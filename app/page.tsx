'use client';

import { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/navigation/Navbar';
import { calculateSafetyScore } from '@/lib/safety/engine';
import { Navigation, ShieldAlert, MapPin, Bot, ArrowRight, ShieldCheck, HeartPulse, Sparkles, LogOut, CheckCircle2 } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [user, setUser] = useState<any>(null);
  const safetyData = useMemo(() => calculateSafetyScore(1, new Date().getHours(), 3), []);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    let isSubscribed = true;

    // Defer router navigation until router is fully initialized after mount
    const timer = setTimeout(() => {
      if (!isSubscribed) return;

      try {
        const storedUser = localStorage.getItem('abhaya_user');
        if (!storedUser) {
          router.replace('/login');
          return;
        }
        const parsed = JSON.parse(storedUser);
        if (!parsed || parsed.is_verified !== true) {
          router.replace('/login');
        } else {
          setUser(parsed);
          setIsAuthenticated(true);
        }
      } catch {
        router.replace('/login');
      }
    }, 0);

    return () => {
      isSubscribed = false;
      clearTimeout(timer);
    };
  }, [isMounted, router]);

  const handleSignOut = () => {
    try {
      localStorage.removeItem('abhaya_user');
      sessionStorage.removeItem('abhaya_session_active');
      router.push('/login');
    } catch (err) {
      console.error('Sign out navigation error:', err);
    }
  };

  if (!isMounted || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0a0104] text-pink-50 flex flex-col items-center justify-center p-4 font-sans antialiased">
        <div className="flex flex-col items-center gap-4 animate-in fade-in duration-300">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-pink-600 to-rose-500 flex items-center justify-center font-bold text-white text-3xl shadow-2xl shadow-pink-500/40 animate-pulse">
            A
          </div>
          <div className="flex items-center gap-2 text-pink-400 text-xs font-semibold tracking-wider uppercase">
            <ShieldCheck className="w-4 h-4 animate-spin" /> Shield Engine Verifying Access...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F070C] text-pink-50 flex flex-col md:flex-row font-sans antialiased">
      <Navbar />

      <main className="flex-1 md:ml-72 p-4 md:p-8 pb-24 md:pb-8 max-w-7xl mx-auto space-y-8">
        {/* Top Header */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-rose-950/30 border border-pink-900/40 p-6 rounded-3xl backdrop-blur-md">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-pink-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Abhaya Community Protection
            </span>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white mt-1">
              Welcome to Abhaya{user?.fullName || user?.full_name ? `, ${(user.fullName || user.full_name).split(' ')[0]}` : ''}
            </h1>
            <p className="text-pink-200/70 text-sm mt-1">Your intelligent, proactive safety companion.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            {user?.is_verified && (
              <div className="flex items-center gap-1.5 bg-emerald-950/50 border border-emerald-800/40 text-emerald-300 px-3.5 py-1.5 rounded-full text-xs font-semibold shadow-sm">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Verified Resident {user.maskedId || user.masked_id ? `(${user.maskedId || user.masked_id})` : ''}</span>
              </div>
            )}
            <div className="flex items-center gap-2 bg-pink-500/10 border border-pink-500/30 text-pink-300 px-4 py-2 rounded-full text-xs font-semibold shadow-sm">
              <ShieldCheck className="w-4 h-4 text-pink-400" />
              Shield Engine Active
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 rounded-xl px-4 py-2 text-sm transition-colors border border-rose-900/40 shadow-sm"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </header>

        {/* Hero Visual Card with Imagery */}
        <div className="relative overflow-hidden bg-gradient-to-br from-rose-950/80 via-pink-950/60 to-slate-950 border border-pink-900/50 rounded-3xl p-6 md:p-8 shadow-2xl shadow-pink-950/20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center z-10 relative">
            
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-4">
              <span className="bg-pink-500/20 text-pink-300 border border-pink-500/30 text-xs font-semibold px-3.5 py-1 rounded-full inline-block">
                Live Zone Intelligence
              </span>
              <h2 className="text-3xl md:text-4xl font-black text-white leading-tight">
                Empowering Women's Mobility & Personal Security
              </h2>
              <p className="text-pink-100/80 text-sm leading-relaxed">
                Abhaya calculates live safety parameters based on nighttime illumination, crowd density, emergency proximity, and verified community reports.
              </p>

              {/* Score Display */}
              <div className="flex items-center gap-6 bg-rose-950/60 border border-pink-900/60 p-5 rounded-2xl w-fit">
                <div>
                  <span className="text-4xl font-black text-pink-400">{safetyData.score}</span>
                  <span className="text-pink-300/60 text-xs block mt-0.5 font-medium">/ 100 Safety Index</span>
                </div>
                <div className="h-10 w-[1px] bg-pink-900/60" />
                <div>
                  <span className="text-xs text-pink-300/80 block">Zone Status</span>
                  <span className="text-sm font-bold text-emerald-400">{safetyData.label}</span>
                </div>
              </div>
            </div>

            {/* Right Image Feature */}
            <div className="lg:col-span-5 relative h-64 lg:h-full rounded-2xl overflow-hidden border border-pink-800/40 shadow-xl group">
              <img
                src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=800"
                alt="Women Community Safety"
                className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 opacity-90"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-pink-950 via-pink-950/20 to-transparent" />
              <div className="absolute bottom-3 left-3 right-3 bg-pink-950/80 backdrop-blur-md border border-pink-800/50 p-2.5 rounded-xl text-xs text-pink-200 text-center font-medium">
                Verified Community Network
              </div>
            </div>

          </div>

          {/* Factor Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 pt-6 border-t border-pink-900/40">
            {safetyData.factors.map((factor, i) => (
              <div key={i} className="bg-pink-950/40 border border-pink-900/40 p-4 rounded-2xl space-y-1">
                <span className="text-xs text-pink-300/70 font-medium">{factor.name}</span>
                <p className="text-xs font-semibold text-pink-100">{factor.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Action Cards Matrix */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/journey"
            className="group bg-rose-950/20 hover:bg-rose-950/40 border border-pink-900/40 p-6 rounded-3xl transition-all duration-300 flex flex-col justify-between h-48 hover:border-pink-500/60 hover:shadow-xl hover:shadow-pink-500/10"
          >
            <div className="p-3 bg-pink-600/20 text-pink-400 rounded-2xl w-fit group-hover:scale-110 transition-transform">
              <Navigation className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white flex items-center justify-between">
                Start Safe Journey <ArrowRight className="w-4 h-4 text-pink-400 group-hover:translate-x-1 transition-all" />
              </h3>
              <p className="text-xs text-pink-200/60 mt-1">Monitored safe routes & deviation alerts.</p>
            </div>
          </Link>

          <Link
            href="/map"
            className="group bg-rose-950/20 hover:bg-rose-950/40 border border-pink-900/40 p-6 rounded-3xl transition-all duration-300 flex flex-col justify-between h-48 hover:border-rose-500/60 hover:shadow-xl hover:shadow-rose-500/10"
          >
            <div className="p-3 bg-rose-600/20 text-rose-400 rounded-2xl w-fit group-hover:scale-110 transition-transform">
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white flex items-center justify-between">
                Safety Map <ArrowRight className="w-4 h-4 text-rose-400 group-hover:translate-x-1 transition-all" />
              </h3>
              <p className="text-xs text-pink-200/60 mt-1">Interactive risk corridors & safe havens.</p>
            </div>
          </Link>

          <Link
            href="/assistant"
            className="group bg-rose-950/20 hover:bg-rose-950/40 border border-pink-900/40 p-6 rounded-3xl transition-all duration-300 flex flex-col justify-between h-48 hover:border-fuchsia-500/60 hover:shadow-xl hover:shadow-fuchsia-500/10"
          >
            <div className="p-3 bg-fuchsia-600/20 text-fuchsia-400 rounded-2xl w-fit group-hover:scale-110 transition-transform">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white flex items-center justify-between">
                SafeGuide AI <ArrowRight className="w-4 h-4 text-fuchsia-400 group-hover:translate-x-1 transition-all" />
              </h3>
              <p className="text-xs text-pink-200/60 mt-1">Contextual AI assistant for real-time help.</p>
            </div>
          </Link>

          <Link
            href="/emergency"
            className="group bg-red-950/40 hover:bg-red-950/60 border border-red-900/60 p-6 rounded-3xl transition-all duration-300 flex flex-col justify-between h-48 hover:border-red-500 hover:shadow-xl hover:shadow-red-500/20"
          >
            <div className="p-3 bg-red-600/20 text-red-400 rounded-2xl w-fit group-hover:scale-110 transition-transform">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-red-300 flex items-center justify-between">
                Emergency SOS <ArrowRight className="w-4 h-4 text-red-400 group-hover:translate-x-1 transition-all" />
              </h3>
              <p className="text-xs text-pink-200/60 mt-1">Instant one-tap SOS and contact alert.</p>
            </div>
          </Link>
        </div>
      </main>
    </div>
  );
}
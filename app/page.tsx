'use client';

import { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/navigation/Navbar';
import { calculateSafetyScore } from '@/lib/safety/engine';
import {
  ShieldAlert,
  Navigation,
  AlertTriangle,
  Users,
  MapPin,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Eye,
  Radio,
  BatteryCharging,
  Fingerprint,
  Activity,
} from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [user, setUser] = useState<any>(null);

  // Dynamic safety index calculation based on time of day & active corridor radius
  const safetyData = useMemo(() => calculateSafetyScore(1, new Date().getHours(), 3), []);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    let isSubscribed = true;

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

  if (!isMounted || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#090206] text-pink-50 flex flex-col items-center justify-center p-4 font-sans antialiased">
        <div className="flex flex-col items-center gap-4 animate-in fade-in duration-300">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-rose-600 to-pink-500 flex items-center justify-center font-bold text-white text-3xl shadow-2xl shadow-rose-600/40 animate-pulse">
            A
          </div>
          <div className="flex items-center gap-2 text-rose-400 text-xs font-semibold tracking-wider uppercase">
            <ShieldCheck className="w-4 h-4 animate-spin" /> Verifying Resident Access...
          </div>
        </div>
      </div>
    );
  }

  const firstName = user?.fullName || user?.full_name ? (user.fullName || user.full_name).split(' ')[0] : 'Resident';

  return (
    <div className="min-h-screen bg-[#090206] text-zinc-100 flex flex-col md:flex-row font-sans antialiased selection:bg-rose-900 selection:text-white">
      <Navbar />

      <main className="flex-1 md:ml-72 p-4 md:p-8 pb-28 md:pb-12 max-w-7xl mx-auto w-full space-y-8">
        {/* 1. Top Bar */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#15030c] border border-rose-950/50 p-5 md:p-6 rounded-3xl backdrop-blur-md shadow-xl">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <span className="text-xl font-black text-white tracking-wider">
                ABHAYA
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              <span className="text-xs font-medium text-zinc-400">
                Welcome back, <strong className="text-zinc-200">{firstName}</strong>
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Proactive personal security &amp; intelligent pedestrian corridor monitoring.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Safety Score Indicator */}
            <div className="flex items-center gap-3 bg-[#0d0208] border border-rose-950/80 px-4 py-2 rounded-2xl shadow-inner">
              <Activity className="w-4 h-4 text-emerald-400" />
              <div>
                <span className="text-xs font-bold text-white font-mono">
                  Safety Index: {safetyData.score || 88}/100
                </span>
                <span className="text-[10px] text-emerald-400 block leading-none font-medium">
                  {safetyData.label || 'Optimal Route Corridor'}
                </span>
              </div>
            </div>

            {/* Quick Link to Map */}
            <Link
              href="/map"
              className="px-4 py-2 rounded-2xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 text-rose-200 hover:text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-md active:scale-95"
            >
              <MapPin className="w-3.5 h-3.5 text-rose-400" />
              <span>Live Radar Map</span>
            </Link>
          </div>
        </header>

        {/* 2. Hero Emergency SOS Banner */}
        <div className="relative overflow-hidden bg-gradient-to-r from-[#22040e] via-[#1a030b] to-[#120207] border border-rose-800/60 p-6 md:p-8 rounded-3xl shadow-2xl shadow-rose-950/60 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          {/* Ambient Glow */}
          <div className="absolute -top-16 -left-16 w-48 h-48 bg-rose-600/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -right-16 w-48 h-48 bg-red-600/15 rounded-full blur-3xl pointer-events-none" />

          <div className="space-y-2 relative z-10 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
              </span>
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-rose-400 font-mono">
                Priority Dispatch Grid Active
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-white leading-snug">
              Immediate High-Threat Emergency Dispatch
            </h2>
            <p className="text-xs md:text-sm text-zinc-300/90 leading-relaxed">
              Instantly activates audible alarms, broadcasts your encrypted coordinates to emergency services, and alerts verified community guardians along your trajectory.
            </p>
          </div>

          <Link
            href="/emergency"
            className="relative z-10 w-full lg:w-auto shrink-0 bg-gradient-to-r from-red-600 via-rose-600 to-pink-600 hover:from-red-500 hover:to-pink-500 text-white font-black text-xs md:text-sm py-4 px-6 md:px-8 rounded-2xl shadow-2xl shadow-red-900/60 transition-all duration-300 flex items-center justify-center gap-3 animate-pulse active:scale-95 group border border-rose-400/40"
          >
            <ShieldAlert className="w-5 h-5 group-hover:scale-110 transition-transform text-white shrink-0" />
            <div className="text-left">
              <span className="block text-xs uppercase tracking-wider font-extrabold">
                One-Tap Emergency Dispatch
              </span>
              <span className="block text-[10px] text-rose-100/90 font-normal">
                Notifies nearby verified guardians &amp; transmits live telemetry
              </span>
            </div>
            <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform shrink-0" />
          </Link>
        </div>

        {/* 3. Functional Quick Grid (3 Cards) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1: Safe Route Navigator */}
          <Link
            href="/map"
            className="group bg-[#15030c] hover:bg-[#1c0410] border border-rose-950/50 hover:border-rose-800/80 p-6 rounded-3xl transition-all duration-300 shadow-xl flex flex-col justify-between h-52 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-28 h-28 bg-rose-600/10 rounded-full blur-2xl group-hover:bg-rose-600/20 transition-all pointer-events-none" />

            <div className="flex items-center justify-between">
              <div className="p-3 bg-gradient-to-br from-rose-950/80 to-[#280515] border border-rose-900/60 text-rose-400 rounded-2xl w-fit group-hover:scale-105 transition-transform shadow-inner">
                <Navigation className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-mono text-zinc-500 bg-[#0d0207] px-2 py-1 rounded-full border border-rose-950/60">
                Navigation
              </span>
            </div>

            <div className="space-y-1">
              <h3 className="font-bold text-base md:text-lg text-white group-hover:text-rose-200 transition-colors flex items-center justify-between">
                Safe Route Navigator
                <ArrowRight className="w-4 h-4 text-rose-400 group-hover:translate-x-1 transition-transform" />
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Calculate lit, monitored pedestrian paths.
              </p>
            </div>
          </Link>

          {/* Card 2: Active Hazard Radar */}
          <Link
            href="/report"
            className="group bg-[#15030c] hover:bg-[#1c0410] border border-rose-950/50 hover:border-rose-800/80 p-6 rounded-3xl transition-all duration-300 shadow-xl flex flex-col justify-between h-52 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-28 h-28 bg-amber-600/10 rounded-full blur-2xl group-hover:bg-amber-600/20 transition-all pointer-events-none" />

            <div className="flex items-center justify-between">
              <div className="p-3 bg-gradient-to-br from-amber-950/40 to-[#22070f] border border-rose-900/60 text-amber-400 rounded-2xl w-fit group-hover:scale-105 transition-transform shadow-inner">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-mono text-zinc-500 bg-[#0d0207] px-2 py-1 rounded-full border border-rose-950/60">
                Crowdsourced
              </span>
            </div>

            <div className="space-y-1">
              <h3 className="font-bold text-base md:text-lg text-white group-hover:text-rose-200 transition-colors flex items-center justify-between">
                Active Hazard Radar
                <ArrowRight className="w-4 h-4 text-amber-400 group-hover:translate-x-1 transition-transform" />
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                View real-time crowdsourced risk pins.
              </p>
            </div>
          </Link>

          {/* Card 3: Support Circles */}
          <Link
            href="/community"
            className="group bg-[#15030c] hover:bg-[#1c0410] border border-rose-950/50 hover:border-rose-800/80 p-6 rounded-3xl transition-all duration-300 shadow-xl flex flex-col justify-between h-52 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-28 h-28 bg-pink-600/10 rounded-full blur-2xl group-hover:bg-pink-600/20 transition-all pointer-events-none" />

            <div className="flex items-center justify-between">
              <div className="p-3 bg-gradient-to-br from-pink-950/60 to-[#280515] border border-rose-900/60 text-pink-400 rounded-2xl w-fit group-hover:scale-105 transition-transform shadow-inner">
                <Users className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-mono text-zinc-500 bg-[#0d0207] px-2 py-1 rounded-full border border-rose-950/60">
                Community
              </span>
            </div>

            <div className="space-y-1">
              <h3 className="font-bold text-base md:text-lg text-white group-hover:text-rose-200 transition-colors flex items-center justify-between">
                Support Circles
                <ArrowRight className="w-4 h-4 text-pink-400 group-hover:translate-x-1 transition-transform" />
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Join peer walk rooms or friend tracking.
              </p>
            </div>
          </Link>
        </div>

        {/* 4. Scroll-Down Section: Problems We Are Solving */}
        <section className="pt-4 space-y-6">
          <div className="space-y-1.5 border-b border-rose-950/60 pb-4">
            <span className="text-xs font-mono tracking-widest text-rose-400 uppercase bg-rose-950/60 px-2.5 py-1 rounded-full border border-rose-900/50 inline-block">
              Systemic Safety Architecture
            </span>
            <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight pt-1">
              Architected for Critical Mobility Challenges
            </h2>
            <p className="text-xs md:text-sm text-zinc-400 max-w-3xl leading-relaxed">
              Why conventional navigation engines fail pedestrian safety, and how Abhaya solves each critical vulnerability.
            </p>
          </div>

          {/* 2x2 Grid of Problem/Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Card 1: Poorly Lit & Blind Corridors */}
            <div className="bg-[#15030c] border border-rose-950/50 p-6 md:p-7 rounded-3xl shadow-xl hover:border-rose-900/60 transition-all space-y-3 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-rose-600/5 rounded-full blur-2xl group-hover:bg-rose-600/10 transition-all pointer-events-none" />

              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-[#0d0207] border border-rose-950/80 text-rose-400">
                  <Eye className="w-5 h-5" />
                </div>
                <h3 className="text-base md:text-lg font-bold text-white">
                  Poorly Lit &amp; Blind Corridors
                </h3>
              </div>

              <p className="text-xs md:text-sm text-zinc-300 leading-relaxed">
                Routes calculated not just for speed, but weighted by street illumination, business activity, and CCTV presence.
              </p>
            </div>

            {/* Card 2: Isolated Transit Risks */}
            <div className="bg-[#15030c] border border-rose-950/50 p-6 md:p-7 rounded-3xl shadow-xl hover:border-rose-900/60 transition-all space-y-3 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-600/5 rounded-full blur-2xl group-hover:bg-amber-600/10 transition-all pointer-events-none" />

              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-[#0d0207] border border-rose-950/80 text-amber-400">
                  <Radio className="w-5 h-5" />
                </div>
                <h3 className="text-base md:text-lg font-bold text-white">
                  Isolated Transit Risks
                </h3>
              </div>

              <p className="text-xs md:text-sm text-zinc-300 leading-relaxed">
                Crowdsourced hazard reporting allows verified commuters to flag suspicious activity, harassment spots, and broken municipal infrastructure.
              </p>
            </div>

            {/* Card 3: Device Power & Signal Depletion */}
            <div className="bg-[#15030c] border border-rose-950/50 p-6 md:p-7 rounded-3xl shadow-xl hover:border-rose-900/60 transition-all space-y-3 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-pink-600/5 rounded-full blur-2xl group-hover:bg-pink-600/10 transition-all pointer-events-none" />

              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-[#0d0207] border border-rose-950/80 text-pink-400">
                  <BatteryCharging className="w-5 h-5" />
                </div>
                <h3 className="text-base md:text-lg font-bold text-white">
                  Device Power &amp; Signal Depletion
                </h3>
              </div>

              <p className="text-xs md:text-sm text-zinc-300 leading-relaxed">
                Automated burst location tracking activates during route deviations or critical battery levels (&lt;20%) to safeguard the user's last known trajectory.
              </p>
            </div>

            {/* Card 4: Trust & Impersonation Prevention */}
            <div className="bg-[#15030c] border border-rose-950/50 p-6 md:p-7 rounded-3xl shadow-xl hover:border-rose-900/60 transition-all space-y-3 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-600/5 rounded-full blur-2xl group-hover:bg-emerald-600/10 transition-all pointer-events-none" />

              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-[#0d0207] border border-rose-950/80 text-emerald-400">
                  <Fingerprint className="w-5 h-5" />
                </div>
                <h3 className="text-base md:text-lg font-bold text-white">
                  Trust &amp; Impersonation Prevention
                </h3>
              </div>

              <p className="text-xs md:text-sm text-zinc-300 leading-relaxed">
                Gated resident verification with zero-knowledge tokenized identification prevents malicious actors from corrupting community alerts.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
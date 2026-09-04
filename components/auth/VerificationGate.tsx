'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';

interface VerificationGateProps {
  children: React.ReactNode;
}

export default function VerificationGate({ children }: VerificationGateProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [isVerified, setIsVerified] = useState<boolean | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    // Skip verification guard for the login page
    if (pathname === '/login') {
      setIsVerified(true);
      return;
    }

    let isSubscribed = true;

    // Defer router navigation until router is fully initialized after mount
    const timer = setTimeout(() => {
      if (!isSubscribed) return;

      try {
        const stored = localStorage.getItem('abhaya_user');
        if (!stored) {
          setIsVerified(false);
          router.replace('/login');
          return;
        }

        const user = JSON.parse(stored);
        if (user && user.is_verified === true) {
          setIsVerified(true);
        } else {
          setIsVerified(false);
          router.replace('/login');
        }
      } catch {
        setIsVerified(false);
        router.replace('/login');
      }
    }, 0);

    return () => {
      isSubscribed = false;
      clearTimeout(timer);
    };
  }, [isMounted, pathname, router]);

  // Render /login directly without gate check
  if (pathname === '/login') {
    return <>{children}</>;
  }

  // Prevent rendering dashboard, route monitoring, incident mapping, or SOS UI until verified
  if (isVerified !== true) {
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

  return <>{children}</>;
}

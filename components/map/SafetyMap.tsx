'use client';

import dynamic from 'next/dynamic';
import React from 'react';
import type { SafetyMapProps } from './SafetyMapInner';

export type { SafetyMapProps, HazardItem } from './SafetyMapInner';

// Dynamically import Leaflet map implementation with SSR strictly disabled
const SafetyMap = dynamic(() => import('./SafetyMapInner'), {
  ssr: false,
  loading: () => (
    <div className="relative w-full h-full min-h-[400px] rounded-3xl overflow-hidden border border-rose-950/40 bg-[#0a0104] flex flex-col items-center justify-center p-6 text-center shadow-2xl">
      <div className="relative flex items-center justify-center mb-4">
        <span className="absolute w-12 h-12 rounded-full bg-rose-500/20 animate-ping" />
        <span className="absolute w-8 h-8 rounded-full bg-rose-500/40 animate-pulse" />
        <div className="relative w-5 h-5 rounded-full bg-rose-600 border-2 border-white shadow-lg" />
      </div>
      <span className="text-xs font-semibold text-rose-300 tracking-wider uppercase">
        Initializing Abhaya Dark Matter Map...
      </span>
      <span className="text-[11px] text-zinc-500 mt-1 font-mono">
        CartoDB Dark Matter • Live Telemetry
      </span>
    </div>
  ),
});

export default SafetyMap;

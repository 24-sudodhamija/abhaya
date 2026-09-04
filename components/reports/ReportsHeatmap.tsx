'use client';

import dynamic from 'next/dynamic';
import React from 'react';
import type { ReportsHeatmapProps, ReportItem } from './ReportsHeatmapInner';

export type { ReportsHeatmapProps, ReportItem } from './ReportsHeatmapInner';

const ReportsHeatmap = dynamic(() => import('./ReportsHeatmapInner'), {
  ssr: false,
  loading: () => (
    <div className="relative w-full h-full min-h-[420px] rounded-3xl overflow-hidden border border-rose-950/50 bg-[#0a0104] flex flex-col items-center justify-center p-6 text-center shadow-2xl">
      <div className="relative flex items-center justify-center mb-4">
        <span className="absolute w-12 h-12 rounded-full bg-rose-500/20 animate-ping" />
        <span className="absolute w-8 h-8 rounded-full bg-rose-500/40 animate-pulse" />
        <div className="relative w-5 h-5 rounded-full bg-rose-600 border-2 border-white shadow-lg" />
      </div>
      <span className="text-xs font-semibold text-rose-300 tracking-wider uppercase">
        Loading Crowdsourced Heatmap Layer...
      </span>
      <span className="text-[11px] text-zinc-500 mt-1 font-mono">
        L.heatLayer • Gradient Telemetry Active
      </span>
    </div>
  ),
});

export default ReportsHeatmap;

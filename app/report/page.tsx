'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/navigation/Navbar';
import ReportsHeatmap, { ReportItem } from '@/components/reports/ReportsHeatmap';
import CreateReportModal from '@/components/reports/CreateReportModal';
import {
  AlertTriangle,
  ShieldCheck,
  MapPin,
  Clock,
  ThumbsUp,
  Filter,
  Search,
  Plus,
  X,
  Flame,
  Maximize2,
  RefreshCw,
  Layers,
  Sparkles,
} from 'lucide-react';

type FilterType = 'All' | 'High Risk' | 'Infrastructure' | 'Street Lighting';

function formatRelativeTime(dateString?: string): string {
  if (!dateString) return 'Recently';
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSec < 60) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch {
    return 'Recently';
  }
}

export default function ReportsExplorerPage() {
  const router = useRouter();

  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  // Reports Data
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Active Selections & Filters
  const [activeReportId, setActiveReportId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterType>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);

  // Modal & Lightbox
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [modalCoords, setModalCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Card list ref for auto-scrolling to active report
  const cardListRef = useRef<HTMLDivElement | null>(null);

  // 1. Mount & Auth Guard
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

  // 2. Fetch User Geolocation
  useEffect(() => {
    if (!isAuthenticated) return;
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation([pos.coords.latitude, pos.coords.longitude]),
        () => setUserLocation([28.6139, 77.209]) // Default Delhi
      );
    }
  }, [isAuthenticated]);

  // 3. Fetch Reports from /api/reports
  const fetchReports = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const res = await fetch('/api/reports');
      const data = await res.json();
      if (data.success && Array.isArray(data.reports)) {
        setReports(data.reports);
      }
    } catch (err) {
      console.error('Failed to fetch reports:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchReports();
    }
  }, [isAuthenticated, fetchReports]);

  // 4. Filtered Reports List
  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      // Risk filter
      if (activeFilter === 'High Risk') {
        const risk = (report.riskLevel || report.risk_level || '').toUpperCase();
        if (risk !== 'HIGH') return false;
      }
      // Infrastructure filter
      if (activeFilter === 'Infrastructure') {
        const cat = (report.category || '').toLowerCase();
        if (!cat.includes('infrastructure')) return false;
      }
      // Street Lighting filter
      if (activeFilter === 'Street Lighting') {
        const cat = (report.category || '').toLowerCase();
        if (!cat.includes('lighting')) return false;
      }
      // Text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = report.title?.toLowerCase().includes(q);
        const matchDesc = report.description?.toLowerCase().includes(q);
        if (!matchTitle && !matchDesc) return false;
      }
      return true;
    });
  }, [reports, activeFilter, searchQuery]);

  // 5. Select Report on Map or Feed
  const handleSelectReport = (reportId: string) => {
    setActiveReportId(reportId);

    // Scroll corresponding card into view in the right panel
    const element = document.getElementById(`report-card-${reportId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  // Verification Warning State
  const [verificationError, setVerificationError] = useState<string | null>(null);

  // 6. Validates is_verified === true before opening report submission modal
  const handleOpenFileReport = (coords?: { lat: number; lng: number } | null) => {
    try {
      const stored = localStorage.getItem('abhaya_user');
      if (!stored) {
        router.push('/login');
        return;
      }
      const user = JSON.parse(stored);
      if (!user || user.is_verified !== true) {
        setVerificationError(
          'Identity Verification Required: Only verified residents with active ledger credentials can submit hazard reports.'
        );
        return;
      }

      setVerificationError(null);
      setModalCoords(coords || (userLocation ? { lat: userLocation[0], lng: userLocation[1] } : null));
      setIsCreateModalOpen(true);
    } catch {
      router.push('/login');
    }
  };

  // Map Click -> Set selectedCoords and open modal for verified user
  const handleMapClick = (coords: { lat: number; lng: number }) => {
    handleOpenFileReport(coords);
  };

  // 7. Endorse Hazard (+1 verification_count)
  const handleEndorse = async (reportId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    // Optimistic UI update
    setReports((prev) =>
      prev.map((r) =>
        r.id === reportId
          ? {
              ...r,
              verificationCount: (r.verificationCount ?? r.verification_count ?? 0) + 1,
              verification_count: (r.verificationCount ?? r.verification_count ?? 0) + 1,
            }
          : r
      )
    );

    try {
      await fetch('/api/reports', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId }),
      });
    } catch (err) {
      console.warn('Endorsement sync warning:', err);
    }
  };

  // Auth Loading View
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0a0104] text-rose-50 flex flex-col items-center justify-center p-4 font-sans antialiased">
        <div className="flex flex-col items-center gap-4 animate-in fade-in duration-300">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-rose-600 to-pink-600 flex items-center justify-center font-bold text-white text-3xl shadow-2xl shadow-rose-600/40 animate-pulse">
            A
          </div>
          <div className="flex items-center gap-2 text-rose-400 text-xs font-semibold tracking-wider uppercase">
            <ShieldCheck className="w-4 h-4 animate-spin text-rose-500" />
            Verifying Citizen Credentials...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0104] text-zinc-100 flex flex-col md:flex-row font-sans antialiased relative selection:bg-rose-900 selection:text-white">
      <Navbar />

      <main className="flex-1 md:ml-72 p-3 md:p-6 pb-28 md:pb-8 max-w-7xl mx-auto space-y-5">
        {/* Verification Warning Toast Banner */}
        {verificationError && (
          <div className="bg-gradient-to-r from-rose-950 via-[#2a0613] to-rose-950 border border-rose-600/80 text-rose-100 p-4 rounded-2xl shadow-2xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top duration-300">
            <div className="flex items-center gap-2.5 text-xs font-semibold">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
              <span>{verificationError}</span>
            </div>
            <button
              onClick={() => setVerificationError(null)}
              className="p-1 text-rose-400 hover:text-white shrink-0"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Top Header */}
        <header className="flex flex-wrap justify-between items-center gap-4 bg-[#14040c]/90 border border-rose-950/60 p-4 md:p-5 rounded-3xl backdrop-blur-xl shadow-xl">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-gradient-to-br from-rose-600 to-pink-600 rounded-2xl text-white shadow-lg shadow-rose-950/60">
              <Flame className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black tracking-tight text-white">
                  Crowdsourced Safety Heatmap
                </h1>
                <span className="text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full bg-rose-950/70 text-rose-300 border border-rose-900/50">
                  L.heatLayer Active
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Real-time citizen-reported hazard clusters, infrastructure faults, and street verification.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => fetchReports(true)}
              disabled={isRefreshing}
              className="px-3.5 py-2 rounded-2xl bg-[#1d0511] hover:bg-[#280718] border border-rose-950/70 text-xs text-rose-300 font-semibold transition-colors flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <div className="px-3.5 py-2 rounded-2xl bg-[#1d0511] border border-rose-950/70 text-xs font-mono text-zinc-400">
              Active Hazard Nodes: <strong className="text-white">{reports.length}</strong>
            </div>
          </div>
        </header>

        {/* 1. Split-View Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Panel: Map & Heatmap Layer (7 Cols) */}
          <div className="lg:col-span-7 bg-[#14040c]/90 border border-rose-950/60 rounded-3xl p-3 md:p-4 shadow-2xl relative space-y-3">
            <div className="h-[480px] md:h-[620px] w-full rounded-2xl overflow-hidden relative border border-rose-950/40">
              <ReportsHeatmap
                reports={reports}
                activeReportId={activeReportId}
                onSelectReport={handleSelectReport}
                onMapClick={handleMapClick}
                userLocation={userLocation}
                className="w-full h-full"
              />

              {/* Map floating prompt overlay */}
              <div className="absolute top-3 left-3 right-3 z-[400] flex items-center justify-between pointer-events-none">
                <div className="pointer-events-auto bg-[#14040c]/90 backdrop-blur-md border border-rose-950/80 px-3 py-1.5 rounded-xl text-[11px] text-zinc-300 font-mono flex items-center gap-2 shadow-lg">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                  <span>Tap anywhere on the map to drop a verified report pin</span>
                </div>
              </div>

              {/* Heatmap Gradient Legend Overlay */}
              <div className="absolute bottom-3 left-3 z-[400] bg-[#0e0208]/90 backdrop-blur-md border border-rose-950/80 p-2.5 rounded-2xl text-[11px] font-mono shadow-xl space-y-1.5 max-w-[240px]">
                <span className="text-[10px] uppercase font-bold text-zinc-400 block">
                  Hazard Density Gradient
                </span>
                <div className="h-2 w-full rounded-full bg-gradient-to-r from-[#3b82f6] via-[#facc15] via-[#f43f5e] to-[#e11d48]" />
                <div className="flex justify-between text-[10px] text-zinc-400">
                  <span>Low (0.2)</span>
                  <span>Med (0.6)</span>
                  <span>High (1.0)</span>
                </div>
              </div>
            </div>

            {/* Map Status Bar */}
            <div className="flex items-center justify-between text-xs text-zinc-400 px-2">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#f43f5e]" /> High Threat
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" /> Medium Risk
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#38bdf8]" /> Low Risk
                </span>
              </div>
              <span className="text-[11px] text-zinc-500 font-mono">
                Click pin to highlight
              </span>
            </div>
          </div>

          {/* Right Panel: Community Report Feed (5 Cols) */}
          <div className="lg:col-span-5 bg-[#14040c]/90 border border-rose-950/60 rounded-3xl p-4 md:p-5 shadow-2xl space-y-4">
            {/* Filter Pills Header */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Layers className="w-4 h-4 text-rose-500" />
                  Community Incident Feed
                </h2>
                <span className="text-xs text-zinc-400 font-mono">
                  {filteredReports.length} Shown
                </span>
              </div>

              {/* Filter Pills */}
              <div className="flex flex-wrap gap-2">
                {(['All', 'High Risk', 'Infrastructure', 'Street Lighting'] as FilterType[]).map((pill) => {
                  const isSelected = activeFilter === pill;
                  return (
                    <button
                      key={pill}
                      onClick={() => setActiveFilter(pill)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                        isSelected
                          ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white border-rose-400 shadow-md shadow-rose-950/50'
                          : 'bg-[#0e0208] text-zinc-400 border-rose-950/70 hover:border-rose-900/60 hover:text-zinc-200'
                      }`}
                    >
                      {pill}
                    </button>
                  );
                })}
              </div>

              {/* Search Box */}
              <div className="relative">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter by keyword or location..."
                  className="w-full bg-[#0d0207] border border-rose-950/80 rounded-2xl pl-10 pr-4 py-2 text-xs text-zinc-200 placeholder-zinc-600 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Scrollable Report Card List */}
            <div
              ref={cardListRef}
              className="space-y-3 max-h-[480px] md:max-h-[500px] overflow-y-auto pr-1 custom-scrollbar"
            >
              {isLoading ? (
                <div className="py-12 text-center text-zinc-500 text-xs flex flex-col items-center gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin text-rose-500" />
                  <span>Loading crowdsourced reports...</span>
                </div>
              ) : reports.length === 0 ? (
                /* Zero-State Handling when database query returns 0 hazard reports */
                <div className="py-12 px-6 text-center border border-dashed border-rose-950/80 rounded-3xl bg-[#0e0208]/60 flex flex-col items-center justify-center space-y-4 animate-in fade-in duration-300">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-950/50 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
                    <ShieldCheck className="w-7 h-7 text-emerald-400" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm md:text-base font-bold text-white tracking-tight">
                      No verified reports in this vicinity.
                    </h3>
                    <p className="text-xs text-zinc-400 max-w-xs mx-auto leading-relaxed">
                      Local safety index is optimal. All community corridors clear.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenFileReport()}
                    className="mt-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-bold text-xs shadow-lg shadow-rose-950/60 transition-all flex items-center gap-2 active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Report New Infrastructure Issue or Hazard</span>
                  </button>
                </div>
              ) : filteredReports.length === 0 ? (
                /* When reports exist in DB but active filter yields 0 matches */
                <div className="py-10 px-6 text-center border border-dashed border-rose-950/80 rounded-2xl bg-[#0e0208]/40 space-y-3">
                  <AlertTriangle className="w-8 h-8 text-rose-500/40 mx-auto" />
                  <p className="font-semibold text-zinc-300 text-xs">No reports matching this filter</p>
                  <p className="text-[11px] text-zinc-500 max-w-xs mx-auto">
                    Try choosing 'All' or click anywhere on the map to pin a new observation.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveFilter('All');
                      setSearchQuery('');
                    }}
                    className="px-3.5 py-1 rounded-xl bg-rose-950/60 text-rose-300 border border-rose-900/60 text-xs font-semibold hover:bg-rose-900/80 transition-colors"
                  >
                    Reset Filter
                  </button>
                </div>
              ) : (
                filteredReports.map((report) => {
                  const isSelected = report.id === activeReportId;
                  const risk = (report.riskLevel || report.risk_level || 'MEDIUM').toUpperCase();
                  const photo = report.imageUrl || report.image_url;
                  const endorsementCount = report.verificationCount ?? report.verification_count ?? 1;

                  return (
                    <div
                      key={report.id}
                      id={`report-card-${report.id}`}
                      onClick={() => handleSelectReport(report.id)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2.5 ${
                        isSelected
                          ? 'bg-[#200513] border-rose-500 shadow-xl shadow-rose-950/70 ring-1 ring-rose-500/80'
                          : 'bg-[#0e0208] border-rose-950/70 hover:border-rose-900/80 hover:bg-[#15040d]'
                      }`}
                    >
                      {/* Top Bar: Risk Tag, Category & Relative Timestamp */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                              risk === 'HIGH'
                                ? 'bg-rose-950/80 text-rose-300 border-rose-700'
                                : risk === 'LOW'
                                ? 'bg-zinc-800 text-zinc-300 border-zinc-700'
                                : 'bg-amber-950/80 text-amber-300 border-amber-700'
                            }`}
                          >
                            {risk} Risk
                          </span>
                          <span className="text-[11px] text-zinc-400 font-mono truncate max-w-[130px]">
                            {report.category}
                          </span>
                        </div>

                        <span className="text-[11px] text-zinc-500 font-mono flex items-center gap-1 shrink-0">
                          <Clock className="w-3 h-3" />
                          {formatRelativeTime(report.createdAt || report.created_at)}
                        </span>
                      </div>

                      {/* Title & Description */}
                      <div className="space-y-1">
                        <h3 className="text-sm font-bold text-white leading-tight">
                          {report.title}
                        </h3>
                        {report.description && (
                          <p className="text-xs text-zinc-300 leading-relaxed line-clamp-2">
                            {report.description}
                          </p>
                        )}
                      </div>

                      {/* Photo Thumbnail with Lightbox trigger */}
                      {photo && (
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            setLightboxImage(photo);
                          }}
                          className="relative group rounded-xl overflow-hidden border border-rose-950/80 h-28 w-full bg-black/40 cursor-zoom-in"
                        >
                          <img
                            src={photo}
                            alt={report.title}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-1.5 backdrop-blur-[2px]">
                            <Maximize2 className="w-3.5 h-3.5" /> Click to Expand Proof
                          </div>
                        </div>
                      )}

                      {/* Reporter Badge & Confirm (+1) Action */}
                      <div className="pt-2 border-t border-rose-950/60 flex items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-1.5 min-w-0 text-zinc-400 text-[11px]">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span className="truncate">
                            Reported by <strong className="text-zinc-200">{report.reporter?.fullName || 'Verified Resident'}</strong>
                            {report.reporter?.maskedId ? ` (${report.reporter.maskedId})` : ''}
                          </span>
                        </div>

                        {/* Endorse Button */}
                        <button
                          type="button"
                          onClick={(e) => handleEndorse(report.id, e)}
                          title="Endorse this hazard to increase community vigilance"
                          className="px-2.5 py-1 rounded-xl bg-rose-950/50 hover:bg-rose-900/60 border border-rose-900/60 hover:border-rose-700 text-rose-300 text-[11px] font-bold font-mono transition-all flex items-center gap-1.5 shrink-0"
                        >
                          <ThumbsUp className="w-3 h-3 text-rose-400" />
                          <span>Confirm ({endorsementCount})</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </main>

      {/* 2. Floating Action Button: File Hazard Report */}
      <button
        onClick={() => handleOpenFileReport()}
        className="fixed bottom-6 right-6 z-40 bg-gradient-to-r from-rose-600 via-rose-500 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-black text-xs md:text-sm uppercase tracking-wider px-5 py-4 rounded-full shadow-2xl shadow-rose-950/90 border border-rose-400/40 flex items-center gap-2.5 transition-all transform active:scale-95 hover:shadow-rose-600/30"
      >
        <Plus className="w-5 h-5 stroke-[2.5]" />
        <span>File Hazard Report</span>
      </button>

      {/* Create Report Modal */}
      <CreateReportModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onReportCreated={() => {
          fetchReports();
        }}
        selectedCoords={modalCoords}
      />

      {/* Lightbox Modal */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 p-4 flex items-center justify-center backdrop-blur-md animate-in fade-in"
          onClick={() => setLightboxImage(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="relative max-w-3xl max-h-[85vh] rounded-3xl overflow-hidden border border-rose-900/70 bg-[#14040c] p-2 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/70 text-zinc-300 hover:text-white hover:bg-black/90 transition-colors"
              aria-label="Close image"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={lightboxImage}
              alt="Expanded evidence proof"
              className="w-full max-h-[80vh] object-contain rounded-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}

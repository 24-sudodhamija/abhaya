'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Camera,
  Upload,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  MapPin,
  Loader2,
  Trash2,
  Lock,
  ArrowRight,
  CheckCircle2,
  FileImage,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export interface CreateReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReportCreated: () => void;
  selectedCoords: { lat: number; lng: number } | null;
}

const CATEGORIES = [
  { id: 'Lighting Fault', label: 'Lighting Fault', icon: '💡' },
  { id: 'Infrastructure Flaw', label: 'Infrastructure Flaw', icon: '🚧' },
  { id: 'Suspicious Activity', label: 'Suspicious Activity', icon: '👁️' },
  { id: 'Harassment Zone', label: 'Harassment Zone', icon: '⚠️' },
];

const RISK_LEVELS: Array<{
  id: 'LOW' | 'MEDIUM' | 'HIGH';
  label: string;
  activeClass: string;
  badgeClass: string;
}> = [
  {
    id: 'LOW',
    label: 'LOW',
    activeClass: 'bg-zinc-800 text-zinc-200 border-zinc-600 shadow-md shadow-zinc-900/50',
    badgeClass: 'text-zinc-400 border-zinc-700 bg-zinc-900/60',
  },
  {
    id: 'MEDIUM',
    label: 'MEDIUM',
    activeClass: 'bg-amber-950/80 text-amber-300 border-amber-500 shadow-md shadow-amber-950/60',
    badgeClass: 'text-amber-400 border-amber-800 bg-amber-950/40',
  },
  {
    id: 'HIGH',
    label: 'HIGH',
    activeClass: 'bg-rose-950 text-rose-200 border-rose-500 shadow-md shadow-rose-950/70',
    badgeClass: 'text-rose-400 border-rose-800 bg-rose-950/40',
  },
];

/**
 * Client-side HTML Canvas image compression to ~200KB
 */
async function compressImageToMaxKb(file: File, maxKb = 200): Promise<{ dataUrl: string; sizeKb: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to decode image'));
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 1200;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          const raw = reader.result as string;
          const kb = Math.round((raw.length * 3) / 4 / 1024);
          return resolve({ dataUrl: raw, sizeKb: kb });
        }

        ctx.drawImage(img, 0, 0, width, height);

        let quality = 0.82;
        let dataUrl = canvas.toDataURL('image/jpeg', quality);
        let sizeKb = Math.round((dataUrl.length * 3) / 4 / 1024);

        while (sizeKb > maxKb && quality > 0.25) {
          quality -= 0.15;
          dataUrl = canvas.toDataURL('image/jpeg', quality);
          sizeKb = Math.round((dataUrl.length * 3) / 4 / 1024);
        }

        resolve({ dataUrl, sizeKb });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export default function CreateReportModal({
  isOpen,
  onClose,
  onReportCreated,
  selectedCoords,
}: CreateReportModalProps) {
  const router = useRouter();

  // User Verification State
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isVerified, setIsVerified] = useState<boolean>(false);

  // Form States
  const [category, setCategory] = useState<string>('Lighting Fault');
  const [riskLevel, setRiskLevel] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Image Capture States
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageSizeKb, setImageSizeKb] = useState<number | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Submission States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // 1. Verification Check on Mount & Modal Open
  useEffect(() => {
    if (!isOpen) return;

    try {
      const stored = localStorage.getItem('abhaya_user');
      if (stored) {
        const user = JSON.parse(stored);
        setCurrentUser(user);
        setIsVerified(user?.is_verified === true);
      } else {
        setCurrentUser(null);
        setIsVerified(false);
      }
    } catch {
      setIsVerified(false);
    }

    // Initialize or update coordinates
    if (selectedCoords) {
      setCoords(selectedCoords);
    } else if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setCoords({ lat: 28.6139, lng: 77.209 }) // Default New Delhi center
      );
    } else {
      setCoords({ lat: 28.6139, lng: 77.209 });
    }

    // Reset transient submission state
    setError(null);
    setSuccess(false);
  }, [isOpen, selectedCoords]);

  // Handle Photo Capture / Selection
  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressing(true);
    setError(null);

    try {
      const { dataUrl, sizeKb } = await compressImageToMaxKb(file, 200);
      setImagePreview(dataUrl);
      setImageSizeKb(sizeKb);
    } catch (err: any) {
      console.error('Image compression error:', err);
      setError('Could not process captured image. Please try again.');
    } finally {
      setIsCompressing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = () => {
    setImagePreview(null);
    setImageSizeKb(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Form Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isVerified || !currentUser?.id) {
      setError('Only verified residents can submit safety reports.');
      return;
    }

    if (!title.trim()) {
      setError('Please provide a brief title for this hazard.');
      return;
    }

    if (!coords) {
      setError('Location coordinates are missing. Please tap on the map.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          title: title.trim(),
          description: description.trim(),
          category,
          riskLevel,
          lat: coords.lat,
          lng: coords.lng,
          imageBase64: imagePreview,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to publish community safety report.');
      }

      setSuccess(true);
      setTimeout(() => {
        onReportCreated();
        onClose();
        // Reset form
        setTitle('');
        setDescription('');
        setImagePreview(null);
        setImageSizeKb(null);
        setSuccess(false);
      }, 800);
    } catch (err: any) {
      setError(err?.message || 'Failed to submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg rounded-3xl border border-rose-950/70 bg-[#14040c] p-6 md:p-7 shadow-2xl text-zinc-100 relative my-8">
        {/* Header Bar */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-rose-950/60 border border-rose-900/60 rounded-2xl text-rose-400 shadow-inner">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <span className="text-rose-400 bg-rose-950/40 border border-rose-900/40 rounded-full px-3 py-0.5 text-xs font-semibold inline-block mb-1">
                Community Sentinel
              </span>
              <h2 className="text-xl font-bold text-white tracking-tight">
                Publish Safety Report
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-rose-950/50 rounded-xl transition-colors disabled:opacity-50"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. Verification Enforcement: Locked State if Unverified */}
        {!isVerified ? (
          <div className="mt-6 p-6 rounded-2xl border border-amber-900/60 bg-amber-950/30 text-center space-y-4 animate-in fade-in">
            <div className="w-14 h-14 rounded-2xl bg-amber-950/70 border border-amber-700/60 text-amber-400 flex items-center justify-center mx-auto shadow-lg">
              <Lock className="w-7 h-7" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-amber-200">
                Citizen Verification Required to Publish Reports
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed max-w-md mx-auto">
                Abhaya uses Aadhaar-grade citizen verification to eliminate spam, trolls, and falsified alarms. Only verified residents can pin public hazard zones.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                onClose();
                router.push('/login');
              }}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-semibold rounded-2xl shadow-lg shadow-rose-950/50 transition-all flex items-center justify-center gap-2 text-sm"
            >
              <span>Verify National Identity on Login</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          /* Form for Verified Users */
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            {/* Verified Reporter Chip */}
            <div className="flex items-center justify-between bg-[#0d0207] border border-rose-950/80 rounded-2xl px-3.5 py-2 text-xs">
              <div className="flex items-center gap-2 text-zinc-400">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Reporter: <strong className="text-white">{currentUser?.fullName}</strong></span>
              </div>
              <span className="text-[11px] font-mono text-rose-300 bg-rose-950/60 border border-rose-900/50 px-2 py-0.5 rounded-full">
                {currentUser?.maskedId || 'VERIFIED'}
              </span>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="flex items-start gap-2.5 rounded-2xl border border-rose-800/80 bg-rose-950/60 p-3 text-xs text-rose-200 animate-in fade-in">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span className="leading-snug">{error}</span>
              </div>
            )}

            {/* Success Banner */}
            {success && (
              <div className="flex items-center gap-2.5 rounded-2xl border border-emerald-800/80 bg-emerald-950/60 p-3 text-xs text-emerald-200 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Report published successfully to Abhaya Hazard Grid!</span>
              </div>
            )}

            {/* Category Selector Pill Buttons */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                Hazard Category
              </label>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIES.map((cat) => {
                  const isSelected = category === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id)}
                      className={`px-3 py-2.5 rounded-2xl text-xs font-semibold border transition-all flex items-center gap-2 ${
                        isSelected
                          ? 'bg-gradient-to-r from-rose-950 to-[#290817] text-rose-200 border-rose-500 shadow-md shadow-rose-950/50'
                          : 'bg-[#0d0207] text-zinc-400 border-rose-950/70 hover:border-rose-900/60 hover:text-zinc-200'
                      }`}
                    >
                      <span>{cat.icon}</span>
                      <span className="truncate">{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Risk Level Toggle */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                Threat &amp; Risk Severity
              </label>
              <div className="grid grid-cols-3 gap-2">
                {RISK_LEVELS.map((rl) => {
                  const isSelected = riskLevel === rl.id;
                  return (
                    <button
                      key={rl.id}
                      type="button"
                      onClick={() => setRiskLevel(rl.id)}
                      className={`py-2.5 rounded-2xl text-xs font-extrabold border transition-all tracking-wider ${
                        isSelected
                          ? rl.activeClass
                          : 'bg-[#0d0207] text-zinc-500 border-rose-950/70 hover:border-rose-900/60'
                      }`}
                    >
                      {rl.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Title Input */}
            <div className="space-y-1">
              <label htmlFor="reportTitle" className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                Report Title
              </label>
              <input
                id="reportTitle"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Non-functional streetlights near metro Gate 2"
                maxLength={90}
                required
                className="w-full bg-[#0d0207] border border-rose-950/80 rounded-2xl px-4 py-3 text-zinc-100 placeholder-zinc-600 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none text-sm"
              />
            </div>

            {/* Description Textarea */}
            <div className="space-y-1">
              <label htmlFor="reportDesc" className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                Detailed Observation
              </label>
              <textarea
                id="reportDesc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe lighting condition, lack of CCTV, dark corridors, or any suspicious activity observed..."
                rows={2}
                className="w-full bg-[#0d0207] border border-rose-950/80 rounded-2xl px-4 py-2.5 text-zinc-100 placeholder-zinc-600 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none text-xs resize-none"
              />
            </div>

            {/* 2. Camera & Photo Capture with Canvas Compression */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                Evidence Photo Proof (Optional)
              </label>

              {/* Hidden HTML5 camera input */}
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                capture="environment"
                onChange={handlePhotoCapture}
                className="hidden"
              />

              {imagePreview ? (
                <div className="relative rounded-2xl overflow-hidden border border-rose-900/60 bg-[#0d0207] p-2 flex items-center gap-3">
                  <img
                    src={imagePreview}
                    alt="Captured proof"
                    className="w-16 h-16 rounded-xl object-cover border border-rose-950/80 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-semibold text-white flex items-center gap-1.5 truncate">
                      <FileImage className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      Optimized Evidence Photo
                    </span>
                    <span className="text-[11px] text-zinc-400 font-mono block mt-0.5">
                      Canvas compressed: ~{imageSizeKb ?? 180} KB
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="p-2 rounded-xl text-rose-400 hover:text-rose-200 hover:bg-rose-950/60 transition-colors"
                    title="Remove photo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isCompressing}
                  className="w-full py-3 px-4 rounded-2xl border border-dashed border-rose-950 hover:border-rose-700 bg-[#0d0207]/60 hover:bg-[#18040d]/80 text-zinc-400 hover:text-zinc-200 transition-all flex items-center justify-center gap-2 text-xs"
                >
                  {isCompressing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-rose-400" />
                      <span>Optimizing Photo Proof...</span>
                    </>
                  ) : (
                    <>
                      <Camera className="w-4 h-4 text-rose-400" />
                      <span>Snap Photo Proof / Choose Image</span>
                      <span className="text-[10px] text-zinc-500 font-mono">(auto ~200KB)</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Coordinates Display */}
            <div className="flex items-center justify-between text-xs bg-[#0d0207] border border-rose-950/60 rounded-2xl px-3.5 py-2.5 text-zinc-400 font-mono">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-rose-400" />
                Target Coordinates:
              </span>
              <span className="text-zinc-200 font-bold">
                {coords ? `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : 'Detecting GPS...'}
              </span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || isCompressing || !title.trim()}
              className="w-full py-3.5 bg-gradient-to-r from-rose-600 via-rose-500 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-bold rounded-2xl shadow-xl shadow-rose-950/50 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Publishing to Abhaya Grid...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Publish Verified Hazard Report</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

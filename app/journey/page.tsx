'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/navigation/Navbar';
import { Navigation, AlertTriangle, ShieldCheck, MapPin, Clock, Phone, ShieldAlert, CheckCircle2 } from 'lucide-react';

export default function JourneyPage() {
  const [journeyState, setJourneyState] = useState<'idle' | 'active' | 'warning' | 'sos'>('idle');
  const [destination, setDestination] = useState('Connaught Place Gate 2');
  const [eta, setEta] = useState(18);
  const [progress, setProgress] = useState(0);
  const [deviationAlert, setDeviationAlert] = useState(false);

  // Simulated Journey Progress & Deviation Timer
  useEffect(() => {
    if (journeyState !== 'active') return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          setJourneyState('idle');
          return 0;
        }
        if (prev === 40) {
          setDeviationAlert(true);
          setJourneyState('warning');
        }
        return prev + 10;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [journeyState]);

  const startJourney = () => {
    setJourneyState('active');
    setProgress(10);
    setDeviationAlert(false);
  };

  const handleImSafe = () => {
    setDeviationAlert(false);
    setJourneyState('active');
  };

  return (
    <div className="min-h-screen bg-[#070A0F] text-slate-100 flex flex-col md:flex-row font-sans antialiased">
      <Navbar />

      <main className="flex-1 md:ml-72 p-4 md:p-8 pb-24 md:pb-8 max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <header className="flex justify-between items-center bg-slate-900/60 border border-slate-800/80 p-5 rounded-3xl backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600/20 text-blue-400 rounded-2xl">
              <Navigation className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Safe Journey Engine</h1>
              <p className="text-xs text-slate-400">Automated Route Monitoring & Contextual Check-Ins</p>
            </div>
          </div>
          <span className={`px-3.5 py-1 rounded-full text-xs font-bold border ${
            journeyState === 'active' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
            journeyState === 'warning' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30 animate-pulse' :
            'bg-slate-800 text-slate-400 border-slate-700'
          }`}>
            {journeyState === 'active' ? '● Monitoring Active' : journeyState === 'warning' ? '⚠️ Deviation Detected' : 'Idle'}
          </span>
        </header>

        {/* Route Deviation Warning Overlay */}
        {deviationAlert && (
          <div className="bg-amber-500/10 border-2 border-amber-500/50 p-6 rounded-3xl space-y-4 animate-in slide-in-from-top duration-300">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-500/20 text-amber-400 rounded-2xl">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg">Unusual Route Deviation Detected</h3>
                  <p className="text-xs text-slate-300 mt-0.5">Your location moved 180m off the recommended safe corridor near Janpath.</p>
                </div>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleImSafe}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" /> I'm Safe
              </button>
              <button
                onClick={() => setJourneyState('sos')}
                className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl transition-all shadow-lg shadow-red-600/20 flex items-center justify-center gap-2"
              >
                <ShieldAlert className="w-4 h-4" /> Request Emergency Assistance
              </button>
            </div>
          </div>
        )}

        {/* Journey Control Console */}
        <div className="bg-slate-900/60 border border-slate-800/80 p-6 rounded-3xl space-y-6">
          <div className="space-y-4">
            <label className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Destination</label>
            <div className="flex items-center gap-3 bg-slate-950/80 border border-slate-800 p-3.5 rounded-2xl">
              <MapPin className="w-5 h-5 text-blue-400 shrink-0" />
              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                disabled={journeyState === 'active'}
                className="bg-transparent border-none outline-none text-white text-sm w-full font-medium"
              />
            </div>
          </div>

          {journeyState === 'idle' ? (
            <button
              onClick={startJourney}
              className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl shadow-xl shadow-blue-600/25 transition-all text-sm flex items-center justify-center gap-2"
            >
              <Navigation className="w-5 h-5" /> Start Safe Journey Tracker
            </button>
          ) : (
            <div className="space-y-4 pt-2">
              <div className="flex justify-between text-xs text-slate-400 font-medium">
                <span>Journey Progress</span>
                <span>{progress}% Completed</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-blue-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-xs text-slate-300 pt-2">
                <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-blue-400" /> Estimated ETA: {eta} mins</span>
                <span className="flex items-center gap-1.5"><Phone className="w-4 h-4 text-emerald-400" /> Trusted Contact: Active</span>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
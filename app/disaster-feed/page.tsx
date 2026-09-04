'use client';

import Navbar from '@/components/navigation/Navbar';
import { ShieldCheck, Eye, Sparkles, Layers, Palette, LayoutGrid } from 'lucide-react';

export default function DesignSystemPage() {
    return (
        <div className="min-h-screen bg-[#0F070C] text-pink-50 flex flex-col md:flex-row font-sans antialiased">
            <Navbar />

            <main className="flex-1 md:ml-72 p-4 md:p-8 pb-24 md:pb-8 max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <header className="flex justify-between items-center bg-rose-950/30 border border-pink-900/40 p-6 rounded-3xl backdrop-blur-md">
                    <div>
                        <span className="text-xs font-semibold uppercase tracking-wider text-pink-400 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5" /> Abhaya Aesthetic Framework
                        </span>
                        <h1 className="text-2xl md:text-3xl font-extrabold text-white mt-1">Research-Grounded UI & Design System</h1>
                        <p className="text-pink-200/70 text-sm mt-1">Aesthetic-Usability Effect & HCI Night Accessibility Showcase</p>
                    </div>
                </header>

                {/* Principle 1: Aesthetic-Usability Effect (Tractinsky et al., 2000) */}
                <section className="bg-rose-950/20 border border-pink-900/40 p-6 rounded-3xl space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-pink-600/20 text-pink-400 rounded-2xl">
                            <Palette className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">1. Aesthetic-Usability Effect</h2>
                            <p className="text-xs text-pink-200/60">Noam Tractinsky, Katz, & Ikar (2000)</p>
                        </div>
                    </div>
                    <p className="text-xs text-pink-200/80 leading-relaxed">
                        High visual polish directly increases user trust in high-stress situations. Clean glassmorphism borders and vibrant rose accents create high perceived responsiveness.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                        <div className="bg-gradient-to-br from-pink-600 to-rose-600 p-4 rounded-2xl text-white space-y-1 shadow-lg shadow-pink-600/20">
                            <span className="text-[10px] uppercase font-bold opacity-80">Primary Action Accent</span>
                            <p className="text-sm font-extrabold">Pink/Rose Glow (#EC4899)</p>
                        </div>
                        <div className="bg-rose-950/60 border border-pink-900/60 p-4 rounded-2xl text-pink-100 space-y-1">
                            <span className="text-[10px] uppercase font-bold text-pink-400">Glass Layer Elevation</span>
                            <p className="text-sm font-bold">Rose-950 Substrate (40% Opacity)</p>
                        </div>
                        <div className="bg-[#0F070C] border border-pink-900/40 p-4 rounded-2xl text-pink-200 space-y-1">
                            <span className="text-[10px] uppercase font-bold text-pink-400">Deep Background Base</span>
                            <p className="text-sm font-bold">Midnight Violet (#0F070C)</p>
                        </div>
                    </div>
                </section>

                {/* Principle 2: Low Visual Complexity (Tuch et al., 2012) */}
                <section className="bg-rose-950/20 border border-pink-900/40 p-6 rounded-3xl space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-rose-600/20 text-rose-400 rounded-2xl">
                            <LayoutGrid className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">2. Low Visual Complexity & Prototypicality</h2>
                            <p className="text-xs text-pink-200/60">Alexandre N. Tuch et al. (2012)</p>
                        </div>
                    </div>
                    <p className="text-xs text-pink-200/80 leading-relaxed">
                        Structuring the dashboard into clear, isolated glass cards prevents cognitive overload and allows immediate recognition during emergencies.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                        <div className="bg-rose-950/40 border border-pink-900/50 p-5 rounded-2xl flex items-center gap-4">
                            <ShieldCheck className="w-8 h-8 text-pink-400 shrink-0" />
                            <div>
                                <h4 className="font-bold text-white text-sm">Isolated Card Architecture</h4>
                                <p className="text-xs text-pink-200/60">Eliminates wall-of-text fatigue with modular visual blocks.</p>
                            </div>
                        </div>
                        <div className="bg-rose-950/40 border border-pink-900/50 p-5 rounded-2xl flex items-center gap-4">
                            <Eye className="w-8 h-8 text-rose-400 shrink-0" />
                            <div>
                                <h4 className="font-bold text-white text-sm">Iconic Focal Anchors</h4>
                                <p className="text-xs text-pink-200/60">Standardized Lucide iconography directs visual scanning instantly.</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Principle 3: Dark Mode & Night Accessibility (HCI / NN Group) */}
                <section className="bg-rose-950/20 border border-pink-900/40 p-6 rounded-3xl space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-fuchsia-600/20 text-fuchsia-400 rounded-2xl">
                            <Layers className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">3. Outdoor Night Accessibility & Eye Contrast</h2>
                            <p className="text-xs text-pink-200/60">HCI Dark Mode Guidelines (Nielsen Norman Group)</p>
                        </div>
                    </div>
                    <p className="text-xs text-pink-200/80 leading-relaxed">
                        Reduces screen glare for night outdoor safety. Deep base layers combined with elevated glass borders maintain WCAG-compliant contrast without glare.
                    </p>

                    <div className="p-5 bg-rose-950/60 border border-pink-500/40 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="space-y-1">
                            <span className="text-[10px] uppercase font-bold text-emerald-400">WCAG AAA Contrast Ratio</span>
                            <p className="text-xs text-pink-100 font-medium">Text on `#0F070C` dark substrate achieves high legibility during night travel.</p>
                        </div>
                        <span className="bg-pink-500/20 text-pink-300 border border-pink-500/30 px-3 py-1.5 rounded-full text-xs font-semibold shrink-0">
                            Anti-Glare Tested
                        </span>
                    </div>
                </section>
            </main>
        </div>
    );
}
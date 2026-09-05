'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Map, Navigation, AlertTriangle, ShieldAlert, Heart, LogOut, Users, UserCheck } from 'lucide-react';

const navItems = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'Map', href: '/map', icon: Map },
  { name: 'Journey', href: '/journey', icon: Navigation },
  { name: 'Report', href: '/report', icon: AlertTriangle },
  { name: 'Community', href: '/community', icon: Users },
  { name: 'Profile', href: '/profile', icon: UserCheck },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = () => {
    localStorage.removeItem('abhaya_user');
    sessionStorage.removeItem('abhaya_session_active');
    router.push('/login');
  };

  return (
    <>
      {/* Desktop Pink Glass Sidebar */}
      <aside className="hidden md:flex flex-col fixed left-4 top-4 bottom-4 w-64 bg-rose-950/40 backdrop-blur-2xl border border-pink-900/50 rounded-3xl p-6 z-50 justify-between shadow-2xl shadow-pink-950/30">
        <div className="space-y-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-600 to-rose-500 flex items-center justify-center font-bold text-white text-xl shadow-lg shadow-pink-500/30">
              A
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-wide">ABHAYA</h1>
              <p className="text-xs text-pink-400 font-medium flex items-center gap-1">
                Women Safety <Heart className="w-3 h-3 fill-pink-500 text-pink-500 inline" />
              </p>
            </div>
          </div>

          <nav className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-2xl font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-lg shadow-pink-600/30'
                      : 'text-pink-200/70 hover:text-white hover:bg-pink-900/30'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="space-y-2">
          <Link
            href="/emergency"
            className="flex items-center justify-center gap-2 w-full py-3.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold rounded-2xl shadow-lg shadow-red-600/30 transition-all duration-200 active:scale-95"
          >
            <ShieldAlert className="w-5 h-5" />
            EMERGENCY SOS
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            className="flex items-center justify-center gap-2 w-full text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 rounded-xl px-4 py-2 text-sm transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Floating Bar */}
      <nav className="md:hidden fixed bottom-4 left-4 right-4 bg-rose-950/90 backdrop-blur-xl border border-pink-900/60 rounded-full px-4 py-3 z-50 flex items-center justify-between shadow-2xl shadow-pink-950/40">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`p-2.5 rounded-full transition-all ${
                isActive ? 'bg-pink-600 text-white shadow-md shadow-pink-500/30' : 'text-pink-300/70 hover:text-white'
              }`}
            >
              <Icon className="w-5 h-5" />
            </Link>
          );
        })}
        <Link
          href="/emergency"
          className="p-2.5 rounded-full bg-red-600 text-white shadow-md shadow-red-600/40 animate-pulse"
        >
          <ShieldAlert className="w-5 h-5" />
        </Link>
      </nav>
    </>
  );
}
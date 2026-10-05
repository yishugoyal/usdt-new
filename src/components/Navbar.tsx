'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { LogOut, Lock, Landmark, RefreshCw, Menu, X, ArrowRight } from 'lucide-react';

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<{ type?: string; user?: any } | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
      });
      if (res.ok) {
        const data = await res.json();
        setSession(data?.type ? data : null);
      } else {
        setSession(null);
      }
    } catch {
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    checkAuth();
  }, [pathname, checkAuth]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setSession(null);
    router.push('/');
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-border shadow-sm">
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-3.5 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 group shrink-0">
          <div className="w-9 h-9 rounded-xl bg-primary p-0.5 shadow-md group-hover:shadow-lg transition-all">
            <div className="w-full h-full bg-white rounded-[10px] flex items-center justify-center">
              <Landmark className="w-4 h-4 text-primary" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-lg tracking-tight text-text">
                Rupee<span className="text-primary">Bridge</span>
              </span>
              <span className="hidden sm:inline text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-primary-soft text-primary-deep border border-primary/20">
                Institutional
              </span>
            </div>
            <p className="hidden sm:block text-[10px] text-text-secondary font-medium">USDT → INR Platform</p>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-text-secondary">
          <Link href="/" className="hover:text-primary transition-colors">Platform</Link>
          <Link href="/#how-it-works" className="hover:text-primary transition-colors">How It Works</Link>
          <Link href="/#security" className="hover:text-primary transition-colors">Security & Gate</Link>
          {session?.type === 'USER' && (
            <Link href="/dashboard" className="text-primary hover:text-primary-dark transition-colors font-semibold flex items-center gap-1.5">
              <RefreshCw className="w-4 h-4" /> Dashboard
            </Link>
          )}
          {session?.type === 'STAFF' && (
            <Link href="/admin" className="text-warning hover:text-warning/80 transition-colors font-semibold flex items-center gap-1.5">
              <Lock className="w-4 h-4" /> Admin ({session.user?.role})
            </Link>
          )}
        </nav>

        {/* Desktop Auth Buttons */}
        <div className="hidden lg:flex items-center gap-3">
          {loading ? (
            <div className="h-8 w-28 bg-gray-100 animate-pulse rounded-lg" />
          ) : session ? (
            <div className="flex items-center gap-3">
              <span className="text-xs text-text-secondary bg-gray-100 px-3 py-1.5 rounded-lg border border-border flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-success animate-pulse"></span>
                {session.user?.email}
              </span>
              <button
                onClick={handleLogout}
                className="p-2 text-text-secondary hover:text-error hover:bg-red-50 rounded-lg border border-transparent hover:border-red-200 transition-all"
                title="Log Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login" className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text hover:bg-gray-50 rounded-lg transition-all">
                Sign In
              </Link>
              <Link href="/register" className="px-4 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary-dark rounded-lg shadow-md transition-all flex items-center gap-1.5">
                Register <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>

        {/* Mobile: Hamburger + Auth hint */}
        <div className="flex lg:hidden items-center gap-2">
          {!loading && session && (
            <button
              onClick={handleLogout}
              className="p-2 text-text-secondary hover:text-error rounded-lg"
              title="Log Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="p-2 rounded-lg text-text-secondary hover:bg-gray-100 transition-all"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-border bg-white px-4 pb-4 pt-2 space-y-1 shadow-lg">
          <Link href="/" className="block py-2.5 px-3 rounded-lg text-sm font-medium text-text-secondary hover:bg-gray-50 hover:text-primary transition-all">
            Platform
          </Link>
          <Link href="/#how-it-works" className="block py-2.5 px-3 rounded-lg text-sm font-medium text-text-secondary hover:bg-gray-50 hover:text-primary transition-all">
            How It Works
          </Link>
          <Link href="/#security" className="block py-2.5 px-3 rounded-lg text-sm font-medium text-text-secondary hover:bg-gray-50 hover:text-primary transition-all">
            Security & Gate
          </Link>

          {session?.type === 'USER' && (
            <Link href="/dashboard" className="block py-2.5 px-3 rounded-lg text-sm font-semibold text-primary bg-primary-soft hover:bg-primary/10 transition-all">
              User Dashboard
            </Link>
          )}
          {session?.type === 'STAFF' && (
            <Link href="/admin" className="block py-2.5 px-3 rounded-lg text-sm font-semibold text-warning bg-yellow-50 hover:bg-yellow-100 transition-all">
              Admin Console
            </Link>
          )}

          <div className="pt-2 border-t border-border">
            {loading ? (
              <div className="h-8 w-full bg-gray-100 animate-pulse rounded-lg" />
            ) : session ? (
              <div className="flex items-center gap-2 py-2 px-3 text-xs text-text-secondary">
                <span className="w-2 h-2 rounded-full bg-success animate-pulse shrink-0"></span>
                <span className="truncate">{session.user?.email}</span>
              </div>
            ) : (
              <div className="flex gap-2 pt-1">
                <Link href="/login" className="flex-1 py-2.5 text-sm font-medium text-center text-text-secondary border border-border rounded-lg hover:bg-gray-50 transition-all">
                  Sign In
                </Link>
                <Link href="/register" className="flex-1 py-2.5 text-sm font-semibold text-center text-white bg-primary rounded-lg hover:bg-primary-dark transition-all">
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

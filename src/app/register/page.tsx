'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Landmark, ArrowRight } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email, mobile, password }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.requiresVerification) {
          router.push('/login?verification=sent');
        } else {
          router.push('/login');
        }
      } else {
        setError(data.error || 'Registration failed');
      }
    } catch (e: any) {
      setError(e.message || 'Server error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="card w-full max-w-md p-8 rounded-2xl space-y-6 relative">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-primary-soft border border-primary/30 flex items-center justify-center text-primary mx-auto">
            <Landmark className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-extrabold text-text">Create RupeeBridge Account</h1>
          <p className="text-xs text-text-secondary">Institutional USDT to INR settlement platform</p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-error text-center font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">Full Legal Name</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="input-field w-full p-3 text-sm text-text"
              placeholder="Rajesh Sharma"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field w-full p-3 text-sm text-text font-mono"
              placeholder="rajesh@company.com"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">Mobile Number (+91)</label>
            <input
              type="tel"
              required
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              className="input-field w-full p-3 text-sm text-text font-mono"
              placeholder="+919876543210"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field w-full p-3 text-sm text-text font-mono"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3.5 text-sm flex items-center justify-center gap-2"
          >
            {loading ? 'Registering...' : <>Create Account <ArrowRight className="w-4 h-4" /></>}
          </button>
        </form>

        <div className="text-center pt-2 border-t border-border text-xs text-text-secondary">
          Already registered?{' '}
          <Link href="/login" className="text-primary font-bold hover:underline">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}

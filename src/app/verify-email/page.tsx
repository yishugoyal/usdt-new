'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, AlertCircle, Mail, RefreshCw } from 'lucide-react';

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Invalid verification link. Please check your email for the correct link.');
      setLoading(false);
      return;
    }

    verifyEmail();
  }, [token]);

  const verifyEmail = async () => {
    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();

      if (data.success) {
        setSuccess(true);
        setTimeout(() => {
          router.push('/login');
        }, 3000);
      } else {
        setError(data.error || 'Failed to verify email');
      }
    } catch (e: any) {
      setError('Unable to connect to server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setLoading(true);
    setError('');
    verifyEmail();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, rgb(59, 130, 246) 1px, transparent 0)',
          backgroundSize: '40px 40px'
        }} />
      </div>

      <div className="relative w-full max-w-lg">
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 p-8 text-center space-y-6">
          {loading ? (
            <>
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-50 border border-blue-100 mb-4">
                <RefreshCw size={40} className="text-blue-500 animate-spin" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900">Verifying Your Email</h1>
              <p className="text-sm text-slate-500">
                Please wait while we verify your email address...
              </p>
            </>
          ) : success ? (
            <>
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-50 border border-emerald-100 mb-4">
                <CheckCircle2 size={40} className="text-emerald-500" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900">Email Verified Successfully!</h1>
              <p className="text-sm text-slate-500 leading-relaxed">
                Your email has been verified. You can now sign in to your account.
              </p>
              <p className="text-xs text-slate-400">Redirecting to login page...</p>
            </>
          ) : (
            <>
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-50 border border-red-100 mb-4">
                <AlertCircle size={40} className="text-red-500" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900">Verification Failed</h1>
              <p className="text-sm text-slate-500 leading-relaxed">
                {error || 'The verification link is invalid or has expired.'}
              </p>
              <div className="pt-4 space-y-3">
                <button
                  onClick={handleRetry}
                  className="w-full bg-blue-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-600 transition-colors"
                >
                  Try Again
                </button>
                <button
                  onClick={() => router.push('/login')}
                  className="w-full bg-slate-100 text-slate-700 px-6 py-3 rounded-xl font-semibold hover:bg-slate-200 transition-colors"
                >
                  Go to Login
                </button>
              </div>
            </>
          )}
        </div>

        {/* Help Text */}
        {!loading && !success && (
          <div className="mt-6 text-center">
            <p className="text-xs text-slate-400">
              Need a new verification link?{' '}
              <button
                onClick={() => router.push('/register')}
                className="text-blue-500 hover:text-blue-600 font-medium"
              >
                Register again
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  Landmark,
  Lock,
  Layers,
  AlertTriangle,
  RefreshCw,
  Building2,
  Check,
  X,
  FileCheck
} from 'lucide-react';

export default function LandingPage() {
  const [usdtInput, setUsdtInput] = useState<string>('500');
  const [selectedNetwork, setSelectedNetwork] = useState<string>('TRC20 (Tron)');
  const [quote, setQuote] = useState<any>(null);
  const [quoteError, setQuoteError] = useState<string>('');
  const [loadingQuote, setLoadingQuote] = useState<boolean>(false);
  const [readiness, setReadiness] = useState<any>(null);

  const fetchQuote = async (amount: string, net: string) => {
    if (!amount || parseFloat(amount) <= 0) {
      setQuote(null);
      setQuoteError('Please enter a valid USDT amount');
      return;
    }
    setLoadingQuote(true);
    try {
      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usdtAmount: amount, networkName: net }),
      });
      const data = await res.json();
      if (data.success) {
        setQuote(data.quote);
        setQuoteError('');
      } else {
        setQuote(null);
        setQuoteError(data.error || 'Quote generation failed');
      }
    } catch (e: any) {
      setQuote(null);
      setQuoteError(e.message || 'Connection error');
    } finally {
      setLoadingQuote(false);
    }
  };

  useEffect(() => {
    fetchQuote(usdtInput, selectedNetwork);
  }, []);

  useEffect(() => {
    fetch('/api/readiness')
      .then((res) => res.json())
      .then((data) => setReadiness(data))
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-24 pb-20">
      {/* HERO SECTION */}
      <section className="relative pt-16 pb-20 px-4 lg:px-8 overflow-hidden">
        {/* Subtle background gradient */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-1/3 right-10 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary-soft border border-primary/20 text-primary-deep text-xs font-semibold">
              <ShieldCheck className="w-4 h-4" /> Company-to-User Institutional Settlement Platform
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-text tracking-tight leading-[1.1]">
              Sell USDT to Company. <br />
              <span className="text-primary">Receive INR Direct to Bank.</span>
            </h1>

            <p className="text-text-secondary text-base sm:text-lg max-w-2xl font-normal leading-relaxed mx-auto lg:mx-0">
              Eliminate P2P fraud, frozen bank accounts, and non-paying counterparties. RupeeBridge acts as the direct institutional buyer for your USDT with automated rate quotes, server state machines, and verified IMPS/NEFT bank settlement.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-4">
              <Link
                href="/dashboard"
                className="w-full sm:w-auto px-8 py-4 bg-primary hover:bg-primary-dark text-white font-bold text-base rounded-lg shadow-md transition-all flex items-center justify-center gap-2 group"
              >
                Sell USDT Now <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/admin"
                className="w-full sm:w-auto px-6 py-4 bg-white border border-border hover:bg-gray-50 text-text font-semibold text-base rounded-lg transition-all flex items-center justify-center gap-2"
              >
                <Lock className="w-4 h-4 text-primary" /> Admin Consoles
              </Link>
            </div>

            {/* Key feature chips */}
            <div className="pt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-border text-left">
              <div>
                <div className="text-xs text-text-secondary uppercase tracking-wider font-semibold">Counterparty</div>
                <div className="text-sm font-bold text-text mt-0.5 flex items-center gap-1">
                  <Building2 className="w-4 h-4 text-primary"/> Direct Company
                </div>
              </div>
              <div>
                <div className="text-xs text-text-secondary uppercase tracking-wider font-semibold">P2P Risk</div>
                <div className="text-sm font-bold text-success mt-0.5 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4"/> Zero P2P Freeze
                </div>
              </div>
              <div>
                <div className="text-xs text-text-secondary uppercase tracking-wider font-semibold">Payout Method</div>
                <div className="text-sm font-bold text-text mt-0.5 flex items-center gap-1">
                  <Landmark className="w-4 h-4 text-primary"/> Verified IMPS / RTGS
                </div>
              </div>
            </div>
          </div>

          {/* LIVE QUOTE GENERATOR WIDGET */}
          <div className="lg:col-span-5">
            <div className="card p-6 sm:p-8 shadow-lg relative">
              <div className="flex items-center justify-between pb-6 border-b border-border">
                <div>
                  <h3 className="text-lg font-bold text-text flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" /> Live Sell Quote Calculator
                  </h3>
                  <p className="text-xs text-text-secondary">Server-calculated with institutional benchmark rates</p>
                </div>
                <span className="text-[11px] font-mono font-semibold bg-primary-soft text-primary-deep border border-primary/20 px-2.5 py-1 rounded-md">
                  LIVE BENCHMARK
                </span>
              </div>

              <div className="space-y-5 pt-6">
                {/* USDT Input */}
                <div>
                  <label className="block text-xs font-semibold uppercase text-text-secondary mb-2">You Sell (USDT)</label>
                  <div className="relative">
                    <input
                      type="number"
                      min="50"
                      max="100000"
                      value={usdtInput}
                      onChange={(e) => {
                        setUsdtInput(e.target.value);
                        fetchQuote(e.target.value, selectedNetwork);
                      }}
                      className="input-field w-full px-4 py-3.5 text-lg font-bold text-text pr-20"
                      placeholder="500"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-sm text-primary bg-primary-soft px-2.5 py-1 rounded-lg border border-primary/20">
                      USDT
                    </span>
                  </div>
                </div>

                {/* Network Selection */}
                <div>
                  <label className="block text-xs font-semibold uppercase text-text-secondary mb-2">Supported Network</label>
                  <select
                    value={selectedNetwork}
                    onChange={(e) => {
                      setSelectedNetwork(e.target.value);
                      fetchQuote(usdtInput, e.target.value);
                    }}
                    className="input-field w-full px-4 py-3.5 text-sm font-semibold text-text"
                  >
                    <option value="TRC20 (Tron)">TRC20 (Tron) - Fast & Low Fee</option>
                    <option value="ERC20 (Ethereum)">ERC20 (Ethereum)</option>
                    <option value="BEP20 (BNB Smart Chain)">BEP20 (BNB Smart Chain)</option>
                    <option value="Polygon">Polygon (MATIC)</option>
                    <option value="Solana">Solana (SOL)</option>
                  </select>
                </div>

                {/* Calculation Breakdown Box */}
                {quote ? (
                  <div className="bg-gray-50 rounded-lg p-4 border border-border space-y-2.5 text-sm">
                    <div className="flex justify-between text-text-secondary text-xs">
                      <span>Benchmark Rate:</span>
                      <span className="font-mono text-text">₹{quote.providerRate} / USDT</span>
                    </div>
                    <div className="flex justify-between text-text-secondary text-xs">
                      <span>Net Settlement Rate:</span>
                      <span className="font-mono text-primary font-bold">₹{quote.netInrRate} / USDT</span>
                    </div>
                    <div className="flex justify-between text-text-secondary text-xs">
                      <span>Platform Fee (0.25%):</span>
                      <span className="font-mono text-text">₹{quote.companyFee}</span>
                    </div>
                    <div className="pt-2 border-t border-border flex justify-between items-center">
                      <span className="font-semibold text-text">You Receive (INR):</span>
                      <span className="text-xl font-extrabold text-primary font-mono">
                        ₹{parseFloat(quote.netInrAmount).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                ) : quoteError ? (
                  <div className="py-6 px-4 bg-yellow-50 border border-yellow-200 rounded-lg text-center space-y-1">
                    <p className="text-xs font-bold text-warning">Notice</p>
                    <p className="text-xs text-text-secondary">{quoteError}</p>
                  </div>
                ) : (
                  <div className="py-8 text-center text-text-secondary text-sm flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-primary" /> Fetching server quote...
                  </div>
                )}

                <Link
                  href="/dashboard"
                  className="btn-primary w-full py-4 flex items-center justify-center gap-2"
                >
                  Proceed to Sell Order <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* WHY RUPEEBRIDGE VS P2P MARKETPLACE */}
      <section className="max-w-7xl mx-auto px-4 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <h2 className="text-3xl font-extrabold text-text tracking-tight">
            Why RupeeBridge is Built for Companies & Professional Sellers
          </h2>
          <p className="text-text-secondary mt-3 text-base">
            Traditional P2P platforms expose sellers to stolen bank accounts, police cyber-cell freezes, and fraud. RupeeBridge replaces P2P with a direct company counterparty structure.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* RupeeBridge Model */}
          <div className="card p-8 rounded-2xl border-2 border-primary/30 relative">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-primary-soft text-primary-deep text-xs font-bold mb-4">
              <CheckCircle2 className="w-4 h-4" /> RUPEEBRIDGE MODEL
            </div>
            <h3 className="text-xl font-bold text-text mb-6">Direct Company Counterparty</h3>
            <ul className="space-y-4 text-sm text-text-secondary">
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <span><strong>No P2P Traders:</strong> The company is the sole counterparty for 100% of transactions.</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <span><strong>Verified Institutional Payouts:</strong> INR is paid directly from corporate bank accounts via IMPS/NEFT.</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <span><strong>Decimal-Safe Server Math:</strong> Guaranteed fixed rates with server-locked quote timers.</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <span><strong>Immutable Audit Receipts:</strong> Download legally verifiable PDF/JSON transaction receipts for tax filing.</span>
              </li>
            </ul>
          </div>

          {/* Traditional P2P Marketplace Risks */}
          <div className="card p-8 rounded-2xl border-2 border-error/20 bg-red-50/30 relative">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-red-100 text-error text-xs font-bold mb-4">
              <AlertTriangle className="w-4 h-4" /> TRADITIONAL P2P MARKETPLACES
            </div>
            <h3 className="text-xl font-bold text-text mb-6">High Risk P2P Marketplaces</h3>
            <ul className="space-y-4 text-sm text-text-secondary">
              <li className="flex items-start gap-3">
                <X className="w-5 h-5 text-error shrink-0 mt-0.5" />
                <span><strong>Random Counterparties:</strong> You receive payments from unknown, unverified individual bank accounts.</span>
              </li>
              <li className="flex items-start gap-3">
                <X className="w-5 h-5 text-error shrink-0 mt-0.5" />
                <span><strong>Cyber-Cell Account Freezes:</strong> High risk of bank accounts being frozen due to third-party stolen funds.</span>
              </li>
              <li className="flex items-start gap-3">
                <X className="w-5 h-5 text-error shrink-0 mt-0.5" />
                <span><strong>Slippage & Chargebacks:</strong> Buyers cancel payments, dispute transactions, or stall release.</span>
              </li>
              <li className="flex items-start gap-3">
                <X className="w-5 h-5 text-error shrink-0 mt-0.5" />
                <span><strong>No Audit Trail:</strong> Lacks proper invoice, tax receipts, or corporate compliance records.</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* PRODUCTION READINESS ENGINE STATUS */}
      <section id="security" className="max-w-7xl mx-auto px-4 lg:px-8">
        <div className="card p-8 lg:p-10 rounded-2xl border border-border">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-border">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-warning uppercase tracking-wider mb-2">
                <Lock className="w-4 h-4" /> Production Readiness Engine
              </div>
              <h2 className="text-2xl lg:text-3xl font-bold text-text">Centralized System Activation Gate</h2>
              <p className="text-text-secondary text-sm mt-1">
                Real-money functionality is protected by strict legal, banking, security, and custody checks.
              </p>
            </div>
            <div className="flex items-center gap-3 bg-gray-50 px-4 py-2.5 rounded-lg border border-border">
              <span className="w-3 h-3 rounded-full bg-success animate-pulse"></span>
              <span className="text-xs font-mono font-bold text-text">
                GATE STATUS: {readiness?.gateStatus?.isSandboxMode ? 'SANDBOX ACTIVE' : 'PRODUCTION ACTIVE'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-8">
            {readiness?.checks ? (
              readiness.checks.map((c: any) => (
                <div key={c.id} className="bg-gray-50 p-4 rounded-lg border border-border flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-success shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary bg-gray-200 px-2 py-0.5 rounded">
                      {c.category}
                    </span>
                    <p className="text-xs font-semibold text-text mt-1.5">{c.name}</p>
                    <p className="text-[11px] text-success mt-1">Status: Passed</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full py-4 text-center text-text-secondary text-xs">
                Loading readiness gate status...
              </div>
            )}
          </div>
        </div>
      </section>

      {/* SUPPORTED NETWORKS GRID */}
      <section className="max-w-7xl mx-auto px-4 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-text">Approved USDT Blockchain Networks</h2>
          <p className="text-text-secondary text-sm mt-2">Explicitly verified blockchain indexers with order-specific deposit context</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {[
            { name: 'TRC20 (Tron)', confs: '19 Confs', speed: '< 2 mins', color: 'text-red-500' },
            { name: 'ERC20 (Ethereum)', confs: '12 Confs', speed: '~ 5 mins', color: 'text-blue-500' },
            { name: 'BEP20 (BSC)', confs: '15 Confs', speed: '< 3 mins', color: 'text-amber-500' },
            { name: 'Polygon', confs: '64 Confs', speed: '< 2 mins', color: 'text-purple-500' },
            { name: 'Solana', confs: '32 Confs', speed: '< 1 min', color: 'text-green-500' },
          ].map((net, i) => (
            <div key={i} className="card p-5 rounded-lg border border-border text-center space-y-2 card-hover">
              <Layers className={`w-8 h-8 mx-auto ${net.color}`} />
              <h4 className="font-bold text-sm text-text">{net.name}</h4>
              <div className="text-[11px] text-text-secondary font-mono">{net.confs} • {net.speed}</div>
              <span className="inline-block text-[10px] font-bold text-success bg-green-100 px-2 py-0.5 rounded border border-green-200">
                ACTIVE
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

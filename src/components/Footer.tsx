import React from 'react';
import Link from 'next/link';
import { ShieldCheck, Landmark, FileText, Lock } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-border bg-white pt-12 pb-8 px-4 lg:px-8 text-text-secondary text-sm">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-lg bg-primary-soft border border-primary/30 flex items-center justify-center text-primary">
              <Landmark className="w-4 h-4" />
            </div>
            <span className="font-bold text-lg text-text">
              Rupee<span className="text-primary">Bridge</span>
            </span>
          </div>
          <p className="text-text-secondary max-w-md text-xs leading-relaxed mb-4">
            RupeeBridge operates strictly as a sell-to-company counterparty platform for liquidating USDT to INR into verified bank accounts. Peer-to-peer trading, chat matching, investment products, and unverified payouts are explicitly prohibited.
          </p>
          <div className="flex items-center gap-2 text-xs text-success bg-green-50 border border-green-200 px-3 py-1.5 rounded-lg w-fit">
            <ShieldCheck className="w-4 h-4" /> Company Counterparty Settlement Protocol
          </div>
        </div>

        <div>
          <h4 className="text-text font-semibold text-xs uppercase tracking-wider mb-3">Platform Rules</h4>
          <ul className="space-y-2 text-xs">
            <li><Link href="/#how-it-works" className="hover:text-primary transition-colors">Direct Sell Flow</Link></li>
            <li><Link href="/#quote-engine" className="hover:text-primary transition-colors">Live Rate Calculation</Link></li>
            <li><Link href="/#security" className="hover:text-primary transition-colors">Production Readiness Engine</Link></li>
            <li><Link href="/admin" className="hover:text-warning transition-colors flex items-center gap-1"><Lock className="w-3 h-3"/> Internal Consoles</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-text font-semibold text-xs uppercase tracking-wider mb-3">Compliance & Legal</h4>
          <ul className="space-y-2 text-xs">
            <li className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5 text-primary"/> Terms of Service</li>
            <li className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5 text-primary"/> Privacy Policy</li>
            <li className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5 text-primary"/> Anti-Money Laundering Policy</li>
            <li className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5 text-primary"/> Risk Disclosures</li>
          </ul>
        </div>
      </div>

      <div className="max-w-7xl mx-auto pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between text-xs text-text-secondary">
        <p>© 2026 RupeeBridge Technologies Ltd. All financial transactions subject to server state machine verification.</p>
        <p className="mt-2 sm:mt-0 font-mono">System Gate Status: <span className="text-success font-semibold">ACTIVE (Sandbox Ready)</span></p>
      </div>
    </footer>
  );
}

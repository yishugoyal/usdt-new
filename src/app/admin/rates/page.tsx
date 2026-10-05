'use client';
import { useEffect, useState } from 'react';
import { TrendingUp, RefreshCw, Edit2, Check, X, ShieldCheck, ArrowRight, DollarSign } from 'lucide-react';

interface RateData {
  baseRate: number;
  rateSource: string;
  spread: number;
  companyFee: number;
  effectiveRate: number;
}

const RATE_SETTINGS = [
  {
    key: 'MANUAL_USDT_INR_RATE',
    label: 'Base USDT/INR Rate (₹)',
    desc: 'Platform benchmark exchange rate before spread and fee deductions',
    defaultVal: '90.00',
    unit: '₹',
  },
  {
    key: 'DEFAULT_SPREAD_PERCENTAGE',
    label: 'Spread %',
    desc: 'Subtracted from base rate as platform spread margin',
    defaultVal: '0.5',
    unit: '%',
  },
  {
    key: 'DEFAULT_COMPANY_FEE_PERCENTAGE',
    label: 'Company Fee %',
    desc: 'Platform service fee applied to transactions',
    defaultVal: '0.25',
    unit: '%',
  },
  {
    key: 'MIN_SELL_USDT',
    label: 'Min Sell (USDT)',
    desc: 'Minimum allowed sell order size',
    defaultVal: '50',
    unit: 'USDT',
  },
  {
    key: 'MAX_SELL_USDT',
    label: 'Max Sell (USDT)',
    desc: 'Maximum allowed sell order size per transaction',
    defaultVal: '100000',
    unit: 'USDT',
  },
  {
    key: 'QUOTE_EXPIRY_SECONDS',
    label: 'Quote Expiry (sec)',
    desc: 'How long a locked quote remains valid before expiration',
    defaultVal: '300',
    unit: 'sec',
  },
];

export default function RatesPage() {
  const [rate, setRate] = useState<RateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [editVal, setEditVal] = useState('');
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<Record<string, string>>({});

  // Quick edit for hero base rate
  const [isEditingBase, setIsEditingBase] = useState(false);
  const [quickBaseRate, setQuickBaseRate] = useState('');

  const fetchAll = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/rates');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const settingsMap: Record<string, string> = data.settings || {};
      setSettings(settingsMap);

      const baseRate = parseFloat(settingsMap['MANUAL_USDT_INR_RATE'] || String(data.liveRate || 90.00));
      const spread = parseFloat(settingsMap['DEFAULT_SPREAD_PERCENTAGE'] || '0.5');
      const fee = parseFloat(settingsMap['DEFAULT_COMPANY_FEE_PERCENTAGE'] || '0.25');
      const effectiveRate = baseRate * (1 - spread / 100) * (1 - fee / 100);

      setRate({
        baseRate,
        rateSource: data.rateSource || 'Manual (Admin Set)',
        spread,
        companyFee: fee,
        effectiveRate: parseFloat(effectiveRate.toFixed(2)),
      });
      setQuickBaseRate(String(baseRate));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const saveSettings = async (key: string, value: string) => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/admin/rates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);

      setSettings(p => ({ ...p, [key]: value }));
      setSuccess(`${key} updated successfully`);
      setEditing(null);
      setIsEditingBase(false);
      fetchAll();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <TrendingUp size={24} className="text-emerald-500" /> Platform Rates & Pricing
          </h1>
          <p className="text-slate-400 text-sm">
            Manually configured exchange rates and fee parameters across RupeeBridge
          </p>
        </div>
        <button
          onClick={fetchAll}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-sm font-medium transition-all"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm flex items-center gap-2">
          <span>⚠</span> <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-emerald-700 text-sm flex items-center gap-2">
          <span>✓</span> <span>{success}</span>
        </div>
      )}

      {/* Manual Rate Hero Card */}
      {rate && (
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-slate-700/50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-semibold rounded-full uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck size={13} /> Manual Rate Active
              </span>
              <span className="text-xs text-slate-400">{rate.rateSource}</span>
            </div>
            <p className="text-xs text-slate-400">All user quotes are calculated from this base rate</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 items-center">
            {/* Base Rate */}
            <div>
              <p className="text-slate-400 text-xs uppercase font-medium tracking-wider mb-1">
                Base USDT / INR Exchange Rate
              </p>
              {isEditingBase ? (
                <div className="flex items-center gap-2 mt-2">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                    <input
                      type="number"
                      step="0.01"
                      value={quickBaseRate}
                      onChange={e => setQuickBaseRate(e.target.value)}
                      className="w-40 pl-8 pr-3 py-2 bg-slate-800 border-2 border-emerald-400 text-white font-bold rounded-xl text-2xl font-mono focus:outline-none"
                      autoFocus
                    />
                  </div>
                  <button
                    onClick={() => saveSettings('MANUAL_USDT_INR_RATE', quickBaseRate)}
                    disabled={saving}
                    className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-semibold text-sm transition-all"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setIsEditingBase(false)}
                    className="p-2.5 bg-slate-700 hover:bg-slate-600 rounded-xl text-slate-300 transition-all"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-5xl font-black text-white tracking-tight font-mono">
                    ₹{rate.baseRate.toFixed(2)}
                  </span>
                  <button
                    onClick={() => {
                      setQuickBaseRate(String(rate.baseRate));
                      setIsEditingBase(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold transition-all"
                  >
                    <Edit2 size={12} /> Edit Rate
                  </button>
                </div>
              )}
            </div>

            {/* Calculations Breakdown */}
            <div className="bg-white/5 rounded-2xl p-4 border border-white/10 space-y-2">
              <div className="flex justify-between text-sm text-slate-300">
                <span>Base Platform Rate:</span>
                <span className="font-mono text-white font-semibold">₹{rate.baseRate.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-slate-300">
                <span>Spread ({rate.spread}%):</span>
                <span className="font-mono text-amber-300">−₹{(rate.baseRate * (rate.spread / 100)).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-slate-300">
                <span>Platform Fee ({rate.companyFee}%):</span>
                <span className="font-mono text-amber-300">−₹{(rate.baseRate * (rate.companyFee / 100)).toFixed(2)}</span>
              </div>
              <div className="pt-2 border-t border-white/10 flex justify-between items-center">
                <span className="text-emerald-400 font-bold text-sm">User Receives (Effective):</span>
                <span className="font-mono text-emerald-400 font-black text-xl">₹{rate.effectiveRate.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rate Parameters Table */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-800 text-base">Rate & Limit Parameters</h3>
            <p className="text-slate-400 text-sm">Parameters take effect immediately across all trading flows</p>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {RATE_SETTINGS.map(setting => {
            const currentVal = settings[setting.key] || setting.defaultVal;
            const isEditing = editing === setting.key;

            return (
              <div key={setting.key} className="px-6 py-4 flex items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-slate-800 text-sm">{setting.label}</p>
                    <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded font-mono font-bold">
                      {setting.unit}
                    </span>
                  </div>
                  <p className="text-slate-400 text-xs mt-0.5">{setting.desc}</p>
                  <p className="text-slate-300 text-[11px] font-mono mt-0.5">{setting.key}</p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {isEditing ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        step="any"
                        value={editVal}
                        onChange={e => setEditVal(e.target.value)}
                        autoFocus
                        className="w-28 border-2 border-sky-400 rounded-xl px-3 py-1.5 text-sm focus:outline-none text-right font-mono font-bold"
                      />
                      <button
                        onClick={() => saveSettings(setting.key, editVal)}
                        disabled={saving}
                        className="p-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition-all disabled:opacity-50"
                        title="Save"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        onClick={() => setEditing(null)}
                        className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl transition-all"
                        title="Cancel"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-800 text-lg bg-slate-50 px-3 py-1 rounded-xl border border-slate-200">
                        {currentVal} {setting.unit}
                      </span>
                      <button
                        onClick={() => {
                          setEditing(setting.key);
                          setEditVal(currentVal);
                        }}
                        className="p-2 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-xl transition-all"
                        title="Edit value"
                      >
                        <Edit2 size={15} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Manual Mode Info */}
      <div className="bg-sky-50 border border-sky-200 rounded-2xl p-5 text-sm text-sky-800 flex items-start gap-3">
        <DollarSign size={20} className="text-sky-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-sky-900 mb-1">Manual Rate Mode Active</p>
          <p className="text-sky-700 leading-relaxed text-xs">
            External third-party rate APIs are disabled. The base rate configured above (currently ₹{rate?.baseRate.toFixed(2)}) is the single source of truth for all USDT buy/sell calculations, quote locks, and wallet exchanges.
          </p>
        </div>
      </div>
    </div>
  );
}

'use client';
import { useEffect, useState } from 'react';
import {
  Settings,
  RefreshCw,
  Edit2,
  Check,
  X,
  Plus,
  Eye,
  EyeOff,
  Wallet,
  Copy,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Power,
  PowerOff,
  AlertTriangle,
} from 'lucide-react';

interface Setting {
  id?: string;
  key: string;
  value: string;
  description?: string;
  isPublic?: boolean;
  updatedAt?: string;
}

const WALLET_NETWORKS = [
  {
    key: 'TRON_DEPOSIT_ADDRESS',
    enabledKey: 'TRON_DEPOSIT_ENABLED',
    network: 'TRON (TRC20)',
    symbol: 'USDT-TRC20',
    defaultAddress: 'TL1417xeaNrvU6La3N5Vgpye1e47i4zHUv',
    defaultEnabled: true,
    badgeColor: 'bg-red-100 text-red-700 border-red-200',
    explorerBase: 'https://tronscan.org/#/address/',
    desc: 'Primary platform custody vault address for customer TRC20 USDT deposits',
  },
  {
    key: 'ETH_DEPOSIT_ADDRESS',
    enabledKey: 'ETH_DEPOSIT_ENABLED',
    network: 'Ethereum (ERC20)',
    symbol: 'USDT-ERC20',
    defaultAddress: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
    defaultEnabled: false,
    badgeColor: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    explorerBase: 'https://etherscan.io/address/',
    desc: 'Secondary multi-chain vault address for customer ERC20 USDT deposits',
  },
  {
    key: 'BSC_DEPOSIT_ADDRESS',
    enabledKey: 'BSC_DEPOSIT_ENABLED',
    network: 'BNB Smart Chain (BEP20)',
    symbol: 'USDT-BEP20',
    defaultAddress: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
    defaultEnabled: false,
    badgeColor: 'bg-amber-100 text-amber-700 border-amber-200',
    explorerBase: 'https://bscscan.com/address/',
    desc: 'Optional low-gas Binance Smart Chain custody address',
  },
];

const SETTING_GROUPS: { label: string; keys: string[] }[] = [
  { label: 'Authentication', keys: ['AUTH_SECRET', 'ENCRYPTION_KEY'] },
  { label: 'Platform Readiness', keys: ['NODE_ENV', 'ENABLE_SANDBOX_PROVIDERS', 'PRODUCTION_GATE_APPROVED'] },
  { label: 'Rates & Limits', keys: ['MANUAL_USDT_INR_RATE', 'DEFAULT_SPREAD_PERCENTAGE', 'DEFAULT_COMPANY_FEE_PERCENTAGE', 'MIN_SELL_USDT', 'MAX_SELL_USDT', 'QUOTE_EXPIRY_SECONDS'] },
  { label: 'Third-Party Services', keys: ['TRONSCAN_API_KEY'] },
];

const SENSITIVE_KEYS = new Set(['AUTH_SECRET', 'ENCRYPTION_KEY', 'TRONSCAN_API_KEY', 'SUPABASE_SERVICE_ROLE_KEY']);

export default function SettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [editVal, setEditVal] = useState('');
  const [saving, setSaving] = useState(false);
  const [togglingKey, setTogglingKey] = useState<string | null>(null);
  const [showSecrets, setShowSecrets] = useState<Set<string>>(new Set());
  const [showAdd, setShowAdd] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newVal, setNewVal] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const fetch_ = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/settings');
      const data = await res.json();
      setSettings(data.settings || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch_();
  }, []);

  const save = async (key: string, value: string, description?: string) => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value, description }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setSuccess(`Setting "${key}" saved successfully`);
      setEditing(null);
      fetch_();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleNetworkActive = async (enabledKey: string, currentlyActive: boolean, networkName: string) => {
    setTogglingKey(enabledKey);
    setError('');
    setSuccess('');
    const newStatus = currentlyActive ? 'false' : 'true';
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: enabledKey,
          value: newStatus,
          description: `Controls whether customer deposits are enabled for ${networkName}`,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);

      setSuccess(`${networkName} deposit address has been ${currentlyActive ? 'disabled (inactive)' : 'enabled (active)'}`);
      fetch_();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setTogglingKey(null);
    }
  };

  const copyAddress = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const toggleSecret = (key: string) => {
    setShowSecrets(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const maskedValue = (key: string, val: string) => {
    if (SENSITIVE_KEYS.has(key) && !showSecrets.has(key)) return '••••••••••••••••';
    return val || '—';
  };

  const settingsMap = new Map(settings.map(s => [s.key, s.value]));

  const grouped = SETTING_GROUPS.map(group => ({
    ...group,
    settings: settings.filter(s => group.keys.includes(s.key)),
  }));

  const walletKeys = WALLET_NETWORKS.flatMap(w => [w.key, w.enabledKey]);
  const groupedKeys = SETTING_GROUPS.flatMap(g => g.keys);
  const ungrouped = settings.filter(s => !groupedKeys.includes(s.key) && !walletKeys.includes(s.key));

  return (
    <div className="p-6 space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Settings size={24} className="text-slate-700" /> System Settings & Configuration
          </h1>
          <p className="text-slate-400 text-sm">
            Manage custody wallet addresses, platform parameters, and network status
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetch_}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-sm font-medium transition-all"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-sm font-medium transition-all"
          >
            <Plus size={14} /> Add Setting
          </button>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm">⚠ {error}</div>}
      {success && <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-emerald-700 text-sm">✓ {success}</div>}

      {/* ── 1. WALLET ADDRESS SYSTEM WITH ACTIVE / INACTIVE BUTTONS ── */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Wallet size={20} className="text-emerald-600" /> Platform Deposit Wallet Address System
            </h2>
            <p className="text-slate-400 text-xs">
              Configured receiving custody addresses presented to customers when initiating USDT deposits
            </p>
          </div>
          <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full border border-emerald-200 flex items-center gap-1.5 self-start sm:self-auto">
            <ShieldCheck size={13} /> Active Custody System
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {WALLET_NETWORKS.map(net => {
            const currentAddr = settingsMap.get(net.key) || net.defaultAddress;
            const enabledSetting = settingsMap.get(net.enabledKey);
            const isActive = enabledSetting !== undefined ? enabledSetting === 'true' : net.defaultEnabled;
            const isEditing = editing === net.key;
            const isToggling = togglingKey === net.enabledKey;

            return (
              <div
                key={net.key}
                className={`bg-white border rounded-2xl p-5 shadow-sm transition-all space-y-4 ${
                  isActive ? 'border-slate-200 hover:shadow-md' : 'border-slate-200 bg-slate-50/50 opacity-90'
                }`}
              >
                {/* Network Header & Active Toggle Controls */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold border ${net.badgeColor}`}>
                      {net.network}
                    </span>
                    <span className="text-xs font-bold text-slate-700 font-mono">{net.symbol}</span>
                    <span className="text-[11px] text-slate-400 font-mono">({net.key})</span>
                  </div>

                  {/* Active / Inactive Status + Toggle Action */}
                  <div className="flex items-center gap-2">
                    {isActive ? (
                      <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full border border-emerald-200 flex items-center gap-1.5">
                        <CheckCircle2 size={13} /> Active (Enabled)
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-red-50 text-red-700 text-xs font-bold rounded-full border border-red-200 flex items-center gap-1.5">
                        <XCircle size={13} /> Inactive (Disabled)
                      </span>
                    )}

                    {/* Enable / Disable Button */}
                    <button
                      onClick={() => toggleNetworkActive(net.enabledKey, isActive, net.network)}
                      disabled={isToggling}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50 ${
                        isActive
                          ? 'bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-600 border border-slate-200'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                      }`}
                      title={isActive ? 'Click to disable customer deposits on this network' : 'Click to enable customer deposits on this network'}
                    >
                      {isActive ? (
                        <>
                          <PowerOff size={12} /> {isToggling ? 'Disabling...' : 'Disable'}
                        </>
                      ) : (
                        <>
                          <Power size={12} /> {isToggling ? 'Enabling...' : 'Enable'}
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-500">{net.desc}</p>

                {/* Warning if Inactive */}
                {!isActive && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-2 text-xs text-amber-800 flex items-center gap-2">
                    <AlertTriangle size={14} className="text-amber-600 flex-shrink-0" />
                    <span>This network deposit address is currently <strong>disabled</strong>. Customers cannot initiate deposits to this address until it is enabled.</span>
                  </div>
                )}

                {/* Address Box */}
                {isEditing ? (
                  <div className="flex flex-col sm:flex-row gap-2 pt-1">
                    <input
                      type="text"
                      value={editVal}
                      onChange={e => setEditVal(e.target.value)}
                      placeholder="Paste valid wallet address..."
                      autoFocus
                      className="flex-1 font-mono text-sm border-2 border-emerald-400 rounded-xl px-4 py-2.5 focus:outline-none"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => save(net.key, editVal)}
                        disabled={saving}
                        className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1"
                      >
                        <Check size={14} /> Save Address
                      </button>
                      <button
                        onClick={() => setEditing(null)}
                        className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 border rounded-xl p-3.5 ${
                    isActive ? 'bg-slate-50 border-slate-200/80' : 'bg-slate-100/60 border-slate-200'
                  }`}>
                    <div className="font-mono text-sm font-bold text-slate-800 break-all select-all flex items-center gap-2">
                      <span>{currentAddr}</span>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => copyAddress(net.key, currentAddr)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          copiedKey === net.key
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {copiedKey === net.key ? (
                          <>
                            <CheckCircle2 size={13} /> Copied!
                          </>
                        ) : (
                          <>
                            <Copy size={13} /> Copy
                          </>
                        )}
                      </button>

                      <a
                        href={`${net.explorerBase}${currentAddr}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold transition-all"
                      >
                        <ExternalLink size={13} /> Explorer
                      </a>

                      <button
                        onClick={() => {
                          setEditing(net.key);
                          setEditVal(currentAddr);
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold transition-all"
                      >
                        <Edit2 size={12} /> Edit
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 2. SYSTEM SETTINGS GROUPS ── */}
      <div className="space-y-6">
        <h2 className="text-lg font-bold text-slate-800">General Platform Parameters</h2>

        {grouped.map(group => {
          if (group.settings.length === 0) return null;

          return (
            <div key={group.label} className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                <h3 className="font-bold text-slate-700 text-sm">{group.label}</h3>
              </div>
              <div className="divide-y divide-slate-100">
                {group.settings.map(s => {
                  const isSensitive = SENSITIVE_KEYS.has(s.key);
                  const isEditing = editing === s.key;
                  const shown = showSecrets.has(s.key);

                  return (
                    <div key={s.key} className="px-6 py-4 flex items-center justify-between gap-4 hover:bg-slate-50/40 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-mono text-sm font-bold text-slate-800">{s.key}</p>
                          {isSensitive && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded font-bold">
                              SENSITIVE
                            </span>
                          )}
                        </div>
                        {s.description && <p className="text-slate-400 text-xs mt-0.5">{s.description}</p>}
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={editVal}
                              onChange={e => setEditVal(e.target.value)}
                              autoFocus
                              className="font-mono text-xs border border-sky-400 rounded-lg px-3 py-1.5 focus:outline-none"
                            />
                            <button
                              onClick={() => save(s.key, editVal)}
                              disabled={saving}
                              className="p-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-all"
                            >
                              <Check size={14} />
                            </button>
                            <button
                              onClick={() => setEditing(null)}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg transition-all"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-semibold text-slate-700 bg-slate-50 px-3 py-1 rounded-lg border border-slate-200">
                              {maskedValue(s.key, s.value)}
                            </span>
                            {isSensitive && (
                              <button
                                onClick={() => toggleSecret(s.key)}
                                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
                              >
                                {shown ? <EyeOff size={14} /> : <Eye size={14} />}
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setEditing(s.key);
                                setEditVal(s.value);
                              }}
                              className="p-1.5 text-slate-400 hover:text-sky-500 rounded-lg"
                            >
                              <Edit2 size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Ungrouped Settings */}
        {ungrouped.length > 0 && (
          <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-bold text-slate-700 text-sm">Other Custom Settings</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {ungrouped.map(s => (
                <div key={s.key} className="px-6 py-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-mono text-sm font-bold text-slate-800">{s.key}</p>
                    {s.description && <p className="text-slate-400 text-xs mt-0.5">{s.description}</p>}
                  </div>
                  <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-50 px-3 py-1 rounded-lg border border-slate-200">
                    {s.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add Setting Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="font-bold text-slate-800">Add New System Setting</h2>
              <button onClick={() => setShowAdd(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X size={18} />
              </button>
            </div>
            <form
              onSubmit={e => {
                e.preventDefault();
                save(newKey.trim().toUpperCase(), newVal.trim(), newDesc.trim() || undefined);
                setShowAdd(false);
                setNewKey('');
                setNewVal('');
                setNewDesc('');
              }}
              className="p-6 space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">SETTING KEY</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. TRON_DEPOSIT_ADDRESS"
                  value={newKey}
                  onChange={e => setNewKey(e.target.value)}
                  className="w-full font-mono uppercase border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-sky-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">VALUE</label>
                <input
                  type="text"
                  required
                  placeholder="Setting value"
                  value={newVal}
                  onChange={e => setNewVal(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-sky-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">DESCRIPTION (OPTIONAL)</label>
                <input
                  type="text"
                  placeholder="What this setting controls"
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-sky-400"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-sky-500 hover:bg-sky-600 text-white font-semibold rounded-xl py-3 text-sm transition-all"
              >
                Save Setting
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

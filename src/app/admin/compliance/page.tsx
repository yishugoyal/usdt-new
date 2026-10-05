'use client';
import { useEffect, useState } from 'react';
import { ShieldAlert, RefreshCw, X, AlertTriangle, CheckCircle } from 'lucide-react';

interface RiskAlert {
  id: string; userId: string; orderId?: string; riskLevel: string;
  score: number; triggerRules: string; status: string; resolutionNotes?: string;
  createdAt: string;
}

interface ComplianceCase {
  id: string; caseNumber: string; userId: string; orderId?: string;
  trigger: string; status: string; riskScore: number; evidence: string;
  analystNotes?: string; decision?: string; createdAt: string; updatedAt: string;
}

const RISK_COLORS: Record<string, string> = {
  LOW: 'bg-emerald-100 text-emerald-700',
  MEDIUM: 'bg-amber-100 text-amber-700',
  HIGH: 'bg-orange-100 text-orange-700',
  CRITICAL: 'bg-red-100 text-red-700',
};

const STATUS_COLORS: Record<string, string> = {
  OPEN: 'bg-red-100 text-red-700',
  DISMISSED: 'bg-slate-100 text-slate-500',
  RESOLVED: 'bg-emerald-100 text-emerald-700',
  ESCALATED: 'bg-purple-100 text-purple-700',
};

export default function CompliancePage() {
  const [tab, setTab] = useState<'risk' | 'cases'>('risk');
  const [riskAlerts, setRiskAlerts] = useState<RiskAlert[]>([]);
  const [cases, setCases] = useState<ComplianceCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<RiskAlert | null>(null);
  const [resolving, setResolving] = useState(false);
  const [resolveNote, setResolveNote] = useState('');

  const fetchData = async () => {
    setLoading(true); setError('');
    try {
      const [riskRes, casesRes] = await Promise.all([
        fetch('/api/admin/compliance'),
        fetch('/api/admin/compliance'),
      ]);
      // Use the existing compliance endpoint
      if (riskRes.ok) {
        const d = await riskRes.json();
        setRiskAlerts(d.riskAlerts || []);
        setCases(d.complianceCases || []);
      }
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const resolveAlert = async (alertId: string) => {
    setResolving(true);
    try {
      await fetch('/api/admin/compliance', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertId, status: 'RESOLVED', resolutionNotes: resolveNote }),
      });
      setSelected(null); setResolveNote(''); fetchData();
    } catch (e: any) { setError(e.message); }
    finally { setResolving(false); }
  };

  const openAlerts = riskAlerts.filter(a => a.status === 'OPEN').length;
  const critical = riskAlerts.filter(a => a.riskLevel === 'CRITICAL').length;

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <ShieldAlert size={22} className="text-red-500" /> Compliance & Risk
          </h1>
          <p className="text-slate-400 text-sm">{openAlerts} open alerts · {critical} critical</p>
        </div>
        <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-sm font-medium">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm">⚠ {error}</div>}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Open Alerts', value: openAlerts, color: 'bg-red-50 border-red-200', text: 'text-red-700' },
          { label: 'Critical', value: critical, color: 'bg-orange-50 border-orange-200', text: 'text-orange-700' },
          { label: 'Total Alerts', value: riskAlerts.length, color: 'bg-slate-50 border-slate-200', text: 'text-slate-700' },
          { label: 'Compliance Cases', value: cases.length, color: 'bg-purple-50 border-purple-200', text: 'text-purple-700' },
        ].map(s => (
          <div key={s.label} className={`rounded-2xl p-4 border ${s.color}`}>
            <p className="text-slate-500 text-xs">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.text}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {[{ key: 'risk', label: 'Risk Alerts' }, { key: 'cases', label: 'Compliance Cases' }].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as 'risk' | 'cases')}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${tab === t.key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Risk Alerts Table */}
      {tab === 'risk' && (
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {['Risk Level', 'Score', 'User', 'Triggered Rules', 'Status', 'Date', ''].map(h => (
                    <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="py-12 text-center"><div className="w-6 h-6 border-2 border-sky-300 border-t-sky-500 rounded-full animate-spin mx-auto" /></td></tr>
                ) : riskAlerts.length === 0 ? (
                  <tr><td colSpan={7} className="py-12 text-center text-slate-400 text-sm">No risk alerts found</td></tr>
                ) : riskAlerts.map(a => (
                  <tr key={a.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${RISK_COLORS[a.riskLevel] || 'bg-slate-100 text-slate-600'}`}>
                        {a.riskLevel}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-bold text-slate-700">{a.score}</span>
                      <span className="text-slate-400 text-xs">/100</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-mono text-xs text-slate-500">{a.userId.slice(0, 12)}...</span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1">
                        {JSON.parse(a.triggerRules || '[]').map((rule: string) => (
                          <span key={rule} className="text-[9px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded font-mono">{rule}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[a.status] || 'bg-slate-100 text-slate-600'}`}>
                        {a.status}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-slate-400 text-xs">{new Date(a.createdAt).toLocaleDateString('en-IN')}</span>
                    </td>
                    <td className="px-5 py-4">
                      {a.status === 'OPEN' && (
                        <button onClick={() => { setSelected(a); setResolveNote(''); }}
                          className="px-3 py-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg">
                          Resolve
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Compliance Cases Table */}
      {tab === 'cases' && (
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {['Case #', 'User', 'Trigger', 'Risk Score', 'Status', 'Decision', 'Date'].map(h => (
                    <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="py-12 text-center"><div className="w-6 h-6 border-2 border-sky-300 border-t-sky-500 rounded-full animate-spin mx-auto" /></td></tr>
                ) : cases.length === 0 ? (
                  <tr><td colSpan={7} className="py-12 text-center text-slate-400 text-sm">No compliance cases found</td></tr>
                ) : cases.map(c => (
                  <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="px-5 py-4"><span className="font-mono text-sm text-slate-700">{c.caseNumber}</span></td>
                    <td className="px-5 py-4"><span className="font-mono text-xs text-slate-500">{c.userId.slice(0, 12)}...</span></td>
                    <td className="px-5 py-4"><span className="text-xs text-slate-600">{c.trigger}</span></td>
                    <td className="px-5 py-4"><span className="font-bold text-slate-700">{c.riskScore}</span></td>
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[c.status] || 'bg-slate-100 text-slate-600'}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-5 py-4"><span className="text-xs text-slate-500">{c.decision || '—'}</span></td>
                    <td className="px-5 py-4"><span className="text-slate-400 text-xs">{new Date(c.createdAt).toLocaleDateString('en-IN')}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Resolve Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="font-bold text-slate-800">Resolve Risk Alert</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${RISK_COLORS[selected.riskLevel]}`}>{selected.riskLevel}</span>
                  <span className="text-slate-400 text-xs">Score: {selected.score}/100</span>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="p-2 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-xs text-slate-500 mb-1">Triggered Rules</p>
                <div className="flex flex-wrap gap-1">
                  {JSON.parse(selected.triggerRules || '[]').map((r: string) => (
                    <span key={r} className="text-[10px] px-2 py-0.5 bg-amber-100 text-amber-700 rounded font-mono">{r}</span>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Resolution Notes</label>
                <textarea
                  rows={3} value={resolveNote}
                  onChange={e => setResolveNote(e.target.value)}
                  placeholder="Explain how this risk was assessed and resolved..."
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:border-sky-400"
                />
              </div>
              <div className="flex gap-2">
                <button onClick={() => resolveAlert(selected.id)} disabled={resolving}
                  className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl py-3 text-sm disabled:opacity-50">
                  <CheckCircle size={15} />{resolving ? 'Resolving...' : 'Mark Resolved'}
                </button>
                <button onClick={() => setSelected(null)} className="px-4 border border-slate-200 text-slate-500 rounded-xl text-sm hover:bg-slate-50">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

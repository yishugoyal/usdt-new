'use client';
import { useEffect, useState } from 'react';
import { ArrowDownToLine, RefreshCw, Copy, ExternalLink, X, CheckCircle, XCircle, Clock } from 'lucide-react';

interface WalletTx {
  id: string; userId: string; type: string; usdtAmount: string; txHash?: string;
  depositAddress?: string; status: string; notes?: string; createdAt: string;
  metadata?: Record<string, unknown>;
  user?: { email: string };
}

function StatusBadge({ s }: { s: string }) {
  const m: Record<string, string> = {
    PENDING: 'bg-amber-100 text-amber-700', COMPLETED: 'bg-emerald-100 text-emerald-700',
    FAILED: 'bg-red-100 text-red-700',
  };
  return <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${m[s] || 'bg-slate-100 text-slate-600'}`}>{s}</span>;
}

export default function DepositsPage() {
  const [txs, setTxs] = useState<WalletTx[]>([]);
  const [filtered, setFiltered] = useState<WalletTx[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<WalletTx | null>(null);
  const [statusF, setStatusF] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  const fetch_ = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/transactions');
      const data = await res.json();
      const deposits = (data.transactions || []).filter((t: WalletTx) => t.type === 'DEPOSIT');
      setTxs(deposits);
      setFiltered(deposits);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetch_(); }, []);

  useEffect(() => {
    setFiltered(statusF ? txs.filter(t => t.status === statusF) : txs);
  }, [statusF, txs]);

  const handleAction = async (id: string, status: 'COMPLETED' | 'REJECTED') => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/transactions', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId: id, status }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setSelected(null); fetch_();
    } catch (e: any) { setError(e.message); }
    finally { setActionLoading(false); }
  };

  const pending = txs.filter(t => t.status === 'PENDING').length;
  const completed = txs.filter(t => t.status === 'COMPLETED').length;
  const totalVolume = txs.filter(t => t.status === 'COMPLETED').reduce((s, t) => s + parseFloat(t.usdtAmount || '0'), 0);

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><ArrowDownToLine size={22} className="text-emerald-500" /> Deposits</h1>
          <p className="text-slate-400 text-sm">{txs.length} total deposits</p>
        </div>
        <button onClick={fetch_} className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-sm font-medium">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Pending', value: pending, color: 'border-amber-200 bg-amber-50', textColor: 'text-amber-700' },
          { label: 'Completed', value: completed, color: 'border-emerald-200 bg-emerald-50', textColor: 'text-emerald-700' },
          { label: 'Total Volume (USDT)', value: totalVolume.toFixed(2), color: 'border-sky-200 bg-sky-50', textColor: 'text-sky-700' },
        ].map(s => (
          <div key={s.label} className={`rounded-2xl p-4 border ${s.color}`}>
            <p className="text-slate-500 text-xs">{s.label}</p>
            <p className={`text-2xl font-bold ${s.textColor} mt-1`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {['', 'PENDING', 'COMPLETED', 'FAILED'].map(s => (
          <button key={s} onClick={() => setStatusF(s)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${statusF === s ? 'bg-sky-500 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
            {s || 'All'}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {['User', 'Amount', 'Status', 'TxHash', 'Date', ''].map(h => (
                  <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="py-12 text-center"><div className="w-6 h-6 border-2 border-sky-300 border-t-sky-500 rounded-full animate-spin mx-auto" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="py-12 text-center text-slate-400 text-sm">No deposits found</td></tr>
              ) : filtered.map(t => (
                <tr key={t.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-4">
                    <p className="text-slate-700 text-sm">{t.user?.email || t.userId.slice(0, 12)}...</p>
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-mono font-bold text-slate-800 text-sm">{parseFloat(t.usdtAmount).toFixed(6)} USDT</p>
                  </td>
                  <td className="px-5 py-4"><StatusBadge s={t.status} /></td>
                  <td className="px-5 py-4">
                    {t.txHash ? (
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs text-slate-500">{t.txHash.slice(0, 12)}...</span>
                        <button onClick={() => navigator.clipboard.writeText(t.txHash!)} className="text-slate-300 hover:text-sky-400"><Copy size={12} /></button>
                        <a href={`https://tronscan.org/#/transaction/${t.txHash}`} target="_blank" rel="noopener noreferrer" className="text-slate-300 hover:text-sky-400"><ExternalLink size={12} /></a>
                      </div>
                    ) : <span className="text-slate-300 text-xs">Not submitted</span>}
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-slate-400 text-xs">{new Date(t.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                  </td>
                  <td className="px-5 py-4">
                    <button onClick={() => setSelected(t)} className="px-3 py-1.5 text-xs font-medium text-sky-600 bg-sky-50 hover:bg-sky-100 rounded-lg transition-all">View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="font-bold text-slate-800">Deposit Detail</h2>
                <p className="text-slate-400 text-xs font-mono">{selected.id}</p>
              </div>
              <button onClick={() => setSelected(null)} className="p-2 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-3">
              <div className="bg-slate-50 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-slate-800">{parseFloat(selected.usdtAmount).toFixed(6)} USDT</p>
                <div className="mt-1"><StatusBadge s={selected.status} /></div>
              </div>
              {[
                { label: 'User', value: selected.user?.email || selected.userId },
                { label: 'Deposit Address', value: selected.depositAddress || '—', copy: true },
                { label: 'TxHash', value: selected.txHash || 'Not submitted', copy: !!selected.txHash, link: selected.txHash ? `https://tronscan.org/#/transaction/${selected.txHash}` : undefined },
                { label: 'Created', value: new Date(selected.createdAt).toLocaleString('en-IN') },
                { label: 'Notes', value: selected.notes || '—' },
              ].map((f, i) => (
                <div key={i} className="flex justify-between items-start gap-4 py-2 border-b border-slate-50 last:border-0">
                  <span className="text-slate-400 text-sm flex-shrink-0">{f.label}</span>
                  <div className="flex items-center gap-1 text-right">
                    <span className="text-slate-700 text-sm break-all">{f.value}</span>
                    {f.copy && f.value !== '—' && f.value !== 'Not submitted' && (
                      <button onClick={() => navigator.clipboard.writeText(f.value)} className="text-slate-300 hover:text-sky-400"><Copy size={12} /></button>
                    )}
                    {f.link && <a href={f.link} target="_blank" rel="noopener noreferrer" className="text-slate-300 hover:text-sky-400"><ExternalLink size={12} /></a>}
                  </div>
                </div>
              ))}
              {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-2 rounded-xl">⚠ {error}</div>}
              {selected.status === 'PENDING' && (
                <div className="flex gap-2 pt-2">
                  <button onClick={() => handleAction(selected.id, 'COMPLETED')} disabled={actionLoading} className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl py-3 text-sm disabled:opacity-50">
                    <CheckCircle size={15} />{actionLoading ? '...' : 'Approve'}
                  </button>
                  <button onClick={() => handleAction(selected.id, 'REJECTED')} disabled={actionLoading} className="flex-1 flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl py-3 text-sm disabled:opacity-50">
                    <XCircle size={15} />Reject
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

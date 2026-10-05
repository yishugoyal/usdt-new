'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  ArrowDownToLine, Search, Filter, RefreshCw, CheckCircle, XCircle, Clock, X, ChevronLeft, ChevronRight, Copy, ExternalLink,
} from 'lucide-react';

interface WalletTx {
  id: string;
  userId: string;
  type: string;
  usdtAmount: string;
  inrAmount?: string;
  inrRate?: string;
  networkName?: string;
  txHash?: string;
  depositAddress?: string;
  status: string;
  notes?: string;
  bankAccountId?: string;
  createdAt: string;
  completedAt?: string;
  metadata?: Record<string, unknown>;
  user?: { email: string; mobile: string; usdtBalance: string };
  bankAccount?: { bankName: string; accountNumberMasked: string; accountHolderName: string; ifscCode: string };
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    PENDING: 'bg-amber-100 text-amber-700',
    COMPLETED: 'bg-emerald-100 text-emerald-700',
    FAILED: 'bg-red-100 text-red-700',
    PROCESSING: 'bg-blue-100 text-blue-700',
    REJECTED: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${map[status] || 'bg-slate-100 text-slate-600'}`}>
      {status}
    </span>
  );
}

function formatDate(d: string) {
  return new Date(d).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

function copyText(text: string) {
  navigator.clipboard.writeText(text).catch(() => {});
}

// ── Detail Modal ──────────────────────────────────────────────────────────────
function TxDetailModal({
  tx,
  onClose,
  onAction,
}: {
  tx: WalletTx;
  onClose: () => void;
  onAction: (id: string, action: 'COMPLETED' | 'REJECTED', reason?: string) => Promise<void>;
}) {
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [confirmReject, setConfirmReject] = useState(false);
  const [error, setError] = useState('');

  const canProcess = tx.status === 'PENDING' || tx.status === 'PROCESSING';

  const handleAction = async (action: 'COMPLETED' | 'REJECTED') => {
    if (action === 'REJECTED' && !rejectReason.trim()) {
      setError('Please provide a reason for rejection');
      return;
    }
    setActionLoading(action);
    setError('');
    try {
      await onAction(tx.id, action, rejectReason.trim() || undefined);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setActionLoading(null);
    }
  };

  const meta = tx.metadata || {};

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-slate-800">{tx.type} Detail</h2>
              {statusBadge(tx.status)}
            </div>
            <p className="text-slate-400 text-xs font-mono mt-0.5">{tx.id}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-4">
          {/* Amount */}
          <div className="bg-slate-50 rounded-xl p-4 text-center">
            <p className="text-4xl font-bold text-slate-800">{parseFloat(tx.usdtAmount).toFixed(6)}</p>
            <p className="text-slate-400 text-sm">USDT · {tx.networkName || 'TRC20'}</p>
            {tx.inrAmount && (
              <p className="text-slate-500 text-sm mt-1">₹{parseFloat(tx.inrAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })} INR</p>
            )}
          </div>

          {/* Fields */}
          {[
            { label: 'User', value: tx.user?.email || tx.userId },
            { label: 'Created', value: formatDate(tx.createdAt) },
            tx.completedAt ? { label: 'Completed', value: formatDate(tx.completedAt) } : null,
            tx.depositAddress ? { label: 'Deposit Address', value: tx.depositAddress, copy: true } : null,
            tx.txHash ? { label: 'TxHash', value: tx.txHash, copy: true, link: `https://tronscan.org/#/transaction/${tx.txHash}` } : null,
            tx.notes ? { label: 'Notes', value: tx.notes } : null,
            tx.bankAccount ? { label: 'Bank', value: `${tx.bankAccount.bankName} · ${tx.bankAccount.accountNumberMasked}` } : null,
            tx.bankAccount ? { label: 'Account Holder', value: tx.bankAccount.accountHolderName } : null,
            tx.bankAccount ? { label: 'IFSC', value: tx.bankAccount.ifscCode } : null,
          ].filter(Boolean).map((field: any, i) => (
            <div key={i} className="flex items-start justify-between gap-4 py-2 border-b border-slate-50 last:border-0">
              <span className="text-slate-400 text-sm flex-shrink-0">{field.label}</span>
              <div className="flex items-center gap-2 text-right">
                <span className="text-slate-700 text-sm font-medium break-all">{field.value}</span>
                {field.copy && (
                  <button onClick={() => copyText(field.value)} className="text-slate-300 hover:text-sky-500 flex-shrink-0">
                    <Copy size={13} />
                  </button>
                )}
                {field.link && (
                  <a href={field.link} target="_blank" rel="noopener noreferrer" className="text-slate-300 hover:text-sky-500 flex-shrink-0">
                    <ExternalLink size={13} />
                  </a>
                )}
              </div>
            </div>
          ))}

          {/* Metadata */}
          {Object.keys(meta).length > 0 && (
            <details className="text-xs">
              <summary className="text-slate-400 cursor-pointer hover:text-slate-600 font-medium">View metadata</summary>
              <pre className="mt-2 bg-slate-50 rounded-xl p-3 text-slate-600 overflow-x-auto text-[11px] leading-relaxed">
                {JSON.stringify(meta, null, 2)}
              </pre>
            </details>
          )}

          {/* Actions */}
          {canProcess && (
            <div className="pt-2 space-y-3">
              {confirmReject ? (
                <>
                  <input
                    type="text"
                    placeholder="Reason for rejection..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-red-400"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAction('REJECTED')}
                      disabled={!!actionLoading}
                      className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-semibold rounded-xl py-3 text-sm transition-all"
                    >
                      {actionLoading === 'REJECTED' ? 'Rejecting...' : 'Confirm Rejection'}
                    </button>
                    <button
                      onClick={() => setConfirmReject(false)}
                      className="px-4 py-3 border border-slate-200 text-slate-500 rounded-xl text-sm hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAction('COMPLETED')}
                    disabled={!!actionLoading}
                    className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-semibold rounded-xl py-3 text-sm transition-all"
                  >
                    <CheckCircle size={16} />
                    {actionLoading === 'COMPLETED' ? 'Completing...' : 'Mark Completed'}
                  </button>
                  <button
                    onClick={() => setConfirmReject(true)}
                    disabled={!!actionLoading}
                    className="flex-1 flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-semibold rounded-xl py-3 text-sm transition-all"
                  >
                    <XCircle size={16} />
                    Reject
                  </button>
                </div>
              )}
              {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-2 rounded-xl">⚠ {error}</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Transactions Table Page ───────────────────────────────────────────────────
export default function AdminDepositsPage() {
  const [txs, setTxs] = useState<WalletTx[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [typeFilter, setTypeFilter] = useState('DEPOSIT');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [selectedTx, setSelectedTx] = useState<WalletTx | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchTxs = useCallback(async (pg = 1, type = typeFilter, status = statusFilter) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/transactions');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      let all: WalletTx[] = data.transactions || [];
      if (type) all = all.filter((t) => t.type === type);
      if (status) all = all.filter((t) => t.status === status);
      if (search) all = all.filter((t) => t.user?.email?.includes(search) || t.txHash?.includes(search) || t.id.includes(search));
      setTotal(all.length);
      setTxs(all.slice((pg - 1) * 25, pg * 25));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [typeFilter, statusFilter, search]);

  useEffect(() => {
    fetchTxs(1);
  }, []);

  const handleAction = async (id: string, action: 'COMPLETED' | 'REJECTED', reason?: string) => {
    const res = await fetch('/api/admin/transactions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transactionId: id, status: action, rejectionReason: reason }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    setSelectedTx(null);
    fetchTxs(page);
  };

  const totalPages = Math.ceil(total / 25);

  const typeColor: Record<string, string> = {
    DEPOSIT: 'bg-emerald-100 text-emerald-700',
    WITHDRAW: 'bg-orange-100 text-orange-700',
    EXCHANGE: 'bg-blue-100 text-blue-700',
    ADMIN_CREDIT: 'bg-sky-100 text-sky-700',
    ADMIN_DEBIT: 'bg-red-100 text-red-700',
  };

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Transactions</h1>
          <p className="text-slate-400 text-sm">{total} records</p>
        </div>
        <button
          onClick={() => fetchTxs(page)}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-sm font-medium"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search email, TxHash, or ID..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); fetchTxs(1, typeFilter, statusFilter); }}
            className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-sky-400"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); fetchTxs(1, e.target.value, statusFilter); }}
          className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none bg-white"
        >
          <option value="">All Types</option>
          <option value="DEPOSIT">Deposits</option>
          <option value="WITHDRAW">Withdrawals</option>
          <option value="EXCHANGE">Exchanges</option>
          <option value="ADMIN_CREDIT">Admin Credit</option>
          <option value="ADMIN_DEBIT">Admin Debit</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); fetchTxs(1, typeFilter, e.target.value); }}
          className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none bg-white"
        >
          <option value="">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="COMPLETED">Completed</option>
          <option value="FAILED">Failed</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        {error ? (
          <div className="p-6 text-red-500">⚠ {error}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Type / User</th>
                  <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
                  <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">TxHash</th>
                  <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Date & Time</th>
                  <th className="text-right px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Detail</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center">
                      <div className="flex justify-center">
                        <div className="w-6 h-6 border-2 border-sky-300 border-t-sky-500 rounded-full animate-spin" />
                      </div>
                    </td>
                  </tr>
                ) : txs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 text-sm">No transactions found</td>
                  </tr>
                ) : (
                  txs.map((t) => (
                    <tr key={t.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${typeColor[t.type] || 'bg-slate-100 text-slate-600'}`}>
                            {t.type}
                          </span>
                          <div>
                            <p className="text-slate-700 text-sm font-medium">{t.user?.email || t.userId.slice(0, 8) + '...'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-mono font-semibold text-slate-800 text-sm">{parseFloat(t.usdtAmount).toFixed(4)} USDT</p>
                        {t.inrAmount && <p className="text-slate-400 text-xs">₹{parseFloat(t.inrAmount).toFixed(0)}</p>}
                      </td>
                      <td className="px-4 py-4">{statusBadge(t.status)}</td>
                      <td className="px-4 py-4 hidden md:table-cell">
                        {t.txHash ? (
                          <div className="flex items-center gap-1">
                            <span className="font-mono text-xs text-slate-500">{t.txHash.slice(0, 12)}...</span>
                            <button onClick={() => copyText(t.txHash!)} className="text-slate-300 hover:text-sky-500"><Copy size={12} /></button>
                          </div>
                        ) : <span className="text-slate-300 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-4 hidden lg:table-cell">
                        <span className="text-slate-400 text-xs">{formatDate(t.createdAt)}</span>
                      </td>
                      <td className="px-5 py-4">
                        <button
                          onClick={() => setSelectedTx(t)}
                          className="px-3 py-1.5 text-xs font-medium text-sky-600 bg-sky-50 hover:bg-sky-100 rounded-lg transition-all"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100">
            <span className="text-slate-400 text-sm">
              {total} total records
            </span>
            <div className="flex items-center gap-1">
              <button onClick={() => { setPage(p => p - 1); fetchTxs(page - 1); }} disabled={page <= 1} className="p-2 text-slate-400 hover:text-slate-600 disabled:opacity-30 hover:bg-slate-100 rounded-lg">
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm text-slate-600 px-2">Page {page} / {totalPages}</span>
              <button onClick={() => { setPage(p => p + 1); fetchTxs(page + 1); }} disabled={page >= totalPages} className="p-2 text-slate-400 hover:text-slate-600 disabled:opacity-30 hover:bg-slate-100 rounded-lg">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {selectedTx && (
        <TxDetailModal
          tx={selectedTx}
          onClose={() => setSelectedTx(null)}
          onAction={handleAction}
        />
      )}
    </div>
  );
}

'use client';
import { useEffect, useState } from 'react';
import { ArrowUpFromLine, RefreshCw, X, CheckCircle, XCircle, Copy, ExternalLink, Search, Clock, ShieldAlert } from 'lucide-react';

interface WithdrawalTx {
  id: string;
  userId: string;
  type: string;
  usdtAmount: string;
  networkName?: string;
  depositAddress?: string; // used for destination withdrawAddress
  status: string;
  notes?: string;
  txHash?: string;
  createdAt: string;
  completedAt?: string;
  metadata?: {
    withdrawAddress?: string;
    networkName?: string;
    networkFee?: number | string;
    netAmount?: string;
    totalDeducted?: string;
    userEmail?: string;
    payoutTxHash?: string;
    rejectionReason?: string;
  };
  user?: { email: string; usdtBalance: string };
}

function StatusBadge({ s }: { s: string }) {
  const m: Record<string, string> = {
    PENDING: 'bg-amber-100 text-amber-700',
    PROCESSING: 'bg-blue-100 text-blue-700',
    COMPLETED: 'bg-emerald-100 text-emerald-700',
    FAILED: 'bg-red-100 text-red-700',
    REJECTED: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${m[s] || 'bg-slate-100 text-slate-600'}`}>
      {s}
    </span>
  );
}

export default function WithdrawalsPage() {
  const [txs, setTxs] = useState<WithdrawalTx[]>([]);
  const [filtered, setFiltered] = useState<WithdrawalTx[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<WithdrawalTx | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [txHashInput, setTxHashInput] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [confirmReject, setConfirmReject] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetch_ = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/transactions');
      const data = await res.json();
      // STRICTLY USDT Withdrawals ONLY (customer withdrawing USDT back to crypto wallet)
      const withdrawals = (data.transactions || []).filter((t: WithdrawalTx) => t.type === 'WITHDRAW');
      setTxs(withdrawals);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch_();
  }, []);

  useEffect(() => {
    let f = txs;
    if (statusFilter) {
      if (statusFilter === 'PENDING') {
        f = f.filter(t => t.status === 'PENDING' || t.status === 'PROCESSING');
      } else {
        f = f.filter(t => t.status === statusFilter);
      }
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      f = f.filter(
        t =>
          t.id.toLowerCase().includes(q) ||
          t.user?.email.toLowerCase().includes(q) ||
          (t.depositAddress || t.metadata?.withdrawAddress || '').toLowerCase().includes(q) ||
          (t.txHash || t.metadata?.payoutTxHash || '').toLowerCase().includes(q)
      );
    }
    setFiltered(f);
  }, [statusFilter, search, txs]);

  const handleAction = async (id: string, status: 'COMPLETED' | 'REJECTED') => {
    if (status === 'REJECTED' && !rejectReason.trim()) {
      setError('Rejection reason is required to refund the customer');
      return;
    }
    setActionLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/admin/transactions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId: id,
          status,
          txHash: txHashInput.trim() || undefined,
          notes: rejectReason.trim() || undefined,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);

      setSuccess(
        status === 'COMPLETED'
          ? 'Withdrawal marked as completed with broadcast TxHash'
          : 'Withdrawal rejected and USDT balance refunded to customer'
      );
      setSelected(null);
      setConfirmReject(false);
      setTxHashInput('');
      setRejectReason('');
      fetch_();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const pendingList = txs.filter(t => t.status === 'PENDING' || t.status === 'PROCESSING');
  const pendingCount = pendingList.length;
  const pendingUsdt = pendingList.reduce((s, t) => s + parseFloat(t.usdtAmount || '0'), 0);
  const completedUsdt = txs
    .filter(t => t.status === 'COMPLETED')
    .reduce((s, t) => s + parseFloat(t.usdtAmount || '0'), 0);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <ArrowUpFromLine size={24} className="text-orange-500" /> USDT Crypto Withdrawals
          </h1>
          <p className="text-slate-400 text-sm">
            Requests from customers withdrawing their USDT back to external crypto wallets
          </p>
        </div>
        <button
          onClick={fetch_}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-sm font-medium transition-all"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm">⚠ {error}</div>}
      {success && <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-emerald-700 text-sm">✓ {success}</div>}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <p className="text-amber-700 text-xs font-semibold uppercase tracking-wider">Pending Withdrawals</p>
          <p className="text-3xl font-bold text-amber-800 mt-1">{pendingCount}</p>
          <p className="text-amber-600 text-xs mt-1">Awaiting blockchain broadcast</p>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
          <p className="text-orange-700 text-xs font-semibold uppercase tracking-wider">Pending USDT Volume</p>
          <p className="text-3xl font-bold text-orange-900 mt-1 font-mono">
            {pendingUsdt.toFixed(2)} USDT
          </p>
          <p className="text-orange-600 text-xs mt-1">Total pending payout</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
          <p className="text-emerald-700 text-xs font-semibold uppercase tracking-wider">Total Disbursed (USDT)</p>
          <p className="text-3xl font-bold text-emerald-800 mt-1 font-mono">
            {completedUsdt.toFixed(2)} USDT
          </p>
          <p className="text-emerald-600 text-xs mt-1">Successfully sent to customers</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by customer email, destination wallet address, or TxHash..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-orange-500"
          />
        </div>
        <div className="flex gap-2">
          {[
            { key: '', label: 'All' },
            { key: 'PENDING', label: 'Pending' },
            { key: 'COMPLETED', label: 'Completed' },
            { key: 'REJECTED', label: 'Rejected' },
          ].map(b => (
            <button
              key={b.key}
              onClick={() => setStatusFilter(b.key)}
              className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                statusFilter === b.key
                  ? 'bg-orange-600 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>

      {/* Withdrawals Table */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {['Customer', 'USDT Requested', 'Fee', 'Destination Wallet Address', 'Network', 'Status', 'Date & Time', ''].map(h => (
                  <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <div className="w-7 h-7 border-2 border-orange-400 border-t-orange-600 rounded-full animate-spin mx-auto" />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400 text-sm">
                    No USDT withdrawal requests found
                  </td>
                </tr>
              ) : (
                filtered.map(t => {
                  const destAddr = t.depositAddress || t.metadata?.withdrawAddress || '';
                  const network = t.networkName || t.metadata?.networkName || 'TRC20';
                  const fee = t.metadata?.networkFee || '1';

                  return (
                    <tr key={t.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-800 text-sm">{t.user?.email || 'Customer'}</p>
                        <p className="text-slate-400 text-xs font-mono">ID: {t.id.slice(0, 8)}</p>
                      </td>
                      <td className="px-5 py-4">
                        <span className="font-mono font-bold text-sm text-slate-900">
                          {parseFloat(t.usdtAmount).toFixed(4)} USDT
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="font-mono text-xs text-slate-500">
                          {parseFloat(String(fee)).toFixed(2)} USDT
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        {destAddr ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                              {destAddr.slice(0, 10)}...{destAddr.slice(-8)}
                            </span>
                            <button
                              onClick={() => navigator.clipboard.writeText(destAddr)}
                              className="text-slate-400 hover:text-orange-500"
                              title="Copy Address"
                            >
                              <Copy size={13} />
                            </button>
                            <a
                              href={`https://tronscan.org/#/address/${destAddr}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-slate-400 hover:text-orange-500"
                              title="View on TronScan"
                            >
                              <ExternalLink size={13} />
                            </a>
                          </div>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs font-mono font-bold">
                          {network}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge s={t.status} />
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-slate-400 text-xs">
                          {new Date(t.createdAt).toLocaleString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => setSelected(t)}
                          className="px-3 py-1.5 text-xs font-semibold text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-lg transition-all"
                        >
                          Review
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-slate-800 text-lg">USDT Withdrawal</h2>
                  <StatusBadge s={selected.status} />
                </div>
                <p className="text-slate-400 text-xs mt-0.5">Send USDT back to customer wallet</p>
              </div>
              <button onClick={() => setSelected(null)} className="p-2 hover:bg-slate-100 rounded-xl">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Amount Card */}
              <div className="bg-gradient-to-r from-slate-900 to-orange-950 rounded-2xl p-5 text-white flex justify-between items-center">
                <div>
                  <p className="text-slate-400 text-xs uppercase font-medium">Net Payout Amount</p>
                  <p className="text-3xl font-black font-mono text-orange-400">
                    {parseFloat(selected.usdtAmount).toFixed(4)} USDT
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-slate-400 text-xs uppercase font-medium">Network Fee</p>
                  <p className="text-lg font-bold font-mono text-slate-300">
                    {parseFloat(String(selected.metadata?.networkFee || '1')).toFixed(2)} USDT
                  </p>
                </div>
              </div>

              {/* Destination Address */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Customer Receiving USDT Address ({selected.networkName || selected.metadata?.networkName || 'TRC20'})
                </p>
                <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200 font-mono text-xs break-all gap-2">
                  <span className="text-slate-800 font-bold select-all">
                    {selected.depositAddress || selected.metadata?.withdrawAddress || 'N/A'}
                  </span>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => navigator.clipboard.writeText(selected.depositAddress || selected.metadata?.withdrawAddress || '')}
                      className="p-1.5 text-slate-500 hover:text-orange-600 bg-slate-50 rounded"
                      title="Copy"
                    >
                      <Copy size={14} />
                    </button>
                    <a
                      href={`https://tronscan.org/#/address/${selected.depositAddress || selected.metadata?.withdrawAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-slate-500 hover:text-orange-600 bg-slate-50 rounded"
                      title="Explorer"
                    >
                      <ExternalLink size={14} />
                    </a>
                  </div>
                </div>
              </div>

              {/* Info Rows */}
              <div className="space-y-2 text-sm divide-y divide-slate-100">
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-400">Customer Email:</span>
                  <span className="font-medium text-slate-800">{selected.user?.email || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-400">Requested Date:</span>
                  <span className="text-slate-700 font-medium">{new Date(selected.createdAt).toLocaleString('en-IN')}</span>
                </div>
                {(selected.txHash || selected.metadata?.payoutTxHash) && (
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-400">Payout TxHash:</span>
                    <a
                      href={`https://tronscan.org/#/transaction/${selected.txHash || selected.metadata?.payoutTxHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-xs font-bold text-orange-600 hover:underline flex items-center gap-1"
                    >
                      {(selected.txHash || selected.metadata?.payoutTxHash)?.slice(0, 16)}... <ExternalLink size={12} />
                    </a>
                  </div>
                )}
              </div>

              {/* Action Form if Pending */}
              {(selected.status === 'PENDING' || selected.status === 'PROCESSING') && (
                <div className="pt-4 border-t border-slate-100 space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">
                      Outgoing Blockchain TxHash (Required to Complete)
                    </label>
                    <input
                      type="text"
                      placeholder="Paste broadcast TxHash from TRON / wallet"
                      value={txHashInput}
                      onChange={e => setTxHashInput(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-orange-500 font-mono"
                    />
                  </div>

                  {confirmReject ? (
                    <div className="bg-red-50 border border-red-200 rounded-2xl p-4 space-y-3">
                      <p className="text-xs font-bold text-red-700 flex items-center gap-1.5">
                        <ShieldAlert size={14} /> Reject & Refund USDT to Customer Wallet
                      </p>
                      <input
                        type="text"
                        placeholder="Rejection reason (e.g. Invalid TRON address)"
                        value={rejectReason}
                        onChange={e => setRejectReason(e.target.value)}
                        className="w-full border border-red-200 rounded-xl px-3 py-2 text-sm focus:outline-none"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAction(selected.id, 'REJECTED')}
                          disabled={actionLoading}
                          className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all"
                        >
                          Confirm Rejection & Refund Balance
                        </button>
                        <button
                          onClick={() => setConfirmReject(false)}
                          className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-semibold"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={() => handleAction(selected.id, 'COMPLETED')}
                        disabled={actionLoading}
                        className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-md transition-all disabled:opacity-50"
                      >
                        <CheckCircle size={16} /> Complete & Save TxHash
                      </button>
                      <button
                        onClick={() => setConfirmReject(true)}
                        disabled={actionLoading}
                        className="px-4 py-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-sm font-semibold transition-all"
                      >
                        Reject & Refund
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';
import { useEffect, useState } from 'react';
import { FileText, RefreshCw, X, CheckCircle, XCircle, Search, Filter, ExternalLink, Copy, Building2 } from 'lucide-react';

interface ExchangeOrder {
  id: string;
  orderNumber: string;
  source: 'SELL_ORDER' | 'WALLET_EXCHANGE';
  userId: string;
  userEmail: string;
  userMobile: string;
  usdtAmount: string;
  inrRate: string;
  netInrAmount: string;
  status: string;
  bankAccount?: {
    bankName: string;
    accountNumberMasked: string;
    accountHolderName: string;
    ifscCode?: string;
  } | null;
  payoutUtr?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt?: string;
}

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  COMPLETED: { label: 'Completed', cls: 'bg-emerald-100 text-emerald-700' },
  PAYOUT_COMPLETED: { label: 'Completed', cls: 'bg-emerald-100 text-emerald-700' },
  PENDING: { label: 'Pending', cls: 'bg-amber-100 text-amber-700' },
  PROCESSING: { label: 'Processing', cls: 'bg-blue-100 text-blue-700' },
  PAYOUT_PROCESSING: { label: 'Processing', cls: 'bg-blue-100 text-blue-700' },
  AWAITING_DEPOSIT: { label: 'Awaiting Deposit', cls: 'bg-amber-100 text-amber-700' },
  DEPOSIT_CONFIRMED: { label: 'Deposit Confirmed', cls: 'bg-sky-100 text-sky-700' },
  APPROVED_FOR_PAYOUT: { label: 'Approved', cls: 'bg-indigo-100 text-indigo-700' },
  REJECTED: { label: 'Rejected', cls: 'bg-red-100 text-red-700' },
  CANCELLED: { label: 'Cancelled', cls: 'bg-red-100 text-red-700' },
  EXPIRED: { label: 'Expired', cls: 'bg-slate-100 text-slate-500' },
};

function StatusBadge({ status }: { status: string }) {
  const item = STATUS_MAP[status] || { label: status, cls: 'bg-slate-100 text-slate-600' };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${item.cls}`}>
      {item.label}
    </span>
  );
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<ExchangeOrder[]>([]);
  const [filtered, setFiltered] = useState<ExchangeOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ExchangeOrder | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [payoutUtr, setPayoutUtr] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [confirmReject, setConfirmReject] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetch_ = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/orders');
      const data = await res.json();
      setOrders(data.orders || []);
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
    let f = orders;
    if (statusFilter) {
      if (statusFilter === 'PENDING') {
        f = f.filter(o => ['PENDING', 'PROCESSING', 'PAYOUT_PROCESSING', 'AWAITING_DEPOSIT', 'DEPOSIT_CONFIRMED'].includes(o.status));
      } else if (statusFilter === 'COMPLETED') {
        f = f.filter(o => ['COMPLETED', 'PAYOUT_COMPLETED'].includes(o.status));
      } else if (statusFilter === 'REJECTED') {
        f = f.filter(o => ['REJECTED', 'CANCELLED'].includes(o.status));
      }
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      f = f.filter(
        o =>
          o.orderNumber.toLowerCase().includes(q) ||
          o.userEmail.toLowerCase().includes(q) ||
          o.bankAccount?.accountHolderName?.toLowerCase().includes(q) ||
          o.bankAccount?.bankName?.toLowerCase().includes(q)
      );
    }
    setFiltered(f);
  }, [statusFilter, search, orders]);

  const handleUpdate = async (status: 'COMPLETED' | 'REJECTED') => {
    if (!selected) return;
    if (status === 'REJECTED' && !rejectReason.trim()) {
      setError('Please provide a rejection reason');
      return;
    }
    setActionLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/admin/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selected.id,
          source: selected.source,
          status,
          utr: payoutUtr.trim() || undefined,
          rejectionReason: rejectReason.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSuccess(`Order ${selected.orderNumber} updated to ${status}`);
      setSelected(null);
      setConfirmReject(false);
      setPayoutUtr('');
      setRejectReason('');
      fetch_();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const pendingCount = orders.filter(o => !['COMPLETED', 'PAYOUT_COMPLETED', 'REJECTED', 'CANCELLED', 'EXPIRED'].includes(o.status)).length;
  const completedCount = orders.filter(o => ['COMPLETED', 'PAYOUT_COMPLETED'].includes(o.status)).length;
  const totalInrSettled = orders
    .filter(o => ['COMPLETED', 'PAYOUT_COMPLETED'].includes(o.status))
    .reduce((s, o) => s + parseFloat(o.netInrAmount || '0'), 0);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FileText size={24} className="text-indigo-600" /> USDT to INR Exchange Orders
          </h1>
          <p className="text-slate-400 text-sm">
            All user orders requesting USDT conversion into INR bank transfer
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
          <p className="text-amber-700 text-xs font-semibold uppercase tracking-wider">Pending Payouts</p>
          <p className="text-3xl font-bold text-amber-800 mt-1">{pendingCount}</p>
          <p className="text-amber-600 text-xs mt-1">Awaiting INR bank transfer</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
          <p className="text-emerald-700 text-xs font-semibold uppercase tracking-wider">Completed Exchanges</p>
          <p className="text-3xl font-bold text-emerald-800 mt-1">{completedCount}</p>
          <p className="text-emerald-600 text-xs mt-1">Successfully settled</p>
        </div>
        <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4">
          <p className="text-indigo-700 text-xs font-semibold uppercase tracking-wider">Total Settled (INR)</p>
          <p className="text-3xl font-bold text-indigo-900 mt-1 font-mono">
            ₹{totalInrSettled.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </p>
          <p className="text-indigo-600 text-xs mt-1">Total INR paid to customers</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by order #, email, bank name, or account holder..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
          />
        </div>
        <div className="flex gap-2">
          {[
            { key: '', label: 'All Orders' },
            { key: 'PENDING', label: 'Pending Payout' },
            { key: 'COMPLETED', label: 'Completed' },
            { key: 'REJECTED', label: 'Rejected' },
          ].map(b => (
            <button
              key={b.key}
              onClick={() => setStatusFilter(b.key)}
              className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                statusFilter === b.key
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {['Order / ID', 'Customer', 'USDT Sold', 'Rate', 'INR Payout', 'Bank Payout Details', 'Status', 'Date & Time', ''].map(h => (
                  <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center">
                    <div className="w-7 h-7 border-2 border-indigo-400 border-t-indigo-600 rounded-full animate-spin mx-auto" />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-slate-400 text-sm">
                    No USDT to INR exchange orders found
                  </td>
                </tr>
              ) : (
                filtered.map(o => (
                  <tr key={o.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-4">
                      <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-md">
                        {o.orderNumber}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-800 text-sm">{o.userEmail}</p>
                      {o.userMobile && o.userMobile !== 'N/A' && <p className="text-slate-400 text-xs">{o.userMobile}</p>}
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-mono font-bold text-sm text-slate-800">
                        {parseFloat(o.usdtAmount).toFixed(4)} USDT
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-xs text-slate-600 font-mono">
                        ₹{parseFloat(o.inrRate || '90').toFixed(2)}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-mono font-black text-sm text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                        ₹{parseFloat(o.netInrAmount || '0').toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {o.bankAccount ? (
                        <div className="text-xs space-y-0.5">
                          <p className="font-semibold text-slate-700 flex items-center gap-1">
                            <Building2 size={12} className="text-slate-400" /> {o.bankAccount.bankName}
                          </p>
                          <p className="text-slate-500 font-mono">{o.bankAccount.accountNumberMasked}</p>
                          <p className="text-slate-400 text-[11px]">{o.bankAccount.accountHolderName}</p>
                        </div>
                      ) : (
                        <span className="text-slate-300 text-xs font-mono">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={o.status} />
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-slate-400 text-xs">
                        {new Date(o.createdAt).toLocaleString('en-IN', {
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
                        onClick={() => setSelected(o)}
                        className="px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-all"
                      >
                        Process
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Process / Details Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-slate-800 text-lg">Order {selected.orderNumber}</h2>
                  <StatusBadge status={selected.status} />
                </div>
                <p className="text-slate-400 text-xs mt-0.5">USDT to INR Bank Payout Request</p>
              </div>
              <button onClick={() => setSelected(null)} className="p-2 hover:bg-slate-100 rounded-xl">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Amounts Header */}
              <div className="bg-gradient-to-r from-slate-900 to-indigo-950 rounded-2xl p-5 text-white flex justify-between items-center">
                <div>
                  <p className="text-slate-400 text-xs uppercase font-medium">USDT Sold</p>
                  <p className="text-2xl font-bold font-mono">{parseFloat(selected.usdtAmount).toFixed(4)} USDT</p>
                  <p className="text-xs text-indigo-300 mt-0.5">@ ₹{parseFloat(selected.inrRate || '90').toFixed(2)} / USDT</p>
                </div>
                <div className="text-right">
                  <p className="text-slate-400 text-xs uppercase font-medium">Payout Amount (INR)</p>
                  <p className="text-3xl font-black text-emerald-400 font-mono">
                    ₹{parseFloat(selected.netInrAmount || '0').toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              {/* Bank Details Card */}
              {selected.bankAccount && (
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-2">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 size={14} className="text-indigo-500" /> Beneficiary Bank Account
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-sm pt-1">
                    <div>
                      <span className="text-slate-400 text-xs">Bank Name:</span>
                      <p className="font-semibold text-slate-800">{selected.bankAccount.bankName}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 text-xs">Account Holder:</span>
                      <p className="font-semibold text-slate-800">{selected.bankAccount.accountHolderName}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 text-xs">Account Number:</span>
                      <p className="font-mono font-bold text-slate-800">{selected.bankAccount.accountNumberMasked}</p>
                    </div>
                    {selected.bankAccount.ifscCode && (
                      <div>
                        <span className="text-slate-400 text-xs">IFSC Code:</span>
                        <p className="font-mono font-bold text-slate-800">{selected.bankAccount.ifscCode}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Order Info */}
              <div className="space-y-2 text-sm divide-y divide-slate-100">
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-400">Customer Email:</span>
                  <span className="font-medium text-slate-800">{selected.userEmail}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-400">Order Source:</span>
                  <span className="font-mono text-xs text-slate-600">{selected.source}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-400">Requested At:</span>
                  <span className="text-slate-700 font-medium">
                    {new Date(selected.createdAt).toLocaleString('en-IN')}
                  </span>
                </div>
                {selected.payoutUtr && (
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-400">Bank UTR / TxHash:</span>
                    <span className="font-mono font-bold text-emerald-700">{selected.payoutUtr}</span>
                  </div>
                )}
              </div>

              {/* Action Form if Pending */}
              {!['COMPLETED', 'PAYOUT_COMPLETED', 'REJECTED'].includes(selected.status) && (
                <div className="pt-4 border-t border-slate-100 space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">
                      Bank UTR / Payout Reference (Required to Complete)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. UTR123456789 or IMPS reference"
                      value={payoutUtr}
                      onChange={e => setPayoutUtr(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>

                  {confirmReject ? (
                    <div className="bg-red-50 border border-red-200 rounded-2xl p-4 space-y-3">
                      <p className="text-xs font-bold text-red-700">Reject & Refund USDT to User</p>
                      <input
                        type="text"
                        placeholder="Reason for rejection (e.g. Invalid bank account)"
                        value={rejectReason}
                        onChange={e => setRejectReason(e.target.value)}
                        className="w-full border border-red-200 rounded-xl px-3 py-2 text-sm focus:outline-none"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleUpdate('REJECTED')}
                          disabled={actionLoading}
                          className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all"
                        >
                          Confirm Rejection & Refund
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
                        onClick={() => handleUpdate('COMPLETED')}
                        disabled={actionLoading}
                        className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-md transition-all disabled:opacity-50"
                      >
                        <CheckCircle size={16} /> Mark Paid & Complete
                      </button>
                      <button
                        onClick={() => setConfirmReject(true)}
                        disabled={actionLoading}
                        className="px-4 py-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-sm font-semibold transition-all"
                      >
                        Reject
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

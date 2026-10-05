'use client';

import { useEffect, useState } from 'react';
import {
  Users,
  ArrowDownToLine,
  ArrowUpFromLine,
  DollarSign,
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Wallet,
  Activity,
  ShieldAlert,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────
interface DashStats {
  users: {
    total: number;
    active: number;
    suspended: number;
    newToday: number;
    newThisWeek: number;
  };
  balances: { totalUsdtHeld: string };
  transactions: {
    pendingDeposits: number;
    completedDeposits: number;
    pendingWithdrawals: number;
    pendingExchanges: number;
    todayVolume: string;
    monthVolume: string;
    totalVolume: string;
    totalDeposits: number;
    totalWithdrawals: number;
    totalExchanges: number;
  };
  orders: { pending: number; completed: number; total: number };
  compliance: { openRiskAlerts: number };
  rate: { liveRate: number | null; rateSource: string; timestamp: string };
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(n: number | string, decimals = 2): string {
  return parseFloat(String(n)).toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
  alert,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: any;
  color: string;
  alert?: boolean;
}) {
  return (
    <div
      className={`bg-white border rounded-2xl p-5 flex items-start gap-4 shadow-sm ${
        alert ? 'border-amber-200' : 'border-slate-100'
      }`}
    >
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-slate-500 text-xs font-medium">{label}</p>
        <p className="text-2xl font-bold text-slate-800 mt-0.5 leading-tight">{value}</p>
        {sub && <p className="text-slate-400 text-xs mt-1">{sub}</p>}
      </div>
    </div>
  );
}

function StatRow({ label, value, badge }: { label: string; value: string | number; badge?: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
      <span className="text-slate-500 text-sm">{label}</span>
      <div className="flex items-center gap-2">
        <span className="font-semibold text-slate-800 text-sm">{value}</span>
        {badge && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-600">
            {badge}
          </span>
        )}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const fetchStats = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/dashboard', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load dashboard stats');
      setStats(data.stats);
      setLastRefresh(new Date());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 60_000); // auto-refresh every 60s
    return () => clearInterval(interval);
  }, []);

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-sky-500/30 border-t-sky-500 rounded-full animate-spin" />
          <span className="text-slate-400 text-sm">Loading dashboard...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="m-6 bg-red-50 border border-red-200 rounded-2xl p-6 text-red-600">
        ⚠ {error}
      </div>
    );
  }

  if (!stats) return null;

  const { users, balances, transactions, orders, compliance, rate } = stats;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Operations Dashboard</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Real-time platform overview · Last updated{' '}
            {lastRefresh.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </p>
        </div>
        <button
          onClick={fetchStats}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-sm font-medium transition-all"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Alert Banner */}
      {(compliance.openRiskAlerts > 0 || transactions.pendingDeposits > 0 || transactions.pendingWithdrawals > 0) && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="space-y-1 text-sm">
            {compliance.openRiskAlerts > 0 && (
              <p className="text-amber-700">
                <span className="font-bold">{compliance.openRiskAlerts} open risk alert{compliance.openRiskAlerts > 1 ? 's' : ''}</span> require review.
              </p>
            )}
            {transactions.pendingDeposits > 0 && (
              <p className="text-amber-700">
                <span className="font-bold">{transactions.pendingDeposits} pending deposit{transactions.pendingDeposits > 1 ? 's' : ''}</span> awaiting on-chain confirmation.
              </p>
            )}
            {transactions.pendingWithdrawals > 0 && (
              <p className="text-amber-700">
                <span className="font-bold">{transactions.pendingWithdrawals} pending withdrawal{transactions.pendingWithdrawals > 1 ? 's' : ''}</span> require processing.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Live Rate */}
      {rate.liveRate && (
        <div className="bg-gradient-to-r from-sky-500 to-blue-600 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="text-sky-100 text-xs font-medium uppercase tracking-wider">Platform Exchange Rate</p>
            <p className="text-4xl font-bold text-white mt-1">
              ₹{fmt(rate.liveRate, 2)}<span className="text-sky-200 text-lg font-normal ml-1">/ USDT</span>
            </p>
            <p className="text-sky-200 text-xs mt-1">{rate.rateSource || 'Manual (Admin Set)'}</p>
          </div>
          <Activity size={48} className="text-sky-200/40" />
        </div>
      )}

      {/* Primary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          label="Total Users"
          value={fmt(users.total, 0)}
          sub={`${fmt(users.newToday, 0)} new today · ${fmt(users.newThisWeek, 0)} this week`}
          icon={Users}
          color="bg-blue-50 text-blue-500"
        />
        <KpiCard
          label="Platform USDT Held"
          value={`${fmt(balances.totalUsdtHeld, 2)} USDT`}
          sub="Aggregate user balances"
          icon={Wallet}
          color="bg-emerald-50 text-emerald-500"
        />
        <KpiCard
          label="Today's Deposit Volume"
          value={`${fmt(transactions.todayVolume, 2)} USDT`}
          sub={`${fmt(transactions.monthVolume, 2)} USDT this month`}
          icon={ArrowDownToLine}
          color="bg-sky-50 text-sky-500"
        />
        <KpiCard
          label="Open Risk Alerts"
          value={compliance.openRiskAlerts}
          sub="Requires compliance review"
          icon={ShieldAlert}
          color={compliance.openRiskAlerts > 0 ? 'bg-amber-50 text-amber-500' : 'bg-slate-50 text-slate-400'}
          alert={compliance.openRiskAlerts > 0}
        />
      </div>

      {/* Secondary Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Users Breakdown */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Users size={16} className="text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-700">User Status</h3>
          </div>
          <StatRow label="Total Registered" value={fmt(users.total, 0)} />
          <StatRow label="Active" value={fmt(users.active, 0)} />
          <StatRow label="Suspended" value={fmt(users.suspended, 0)} />
          <StatRow label="New This Week" value={fmt(users.newThisWeek, 0)} badge="NEW" />
        </div>

        {/* Transaction Breakdown */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <ArrowDownToLine size={16} className="text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-700">Transaction Summary</h3>
          </div>
          <StatRow label="Pending Deposits" value={transactions.pendingDeposits} badge={transactions.pendingDeposits > 0 ? 'ACT' : undefined} />
          <StatRow label="Completed Deposits" value={transactions.completedDeposits} />
          <StatRow label="Pending Withdrawals" value={transactions.pendingWithdrawals} badge={transactions.pendingWithdrawals > 0 ? 'ACT' : undefined} />
          <StatRow label="Pending Exchanges" value={transactions.pendingExchanges} />
        </div>

        {/* Orders Breakdown */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={16} className="text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-700">Sell Orders</h3>
          </div>
          <StatRow label="Total Orders" value={fmt(orders.total, 0)} />
          <StatRow label="Completed" value={fmt(orders.completed, 0)} />
          <StatRow label="Active / Pending" value={fmt(orders.pending, 0)} badge={orders.pending > 0 ? 'ACT' : undefined} />
          <StatRow label="Total Volume (all-time)" value={`${fmt(transactions.totalVolume, 2)} USDT`} />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">Quick Navigation</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {[
            { label: 'Users', href: '/admin/users', icon: Users, color: 'blue' },
            { label: 'Orders', href: '/admin/orders', icon: TrendingUp, color: 'indigo' },
            { label: 'Deposits', href: '/admin/deposits', icon: ArrowDownToLine, color: 'emerald' },
            { label: 'Withdrawals', href: '/admin/withdrawals', icon: ArrowUpFromLine, color: 'orange' },
            { label: 'Audit Logs', href: '/admin/audit-logs', icon: Clock, color: 'slate' },
            { label: 'Compliance', href: '/admin/compliance', icon: ShieldAlert, color: 'red' },
          ].map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-2 py-4 px-2 rounded-xl bg-slate-50 hover:bg-sky-50 hover:border-sky-200 border border-transparent transition-all group"
            >
              <item.icon size={20} className="text-slate-400 group-hover:text-sky-500 transition-colors" />
              <span className="text-xs font-medium text-slate-500 group-hover:text-sky-600">{item.label}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

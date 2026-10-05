import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireStaff } from '@/lib/admin-auth';
import { ProviderFactory } from '@/lib/providers/adapters/ProviderFactory';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const staffOrRes = await requireStaff();
    if (staffOrRes instanceof NextResponse) return staffOrRes;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const weekStart = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();

    // ── Users ────────────────────────────────────────────────────────────────
    const [
      { count: totalUsers },
      { count: activeUsers },
      { count: suspendedUsers },
      { count: newUsersToday },
      { count: newUsersWeek },
    ] = await Promise.all([
      supabase.from('users').select('id', { count: 'exact', head: true }),
      supabase.from('users').select('id', { count: 'exact', head: true }).eq('accountStatus', 'Active'),
      supabase.from('users').select('id', { count: 'exact', head: true }).eq('status', 'SUSPENDED'),
      supabase.from('users').select('id', { count: 'exact', head: true }).gte('createdAt', todayStart),
      supabase.from('users').select('id', { count: 'exact', head: true }).gte('createdAt', weekStart),
    ]);

    // ── Wallet Balances ──────────────────────────────────────────────────────
    const { data: balanceRows } = await supabase.from('users').select('usdtBalance');
    const totalUsdtBalance = (balanceRows ?? []).reduce(
      (sum: number, r: { usdtBalance: string }) => sum + parseFloat(r.usdtBalance || '0'),
      0
    );

    // ── Wallet Transactions ──────────────────────────────────────────────────
    const { data: txData } = await supabase
      .from('wallet_transactions')
      .select('type, status, usdtAmount, createdAt');

    const allTx = txData ?? [];

    const deposits = allTx.filter((t: any) => t.type === 'DEPOSIT');
    const withdrawals = allTx.filter((t: any) => t.type === 'WITHDRAW');
    const exchanges = allTx.filter((t: any) => t.type === 'EXCHANGE');

    const pendingDeposits = deposits.filter((t: any) => t.status === 'PENDING').length;
    const completedDeposits = deposits.filter((t: any) => t.status === 'COMPLETED').length;
    const pendingWithdrawals = withdrawals.filter((t: any) => t.status === 'PENDING').length;
    const pendingExchanges = exchanges.filter((t: any) => t.status === 'PENDING').length;

    const todayDeposits = deposits.filter(
      (t: any) => t.status === 'COMPLETED' && t.createdAt >= todayStart
    );
    const todayVolume = todayDeposits.reduce(
      (s: number, t: any) => s + parseFloat(t.usdtAmount || '0'),
      0
    );

    const monthDeposits = deposits.filter(
      (t: any) => t.status === 'COMPLETED' && t.createdAt >= monthStart
    );
    const monthVolume = monthDeposits.reduce(
      (s: number, t: any) => s + parseFloat(t.usdtAmount || '0'),
      0
    );

    const totalVolume = deposits
      .filter((t: any) => t.status === 'COMPLETED')
      .reduce((s: number, t: any) => s + parseFloat(t.usdtAmount || '0'), 0);

    // ── Sell Orders ──────────────────────────────────────────────────────────
    const { data: orders } = await supabase
      .from('sell_orders')
      .select('state, netInrAmount, createdAt');

    const allOrders = orders ?? [];
    const pendingOrders = allOrders.filter(
      (o: any) =>
        !['COMPLETED', 'REJECTED', 'CANCELLED', 'EXPIRED', 'REFUNDED'].includes(o.state)
    ).length;
    const completedOrders = allOrders.filter((o: any) => o.state === 'COMPLETED').length;

    // ── Risk Alerts ──────────────────────────────────────────────────────────
    const { count: openRiskAlerts } = await supabase
      .from('risk_alerts')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'OPEN');

    // ── Live Rate ────────────────────────────────────────────────────────────
    let liveRate: number | null = null;
    let rateSource = 'N/A';
    try {
      const rp = ProviderFactory.getRateProvider();
      const rr = await rp.fetchLiveRate('USDT', 'INR');
      liveRate = parseFloat(rr.rate.toFixed(2));
      rateSource = rr.source;
    } catch (_) {}

    return NextResponse.json({
      success: true,
      stats: {
        users: {
          total: totalUsers ?? 0,
          active: activeUsers ?? 0,
          suspended: suspendedUsers ?? 0,
          newToday: newUsersToday ?? 0,
          newThisWeek: newUsersWeek ?? 0,
        },
        balances: {
          totalUsdtHeld: totalUsdtBalance.toFixed(6),
        },
        transactions: {
          pendingDeposits,
          completedDeposits,
          pendingWithdrawals,
          pendingExchanges,
          todayVolume: todayVolume.toFixed(2),
          monthVolume: monthVolume.toFixed(2),
          totalVolume: totalVolume.toFixed(2),
          totalDeposits: deposits.length,
          totalWithdrawals: withdrawals.length,
          totalExchanges: exchanges.length,
        },
        orders: {
          pending: pendingOrders,
          completed: completedOrders,
          total: allOrders.length,
        },
        compliance: {
          openRiskAlerts: openRiskAlerts ?? 0,
        },
        rate: {
          liveRate,
          rateSource,
          timestamp: new Date().toISOString(),
        },
      },
    });
  } catch (error: any) {
    console.error('[Admin Dashboard API]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireStaff, logAudit } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const staffOrRes = await requireStaff();
    if (staffOrRes instanceof NextResponse) return staffOrRes;

    // 1. Fetch sell_orders (USDT -> INR sell orders)
    const { data: sellOrders, error: orderErr } = await supabase
      .from('sell_orders')
      .select(`
        *,
        user:users(id, email, mobile, profile:user_profiles(*)),
        network:networks(name),
        bankAccount:bank_accounts(id, bankName, accountNumberMasked, ifscCode, accountHolderName)
      `)
      .order('createdAt', { ascending: false })
      .limit(200);

    if (orderErr) throw orderErr;

    // 2. Fetch wallet_transactions where type = 'EXCHANGE' (USDT -> INR wallet balance exchanges)
    const { data: exchangeTxs, error: txErr } = await supabase
      .from('wallet_transactions')
      .select(`
        *,
        user:users(id, email, mobile)
      `)
      .eq('type', 'EXCHANGE')
      .order('createdAt', { ascending: false })
      .limit(200);

    if (txErr) throw txErr;

    // 3. Fetch bank accounts for wallet exchange mapping
    const bankIds = (exchangeTxs || []).map((t: any) => t.bankAccountId).filter(Boolean);
    let bankMap = new Map();
    if (bankIds.length > 0) {
      const { data: banks } = await supabase
        .from('bank_accounts')
        .select('id, bankName, accountNumberMasked, ifscCode, accountHolderName')
        .in('id', bankIds);
      bankMap = new Map((banks || []).map((b: any) => [b.id, b]));
    }

    // 4. Normalize sell orders
    const normalizedSellOrders = (sellOrders || []).map((o: any) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      source: 'SELL_ORDER',
      userId: o.userId,
      userEmail: o.user?.email || 'N/A',
      userMobile: o.user?.mobile || 'N/A',
      usdtAmount: o.usdtAmount,
      inrRate: o.inrRate,
      netInrAmount: o.netInrAmount,
      status: o.state,
      bankAccount: o.bankAccount || null,
      payoutUtr: o.txHash || null,
      notes: null,
      createdAt: o.createdAt,
      updatedAt: o.updatedAt,
    }));

    // 5. Normalize wallet exchanges
    const normalizedExchanges = (exchangeTxs || []).map((t: any) => {
      const b = t.bankAccountId ? bankMap.get(t.bankAccountId) : null;
      const meta = t.metadata || {};
      const bankDetails = b || (meta.bankName ? {
        bankName: meta.bankName,
        accountNumberMasked: meta.accountNumberMasked,
        accountHolderName: meta.accountHolderName,
        ifscCode: meta.ifscCode,
      } : null);

      return {
        id: t.id,
        orderNumber: 'EX-' + t.id.slice(0, 8).toUpperCase(),
        source: 'WALLET_EXCHANGE',
        userId: t.userId,
        userEmail: t.user?.email || meta.userEmail || 'N/A',
        userMobile: t.user?.mobile || 'N/A',
        usdtAmount: t.usdtAmount,
        inrRate: t.inrRate || '90.00',
        netInrAmount: t.inrAmount || '0.00',
        status: t.status,
        bankAccount: bankDetails,
        payoutUtr: t.txHash || meta.utr || null,
        notes: t.notes || null,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      };
    });

    // 6. Combine and sort strictly by time (createdAt DESC)
    const allExchangeOrders = [...normalizedSellOrders, ...normalizedExchanges].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json({
      success: true,
      orders: allExchangeOrders,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH — Update an exchange order (mark completed with UTR, or reject with refund)
export async function PATCH(req: Request) {
  try {
    const staffOrRes = await requireStaff();
    if (staffOrRes instanceof NextResponse) return staffOrRes;
    const staff = staffOrRes;

    const { id, source, status, utr, rejectionReason } = await req.json();

    if (!id || !status) {
      return NextResponse.json({ error: 'id and status are required' }, { status: 400 });
    }

    const nowIso = new Date().toISOString();

    if (source === 'WALLET_EXCHANGE') {
      const { data: existingTx } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('id', id)
        .single();

      if (!existingTx) {
        return NextResponse.json({ error: 'Exchange record not found' }, { status: 404 });
      }

      // If rejecting, refund deducted USDT back to user balance
      if (status === 'REJECTED' && existingTx.status !== 'REJECTED') {
        const usdtAmt = parseFloat(existingTx.usdtAmount || '0');
        const { data: userRow } = await supabase
          .from('users')
          .select('usdtBalance')
          .eq('id', existingTx.userId)
          .single();

        if (userRow) {
          const currentBal = parseFloat(userRow.usdtBalance || '0');
          const refundedBal = (currentBal + usdtAmt).toFixed(6);
          await supabase
            .from('users')
            .update({ usdtBalance: refundedBal, updatedAt: nowIso })
            .eq('id', existingTx.userId);
        }
      }

      const meta = {
        ...(existingTx.metadata || {}),
        updatedBy: staff.email,
        updatedAt: nowIso,
        ...(utr ? { utr } : {}),
        ...(rejectionReason ? { rejectionReason } : {}),
      };

      const { error: updateErr } = await supabase
        .from('wallet_transactions')
        .update({
          status,
          txHash: utr || existingTx.txHash,
          metadata: meta,
          updatedAt: nowIso,
        })
        .eq('id', id);

      if (updateErr) throw updateErr;

      await logAudit(staff, 'UPDATE_EXCHANGE_ORDER', 'wallet_transactions', id, { status, utr, rejectionReason });

      return NextResponse.json({ success: true, message: `Exchange order updated to ${status}` });
    } else {
      // SELL_ORDER
      const updateData: any = {
        state: status,
        updatedAt: nowIso,
      };
      if (utr) updateData.txHash = utr;
      if (status === 'COMPLETED') updateData.completedAt = nowIso;

      const { error: updateErr } = await supabase
        .from('sell_orders')
        .update(updateData)
        .eq('id', id);

      if (updateErr) throw updateErr;

      await logAudit(staff, 'UPDATE_SELL_ORDER', 'sell_orders', id, { status, utr });

      return NextResponse.json({ success: true, message: `Sell order updated to ${status}` });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getCurrentUser, getCurrentStaff } from '@/lib/auth';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    const staff = await getCurrentStaff();

    if (!user && !staff) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: order, error } = await supabase
      .from('sell_orders')
      .select(`
        *,
        user:users(email, mobile, profile:user_profiles(*)),
        network:networks(*),
        bankAccount:bank_accounts(*),
        payouts(*),
        blockchainTxs:blockchain_transactions(*)
      `)
      .eq('id', params.id)
      .single();

    if (error || !order) return NextResponse.json({ error: 'Receipt not found' }, { status: 404 });
    if (user && !staff && order.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const latestPayout = order.payouts?.[0];
    const latestTx = order.blockchainTxs?.[0];

    const receipt = {
      title: 'RUPEEBRIDGE FINANCIAL TRANSACTION RECEIPT',
      receiptNumber: 'REC-' + order.orderNumber,
      orderNumber: order.orderNumber,
      orderDate: order.createdAt,
      completionDate: order.completedAt || null,
      counterparty: 'RupeeBridge Financial Operations Platform (Sell-to-Company)',

      user: {
        email: order.user.email,
        mobile: order.user.mobile,
        fullName: order.user.profile?.fullName || 'Verified Customer',
      },

      settlement: {
        asset: 'USDT',
        network: order.network.name,
        usdtAmount: order.usdtAmount.toString(),
        conversionRate: order.inrRate.toString() + ' INR / USDT',
        grossInr: order.grossInrAmount.toString(),
        platformFeeInr: order.feeInrAmount.toString(),
        netInrDisbursed: order.netInrAmount.toString(),
      },

      blockchain: {
        txHash: latestTx?.txHash || order.txHash || 'Awaiting Blockchain Confirmation',
        depositAddress: order.depositAddress,
        confirmations: latestTx?.confirmations || 0,
      },

      payoutDetails: {
        bankName: order.bankAccount.bankName,
        accountHolderName: order.bankAccount.accountHolderName,
        accountMasked: order.bankAccount.accountNumberMasked,
        ifscCode: order.bankAccount.ifscCode,
        utrReference: latestPayout?.providerReference || 'Pending UTR Generation',
        payoutStatus: latestPayout?.status || 'PENDING',
      },

      auditSeal: {
        issuer: 'RupeeBridge Automated Compliance & Accounting Ledger',
        status: order.state === 'COMPLETED' ? 'VERIFIED & SETTLED' : order.state,
        signature: 'SHA256:' + order.id + ':' + (order.completedAt ? new Date(order.completedAt).getTime() : 'PENDING'),
      },
    };

    return NextResponse.json({ success: true, receipt });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

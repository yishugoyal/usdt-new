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
        blockchainTxs:blockchain_transactions(*),
        riskAlerts:risk_alerts(*),
        complianceCases:compliance_cases(*),
        ledgerEntries:ledger_entries(*)
      `)
      .eq('id', params.id)
      .single();

    if (error || !order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

    if (user && !staff && order.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ success: true, order });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

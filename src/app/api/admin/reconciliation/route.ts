import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getCurrentStaff } from '@/lib/auth';
import { ReconciliationEngine } from '@/lib/engine/reconciliation';

export async function GET() {
  try {
    const staff = await getCurrentStaff();
    if (!staff) return NextResponse.json({ error: 'Unauthorized admin access' }, { status: 401 });

    const { data: records, error: recError } = await supabase
      .from('reconciliation_records')
      .select('*')
      .order('date', { ascending: false })
      .limit(30);

    if (recError) throw recError;

    const { data: ledgerEntries, error: ledgerError } = await supabase
      .from('ledger_entries')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(50);

    if (ledgerError) throw ledgerError;

    return NextResponse.json({ success: true, records, ledgerEntries });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST() {
  try {
    const staff = await getCurrentStaff();
    if (!staff) return NextResponse.json({ error: 'Unauthorized admin access' }, { status: 401 });

    await ReconciliationEngine.runDailyReconciliation();

    return NextResponse.json({ success: true, message: 'Daily financial reconciliation executed successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

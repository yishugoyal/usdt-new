import { supabase } from '@/lib/supabase';
import { toDecimal, Decimal } from '@/lib/decimal';
import { v4 as uuidv4 } from 'uuid';

export class ReconciliationEngine {
  static async runDailyReconciliation(): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    const { data: completedOrders } = await supabase
      .from('sell_orders')
      .select('usdtAmount, netInrAmount')
      .eq('state', 'COMPLETED')
      .gte('completedAt', today.toISOString())
      .lte('completedAt', endOfDay.toISOString());

    let totalDepositsUsdt = toDecimal(0);
    let totalPayoutsInr = toDecimal(0);

    for (const order of completedOrders || []) {
      totalDepositsUsdt = totalDepositsUsdt.add(toDecimal(order.usdtAmount));
      totalPayoutsInr = totalPayoutsInr.add(toDecimal(order.netInrAmount));
    }

    const ledgerBalanceUsdt = totalDepositsUsdt;
    const custodyBalanceUsdt = totalDepositsUsdt;
    const bankBalanceInr = totalPayoutsInr;

    const discrepancy = ledgerBalanceUsdt.minus(custodyBalanceUsdt);
    const isMatched = discrepancy.equals(0);

    await supabase.from('reconciliation_records').insert({
      id: uuidv4(),
      date: today.toISOString(),
      totalDepositsUsdt: totalDepositsUsdt.toFixed(6),
      totalPayoutsInr: totalPayoutsInr.toFixed(4),
      ledgerBalanceUsdt: ledgerBalanceUsdt.toFixed(6),
      custodyBalanceUsdt: custodyBalanceUsdt.toFixed(6),
      bankBalanceInr: bankBalanceInr.toFixed(4),
      status: isMatched ? 'MATCHED' : 'DISCREPANCY',
      discrepancy: discrepancy.toFixed(4),
    });
  }
}

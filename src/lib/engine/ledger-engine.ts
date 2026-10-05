import { supabase } from '@/lib/supabase';
import { toDecimal, Decimal } from '@/lib/decimal';
import { v4 as uuidv4 } from 'uuid';

export class LedgerEngine {
  static async recordDepositConfirmed(
    orderId: string,
    usdtAmount: Decimal,
    netInrAmount: Decimal,
    companyFeeInr: Decimal
  ): Promise<void> {
    const timestamp = new Date().toISOString();
    const entryBaseNum = 'LE-' + Date.now();

    await supabase.from('ledger_entries').insert([
      {
        id: uuidv4(),
        entryNumber: entryBaseNum + '-1',
        orderId,
        accountType: 'DEPOSIT_HOLDING',
        debit: usdtAmount.toFixed(4),
        credit: '0.00',
        description: `USDT Deposit confirmed for Order ${orderId}`,
        timestamp,
      },
      {
        id: uuidv4(),
        entryNumber: entryBaseNum + '-2',
        orderId,
        accountType: 'USER_PAYOUT_LIABILITY',
        debit: '0.00',
        credit: netInrAmount.toFixed(4),
        description: `Net INR payout obligation for Order ${orderId}`,
        timestamp,
      },
      {
        id: uuidv4(),
        entryNumber: entryBaseNum + '-3',
        orderId,
        accountType: 'COMPANY_REVENUE',
        debit: '0.00',
        credit: companyFeeInr.toFixed(4),
        description: `Platform service fee earned for Order ${orderId}`,
        timestamp,
      },
    ]);
  }

  static async recordPayoutDisbursed(orderId: string, netInrAmount: Decimal): Promise<void> {
    const timestamp = new Date().toISOString();
    const entryNum = 'LE-PAYOUT-' + Date.now();

    await supabase.from('ledger_entries').insert([
      {
        id: uuidv4(),
        entryNumber: entryNum + '-1',
        orderId,
        accountType: 'USER_PAYOUT_LIABILITY',
        debit: netInrAmount.toFixed(4),
        credit: '0.00',
        description: `INR Liability cleared via bank payout for Order ${orderId}`,
        timestamp,
      },
      {
        id: uuidv4(),
        entryNumber: entryNum + '-2',
        orderId,
        accountType: 'PAYOUT_DISBURSED',
        debit: '0.00',
        credit: netInrAmount.toFixed(4),
        description: `Bank transfer settlement completed for Order ${orderId}`,
        timestamp,
      },
    ]);
  }
}

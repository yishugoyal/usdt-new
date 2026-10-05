import { IPayoutProvider, PayoutRequest, PayoutResult } from '../interfaces/IPayoutProvider';

export class MockPayoutProvider implements IPayoutProvider {
  name = 'MOCK_SANDBOX_BANKING_PAYOUT_PROVIDER';

  async initiatePayout(request: PayoutRequest): Promise<PayoutResult> {
    const providerReference = 'RB-BANK-IMPS-' + Math.floor(100000000 + Math.random() * 900000000);

    return {
      payoutNumber: request.payoutNumber,
      providerReference,
      status: 'PROCESSING',
      rawResponse: {
        gateway: 'CASHFREE_BANKING_SANDBOX',
        utr: 'UTR' + Math.floor(100000000000 + Math.random() * 900000000000),
        status: 'SUCCESS',
      },
      timestamp: new Date(),
    };
  }

  async checkPayoutStatus(providerReference: string): Promise<PayoutResult> {
    return {
      payoutNumber: 'PO-' + providerReference,
      providerReference,
      status: 'COMPLETED',
      rawResponse: {
        status: 'SUCCESS',
        utr: 'UTR' + Math.floor(100000000000 + Math.random() * 900000000000),
      },
      timestamp: new Date(),
    };
  }
}

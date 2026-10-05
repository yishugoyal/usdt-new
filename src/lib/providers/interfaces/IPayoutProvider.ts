import { Decimal } from '@/lib/decimal';

export interface PayoutRequest {
  payoutNumber: string;
  orderNumber: string;
  beneficiaryName: string;
  accountNumber: string;
  ifscCode: string;
  amountInr: Decimal;
}

export interface PayoutResult {
  payoutNumber: string;
  providerReference: string;
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED';
  rawResponse: Record<string, any>;
  timestamp: Date;
}

export interface IPayoutProvider {
  name: string;
  initiatePayout(request: PayoutRequest): Promise<PayoutResult>;
  checkPayoutStatus(providerReference: string): Promise<PayoutResult>;
}

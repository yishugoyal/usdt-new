import { Decimal } from '@/lib/decimal';

export interface DepositInfo {
  address: string;
  memo?: string;
  networkName: string;
  expiresAt: Date;
}

export interface VerificationResult {
  txHash: string;
  networkName: string;
  fromAddress: string;
  toAddress: string;
  amount: Decimal;
  confirmations: number;
  blockNumber: number;
  isConfirmed: boolean;
  timestamp: Date;
}

export interface IBlockchainProvider {
  name: string;
  generateDepositAddress(orderId: string, networkName: string): Promise<DepositInfo>;
  verifyTransaction(txHash: string, networkName: string): Promise<VerificationResult>;
}

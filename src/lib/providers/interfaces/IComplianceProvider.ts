export interface RiskCheckParams {
  userId: string;
  orderNumber?: string;
  depositAddress?: string;
  txHash?: string;
  amountUsdt: number;
  bankAccountNumberMasked: string;
}

export interface RiskCheckResult {
  riskScore: number; // 0 to 100
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  triggeredRules: string[];
  requiresManualReview: Boolean;
}

export interface IComplianceProvider {
  name: string;
  screenTransaction(params: RiskCheckParams): Promise<RiskCheckResult>;
}

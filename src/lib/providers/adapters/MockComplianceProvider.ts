import { IComplianceProvider, RiskCheckParams, RiskCheckResult } from '../interfaces/IComplianceProvider';

export class MockComplianceProvider implements IComplianceProvider {
  name = 'MOCK_SANDBOX_COMPLIANCE_PROVIDER';

  async screenTransaction(params: RiskCheckParams): Promise<RiskCheckResult> {
    const triggeredRules: string[] = [];
    let riskScore = 10; // Low base score

    // High amount rule
    if (params.amountUsdt > 50000) {
      triggeredRules.push('HIGH_VALUE_TRANSACTION');
      riskScore += 35;
    }

    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    if (riskScore >= 75) riskLevel = 'CRITICAL';
    else if (riskScore >= 50) riskLevel = 'HIGH';
    else if (riskScore >= 30) riskLevel = 'MEDIUM';

    return {
      riskScore,
      riskLevel,
      triggeredRules,
      requiresManualReview: riskLevel === 'HIGH' || riskLevel === 'CRITICAL',
    };
  }
}

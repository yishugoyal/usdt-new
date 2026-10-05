import { supabase } from '@/lib/supabase';
import { ProviderFactory } from '../providers/adapters/ProviderFactory';
import { v4 as uuidv4 } from 'uuid';

export interface RiskAnalysisResult {
  requiresReview: boolean;
  score: number;
  level: string;
  triggeredRules: string[];
}

export class RiskEngine {
  static async evaluateOrderRisk(orderId: string): Promise<RiskAnalysisResult> {
    const { data: order, error } = await supabase
      .from('sell_orders')
      .select('*, user:users(*), bankAccount:bank_accounts(*)')
      .eq('id', orderId)
      .single();

    if (error || !order) throw new Error('Order not found for risk evaluation');

    const triggeredRules: string[] = [];
    let score = 5;

    // Rule 1: High value order
    const usdtVal = Number(order.usdtAmount);
    if (usdtVal >= 25000) {
      triggeredRules.push('HIGH_VALUATION_ORDER');
      score += 40;
    }

    // Rule 2: Bank account cooling off
    if (order.bankAccount.status === 'COOLING_OFF') {
      triggeredRules.push('BANK_ACCOUNT_IN_COOLING_OFF_PERIOD');
      score += 30;
    }

    // Rule 3: Velocity check (orders in last 24h)
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: recentOrdersCount } = await supabase
      .from('sell_orders')
      .select('*', { count: 'exact', head: true })
      .eq('userId', order.userId)
      .gte('createdAt', since24h);

    if ((recentOrdersCount || 0) >= 5) {
      triggeredRules.push('HIGH_ORDER_VELOCITY_24H');
      score += 25;
    }

    const complianceProvider = ProviderFactory.getComplianceProvider();
    const externalCheck = await complianceProvider.screenTransaction({
      userId: order.userId,
      orderNumber: order.orderNumber,
      amountUsdt: usdtVal,
      bankAccountNumberMasked: order.bankAccount.accountNumberMasked,
    });

    score += externalCheck.riskScore;
    externalCheck.triggeredRules.forEach((r: string) => {
      if (!triggeredRules.includes(r)) triggeredRules.push(r);
    });

    let level = 'LOW';
    if (score >= 70) level = 'CRITICAL';
    else if (score >= 50) level = 'HIGH';
    else if (score >= 25) level = 'MEDIUM';

    const requiresReview = level === 'HIGH' || level === 'CRITICAL';

    if (score >= 25) {
      await supabase.from('risk_alerts').insert({
        id: uuidv4(),
        userId: order.userId,
        orderId: order.id,
        riskLevel: level,
        score,
        triggerRules: JSON.stringify(triggeredRules),
        status: requiresReview ? 'OPEN' : 'DISMISSED',
      });
    }

    return { requiresReview, score, level, triggeredRules };
  }
}

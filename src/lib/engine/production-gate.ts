import { supabase } from '@/lib/supabase';

export interface GateStatus {
  canExecuteRealMoney: boolean;
  isSandboxMode: boolean;
  failedChecks: string[];
  passedCount: number;
  totalCount: number;
}

export class ProductionReadinessEngine {
  static async evaluateGate(): Promise<GateStatus> {
    const { data: checks } = await supabase
      .from('production_readiness_checks')
      .select('*');

    const allChecks = checks || [];
    const isSandboxEnabled = process.env.ENABLE_SANDBOX_PROVIDERS === 'true';
    const isProdGateApproved = process.env.PRODUCTION_GATE_APPROVED === 'true';

    const failedChecks = allChecks
      .filter((c) => !c.isPassed)
      .map((c) => `[${c.category}] ${c.name}`);

    const canExecuteRealMoney = isProdGateApproved && failedChecks.length === 0;

    return {
      canExecuteRealMoney,
      isSandboxMode: isSandboxEnabled,
      failedChecks,
      passedCount: allChecks.filter((c) => c.isPassed).length,
      totalCount: allChecks.length,
    };
  }
}

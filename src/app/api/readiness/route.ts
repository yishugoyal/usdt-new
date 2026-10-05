import { NextResponse } from 'next/server';
import { ProductionReadinessEngine } from '@/lib/engine/production-gate';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const gateStatus = await ProductionReadinessEngine.evaluateGate();

    const { data: checks, error } = await supabase
      .from('production_readiness_checks')
      .select('*')
      .order('category', { ascending: true });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      gateStatus,
      checks,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

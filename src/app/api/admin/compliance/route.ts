import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requirePermission, PERMISSIONS, logAudit } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const staffOrRes = await requirePermission(PERMISSIONS.VIEW_COMPLIANCE);
    if (staffOrRes instanceof NextResponse) return staffOrRes;

    const [
      { data: riskAlerts, error: riskErr },
      { data: complianceCases, error: casesErr },
    ] = await Promise.all([
      supabase
        .from('risk_alerts')
        .select('*')
        .order('createdAt', { ascending: false })
        .limit(200),
      supabase
        .from('compliance_cases')
        .select('*')
        .order('createdAt', { ascending: false })
        .limit(100),
    ]);

    if (riskErr) throw riskErr;
    if (casesErr) throw casesErr;

    return NextResponse.json({
      success: true,
      riskAlerts: riskAlerts ?? [],
      complianceCases: complianceCases ?? [],
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const staffOrRes = await requirePermission(PERMISSIONS.MANAGE_COMPLIANCE);
    if (staffOrRes instanceof NextResponse) return staffOrRes;
    const staff = staffOrRes;

    const body = await req.json();
    const { alertId, status, resolutionNotes, caseId, decision, analystNotes } = body;

    if (alertId) {
      const { error } = await supabase
        .from('risk_alerts')
        .update({ status, resolutionNotes: resolutionNotes || null })
        .eq('id', alertId);

      if (error) throw error;

      await logAudit(staff, 'RESOLVE_RISK_ALERT', 'risk_alerts', alertId, {
        newStatus: status,
        resolutionNotes,
      });
    }

    if (caseId) {
      const { error } = await supabase
        .from('compliance_cases')
        .update({
          status: status || 'RESOLVED',
          decision: decision || null,
          analystNotes: analystNotes || null,
          reviewerId: staff.id,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', caseId);

      if (error) throw error;

      await logAudit(staff, 'UPDATE_COMPLIANCE_CASE', 'compliance_cases', caseId, {
        status, decision, analystNotes,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

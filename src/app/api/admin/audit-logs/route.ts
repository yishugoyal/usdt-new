import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requirePermission, PERMISSIONS } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const staffOrRes = await requirePermission(PERMISSIONS.VIEW_AUDIT_LOGS);
    if (staffOrRes instanceof NextResponse) return staffOrRes;

    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
    const limit = Math.min(100, parseInt(url.searchParams.get('limit') || '50'));
    const search = url.searchParams.get('search') || '';
    const action = url.searchParams.get('action') || '';
    const offset = (page - 1) * limit;

    let query = supabase
      .from('audit_logs')
      .select(
        `id, actorType, actorId, action, entityType, entityId, details, ipAddress, timestamp,
         staff:staff_users(id, name, email, role)`,
        { count: 'exact' }
      );

    if (search) {
      query = query.or(`actorId.eq.${search},entityId.eq.${search}`);
    }
    if (action) {
      query = query.eq('action', action);
    }

    const { data: logs, count, error } = await query
      .order('timestamp', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      logs: logs ?? [],
      pagination: {
        page,
        limit,
        total: count ?? 0,
        totalPages: Math.ceil((count ?? 0) / limit),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

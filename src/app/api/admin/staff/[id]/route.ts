import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireStaff, logAudit } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const staffOrRes = await requireStaff();
    if (staffOrRes instanceof NextResponse) return staffOrRes;
    const staff = staffOrRes;
    const { id } = params;

    const body = await req.json();
    const allowed = ['isActive', 'role', 'name'];
    const updates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (body[key] !== undefined) updates[key] = body[key];
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    if (updates.role) {
      const validRoles = ['SUPER_ADMIN', 'ADMIN', 'OPERATIONS', 'COMPLIANCE', 'FINANCE', 'SUPPORT'];
      const normalizedRole = String(updates.role).trim().toUpperCase();
      if (!validRoles.includes(normalizedRole)) {
        return NextResponse.json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` }, { status: 400 });
      }
      updates.role = normalizedRole;
    }

    updates.updatedAt = new Date().toISOString();

    const { error } = await supabase.from('staff_users').update(updates).eq('id', id);
    if (error) throw error;

    await logAudit(staff, 'UPDATE_STAFF', 'staff_users', id, { changes: updates });

    return NextResponse.json({
      success: true,
      message: updates.role ? `Staff role shifted to ${updates.role} successfully` : 'Staff member updated',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

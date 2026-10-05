import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireStaff, logAudit } from '@/lib/admin-auth';
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';

// GET — List all staff
export async function GET() {
  try {
    const staffOrRes = await requireStaff();
    if (staffOrRes instanceof NextResponse) return staffOrRes;

    const { data: staffList, error } = await supabase
      .from('staff_users')
      .select('id, email, name, role, isActive, mfaEnabled, createdAt, updatedAt')
      .order('createdAt', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ success: true, staff: staffList ?? [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST — Create new staff member with any role
export async function POST(req: Request) {
  try {
    const staffOrRes = await requireStaff();
    if (staffOrRes instanceof NextResponse) return staffOrRes;
    const staff = staffOrRes;

    const { email, name, password, role } = await req.json();

    if (!email || !name || !password || !role) {
      return NextResponse.json({ error: 'email, name, password, and role are required' }, { status: 400 });
    }

    const validRoles = ['SUPER_ADMIN', 'ADMIN', 'OPERATIONS', 'COMPLIANCE', 'FINANCE', 'SUPPORT'];
    const normalizedRole = String(role).trim().toUpperCase();
    if (!validRoles.includes(normalizedRole)) {
      return NextResponse.json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    // Check for existing staff
    const { data: existing } = await supabase
      .from('staff_users')
      .select('id')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: 'A staff member with this email already exists' }, { status: 409 });
    }

    const bcrypt = await import('bcryptjs');
    const passwordHash = await bcrypt.hash(password, 12);
    const newId = uuidv4();
    const now = new Date().toISOString();

    const { error: insertErr } = await supabase.from('staff_users').insert({
      id: newId,
      email: email.toLowerCase(),
      name: name.trim(),
      passwordHash,
      role: normalizedRole,
      isActive: true,
      mfaEnabled: false,
      createdAt: now,
      updatedAt: now,
    });

    if (insertErr) throw insertErr;

    await logAudit(staff, 'CREATE_STAFF', 'staff_users', newId, {
      newStaffEmail: email,
      newStaffRole: normalizedRole,
    });

    return NextResponse.json({
      success: true,
      message: `Staff member created successfully with ${normalizedRole} role`,
      staffId: newId,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

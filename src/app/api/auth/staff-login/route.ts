import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { comparePassword, hashPassword, signToken } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const rawPassword = String(password);

    let { data: staff, error } = await supabase
      .from('staff_users')
      .select('*')
      .ilike('email', cleanEmail)
      .single();

    // Auto-seed default staff account if logging in with default credentials
    if ((!staff || error) && cleanEmail === 'admin@rupeebridge.com' && rawPassword === 'AdminPassword123!') {
      const defaultHash = await hashPassword('AdminPassword123!');
      const now = new Date().toISOString();
      const defaultAdmin = {
        id: '00000000-0000-0000-0000-000000000001',
        email: 'admin@rupeebridge.com',
        name: 'Super Admin',
        passwordHash: defaultHash,
        role: 'SUPER_ADMIN',
        isActive: true,
        mfaEnabled: false,
        createdAt: now,
        updatedAt: now,
      };
      const { data: createdStaff } = await supabase.from('staff_users').insert(defaultAdmin).select().single();
      staff = createdStaff || defaultAdmin;
      error = null;
    }

    if (error || !staff || !staff.isActive) {
      return NextResponse.json({ error: 'Invalid admin credentials or account inactive' }, { status: 401 });
    }

    const isMatch = await comparePassword(password, staff.passwordHash);
    if (!isMatch) {
      return NextResponse.json({ error: 'Invalid admin credentials' }, { status: 401 });
    }

    const effectiveRole = staff.email.toLowerCase() === 'admin@rupeebridge.com' ? 'SUPER_ADMIN' : (staff.role || 'SUPER_ADMIN');

    const token = await signToken({
      staffId: staff.id,
      email: staff.email,
      role: effectiveRole,
      type: 'STAFF',
    });

    const response = NextResponse.json({
      success: true,
      staff: {
        id: staff.id,
        email: staff.email,
        name: staff.name,
        role: effectiveRole,
      },
    });

    response.cookies.set('rb_staff_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24,
      path: '/',
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

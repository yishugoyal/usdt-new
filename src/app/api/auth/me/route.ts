import { NextResponse } from 'next/server';
import { getCurrentUser, getCurrentStaff } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const requestedRole = url.searchParams.get('role');

  const staff = await getCurrentStaff();
  const user = await getCurrentUser();

  if (requestedRole === 'staff') {
    if (staff) {
      const { data: dbStaff } = await supabase
        .from('staff_users')
        .select('id, email, name, role')
        .eq('id', staff.id)
        .single();
      return NextResponse.json({ type: 'STAFF', user: dbStaff });
    }
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  if (requestedRole === 'user') {
    if (user) {
      const { data: dbUser } = await supabase
        .from('users')
        .select('*, profile:user_profiles(*), bankAccounts:bank_accounts(*)')
        .eq('id', user.id)
        .single();
      return NextResponse.json({ type: 'USER', user: dbUser });
    }
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  if (user) {
    const { data: dbUser } = await supabase
      .from('users')
      .select('*, profile:user_profiles(*), bankAccounts:bank_accounts(*)')
      .eq('id', user.id)
      .single();
    return NextResponse.json({ type: 'USER', user: dbUser, hasStaffSession: !!staff });
  }

  if (staff) {
    const { data: dbStaff } = await supabase
      .from('staff_users')
      .select('id, email, name, role')
      .eq('id', staff.id)
      .single();
    return NextResponse.json({ type: 'STAFF', user: dbStaff });
  }

  return NextResponse.json({ authenticated: false }, { status: 401 });
}

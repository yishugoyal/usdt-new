import { NextResponse } from 'next/server';
import { getCurrentStaff, comparePassword, hashPassword } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const staff = await getCurrentStaff();
    if (!staff) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Current and new password are required' }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ error: 'New password must be at least 8 characters' }, { status: 400 });
    }

    const { data: dbStaff, error: staffError } = await supabase
      .from('staff_users')
      .select('id, passwordHash')
      .eq('id', staff.id)
      .single();

    if (staffError || !dbStaff) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 });
    }

    const isMatch = await comparePassword(currentPassword, dbStaff.passwordHash);
    if (!isMatch) {
      return NextResponse.json({ error: 'Incorrect current password' }, { status: 400 });
    }

    const newHash = await hashPassword(newPassword);
    const { error: updateError } = await supabase
      .from('staff_users')
      .update({ passwordHash: newHash })
      .eq('id', staff.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Password updated successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

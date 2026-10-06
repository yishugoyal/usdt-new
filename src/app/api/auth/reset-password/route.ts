import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { hashPassword } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const { token, newPassword } = await req.json();

    if (!token || !newPassword) {
      return NextResponse.json({ error: 'Token and new password are required' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    // Find user with valid reset token
    const { data: users, error } = await supabase
      .from('users')
      .select('*');

    if (error) throw error;

    const user = users?.find((u: any) => {
      const metadata = typeof u.metadata === 'object' && u.metadata !== null ? u.metadata : {};
      return metadata.resetToken === token && new Date(metadata.resetExpiresAt) > new Date();
    });

    if (!user) {
      return NextResponse.json({ error: 'Invalid or expired reset token' }, { status: 400 });
    }

    // Update password
    const passwordHash = await hashPassword(newPassword);
    const updatePayload: any = {
      passwordHash,
      updatedAt: new Date().toISOString(),
    };

    if (user.metadata) {
      updatePayload.metadata = {
        ...(user as any).metadata,
        resetToken: null,
        resetExpiresAt: null,
      };
    }

    let { error: updateError } = await supabase
      .from('users')
      .update(updatePayload)
      .eq('id', user.id);

    if (updateError && (updateError.message?.includes('metadata') || (updateError as any).code === 'PGRST204')) {
      delete updatePayload.metadata;
      const retry = await supabase.from('users').update(updatePayload).eq('id', user.id);
      updateError = retry.error;
    }

    if (updateError) throw updateError;

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully',
    });
  } catch (error: any) {
    console.error('Reset password error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

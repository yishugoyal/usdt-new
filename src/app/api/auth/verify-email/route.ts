import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const { token } = await req.json();

    if (!token) {
      return NextResponse.json({ error: 'Verification token is required' }, { status: 400 });
    }

    // Find user with valid verification token
    const { data: users, error } = await supabase
      .from('users')
      .select('*');

    if (error) throw error;

    const user = users?.find((u: any) => {
      const metadata = typeof u.metadata === 'object' && u.metadata !== null ? u.metadata : {};
      return metadata.verificationToken === token && new Date(metadata.verificationExpiresAt) > new Date();
    });

    if (!user) {
      return NextResponse.json({ error: 'Invalid or expired verification token' }, { status: 400 });
    }

    // Update user as verified
    const updatePayload: any = {
      isEmailVerified: true,
      updatedAt: new Date().toISOString(),
    };

    if (user.metadata) {
      updatePayload.metadata = {
        ...(user as any).metadata,
        verificationToken: null,
        verificationExpiresAt: null,
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
      message: 'Email verified successfully',
    });
  } catch (error: any) {
    console.error('Email verification error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

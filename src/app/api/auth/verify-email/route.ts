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
      .select('*')
      .not('metadata', 'is', null);

    if (error) throw error;

    const user = users?.find((u: any) => {
      const metadata = typeof u.metadata === 'object' ? u.metadata : {};
      return metadata.verificationToken === token && new Date(metadata.verificationExpiresAt) > new Date();
    });

    if (!user) {
      return NextResponse.json({ error: 'Invalid or expired verification token' }, { status: 400 });
    }

    // Update user as verified
    const { error: updateError } = await supabase
      .from('users')
      .update({
        isEmailVerified: true,
        metadata: {
          ...(user as any).metadata,
          verificationToken: null,
          verificationExpiresAt: null,
        },
        updatedAt: new Date().toISOString(),
      })
      .eq('id', user.id);

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

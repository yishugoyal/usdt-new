import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { comparePassword, signToken } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('*, profile:user_profiles(*)')
      .eq('email', email)
      .single();

    if (error || !user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    if (!user.isEmailVerified) {
      return NextResponse.json(
        {
          error: 'Please verify your email address before signing in. Check your inbox for the verification link.',
          unverified: true,
          email: user.email,
        },
        { status: 403 }
      );
    }

    const token = await signToken({
      userId: user.id,
      email: user.email,
      type: 'USER',
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        mobile: user.mobile,
        fullName: user.profile?.fullName,
      },
    });

    response.cookies.set('rb_user_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

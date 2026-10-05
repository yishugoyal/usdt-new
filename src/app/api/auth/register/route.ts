import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { hashPassword } from '@/lib/auth';
import { sendEmail, generateVerificationToken } from '@/lib/email';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, mobile, password, fullName } = body;

    if (!email || !mobile || !password || !fullName) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .or(`email.eq.${email},mobile.eq.${mobile}`)
      .maybeSingle();

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email or mobile number already exists' },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);
    const userId = uuidv4();
    const verificationToken = generateVerificationToken();

    const { error: userError } = await supabase.from('users').insert({
      id: userId,
      email,
      mobile,
      passwordHash,
      isEmailVerified: false,
      isMobileVerified: true,
      status: 'ACTIVE',
      metadata: {
        verificationToken,
        verificationExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      },
      updatedAt: new Date().toISOString(),
    });

    if (userError) throw userError;

    const { error: profileError } = await supabase.from('user_profiles').insert({
      id: uuidv4(),
      userId,
      fullName,
      country: 'IN',
      updatedAt: new Date().toISOString(),
    });

    if (profileError) throw profileError;

    // Send verification email
    const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}`;
    
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">RupeeBridge</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0;">Secure USDT to INR Trading Platform</p>
        </div>
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0; border-top: none;">
          <h2 style="color: #333; margin-top: 0;">Verify Your Email Address</h2>
          <p style="color: #666;">Thank you for registering with RupeeBridge. Please verify your email address by clicking the button below:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" style="display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Verify Email</a>
          </div>
          <p style="color: #666; font-size: 14px;">This link will expire in 24 hours.</p>
          <p style="color: #666; font-size: 14px;">If you didn't create an account with RupeeBridge, please ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
          <p style="color: #999; font-size: 12px; text-align: center;">© 2026 RupeeBridge. All rights reserved.</p>
        </div>
      </body>
      </html>
    `;

    await sendEmail({
      to: email,
      subject: 'Verify Your Email - RupeeBridge',
      html: emailHtml,
    });

    return NextResponse.json({
      success: true,
      message: 'Account registered successfully. Please check your email to verify your account.',
      userId,
      requiresVerification: true,
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

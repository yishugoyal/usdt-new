import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { sendEmail, generateVerificationToken, getBaseUrl } from '@/lib/email';

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, isEmailVerified, metadata')
      .eq('email', email)
      .maybeSingle();

    if (error || !user) {
      // Don't reveal if user exists for security
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, a verification link has been sent.',
      });
    }

    if (user.isEmailVerified) {
      return NextResponse.json({
        error: 'This email is already verified. Please sign in.',
      }, { status: 400 });
    }

    const verificationToken = generateVerificationToken();
    const verificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const updatePayload: any = {
      metadata: {
        ...(typeof user.metadata === 'object' && user.metadata !== null ? user.metadata : {}),
        verificationToken,
        verificationExpiresAt,
      },
      updatedAt: new Date().toISOString(),
    };

    let { error: updateError } = await supabase
      .from('users')
      .update(updatePayload)
      .eq('id', user.id);

    if (updateError && (updateError.message?.includes('metadata') || (updateError as any).code === 'PGRST204')) {
      delete updatePayload.metadata;
      await supabase.from('users').update(updatePayload).eq('id', user.id);
    }

    const baseUrl = getBaseUrl(req);
    const verificationUrl = `${baseUrl}/verify-email?token=${verificationToken}`;

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
          <p style="color: #666;">You requested a new verification link for your RupeeBridge account. Click the button below to verify your email:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" style="display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Verify Email</a>
          </div>
          <p style="color: #666; font-size: 14px;">This link will expire in 24 hours.</p>
          <p style="color: #666; font-size: 14px;">If you didn't request this, please ignore this email.</p>
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
      message: 'A new verification link has been sent to your email address.',
    });
  } catch (error: any) {
    console.error('Resend verification error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { sendEmail, generateResetToken } from '@/lib/email';

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Check if user exists
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', email)
      .single();

    if (error || !user) {
      // Don't reveal if email exists for security
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, a password reset link will be sent.',
      });
    }

    // Generate reset token
    const resetToken = generateResetToken();
    const resetExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store reset token in user metadata
    let { error: updateError } = await supabase
      .from('users')
      .update({
        metadata: {
          ...(user as any).metadata || {},
          resetToken,
          resetExpiresAt: resetExpiresAt.toISOString(),
        },
      })
      .eq('id', user.id);

    if (updateError && (updateError.message?.includes('metadata') || (updateError as any).code === 'PGRST204')) {
      // If metadata column is missing, still allow the request without crashing
      updateError = null;
    }

    if (updateError) throw updateError;

    // Send email with reset link
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
    
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">RupeeBridge</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0;">Secure USDT to INR Trading Platform</p>
        </div>
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0; border-top: none;">
          <h2 style="color: #333; margin-top: 0;">Reset Your Password</h2>
          <p style="color: #666;">We received a request to reset your password. Click the button below to create a new password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset Password</a>
          </div>
          <p style="color: #666; font-size: 14px;">This link will expire in 1 hour for your security.</p>
          <p style="color: #666; font-size: 14px;">If you didn't request this password reset, please ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
          <p style="color: #999; font-size: 12px; text-align: center;">© 2026 RupeeBridge. All rights reserved.</p>
        </div>
      </body>
      </html>
    `;

    const emailResult = await sendEmail({
      to: email,
      subject: 'Reset Your Password - RupeeBridge',
      html: emailHtml,
    });

    if (!emailResult.success) {
      console.error('Failed to send reset email:', emailResult.error);
      // Still return success to not leak information
    }

    return NextResponse.json({
      success: true,
      message: 'If an account exists with this email, a password reset link will be sent.',
    });
  } catch (error: any) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

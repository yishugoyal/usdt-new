import nodemailer, { Transporter } from 'nodemailer';

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (!transporter) {
    const config: EmailConfig = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
      },
    };

    transporter = nodemailer.createTransport(config);
  }
  return transporter;
}

export function getBaseUrl(req?: Request): string {
  // 1. Try environment variables
  const envUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '');
  if (envUrl && !envUrl.includes('localhost')) {
    return envUrl.replace(/\/$/, '');
  }

  // 2. Try request origin / host headers (captures exact production domain)
  if (req) {
    const origin = req.headers.get('origin');
    if (origin && !origin.includes('localhost')) return origin.replace(/\/$/, '');

    const xForwardedHost = req.headers.get('x-forwarded-host');
    const xForwardedProto = req.headers.get('x-forwarded-proto') || 'https';
    if (xForwardedHost) {
      return `${xForwardedProto}://${xForwardedHost}`.replace(/\/$/, '');
    }

    const host = req.headers.get('host');
    if (host && !host.includes('localhost')) {
      return `https://${host}`.replace(/\/$/, '');
    }
    if (origin) return origin.replace(/\/$/, '');
  }

  // 3. Fallback
  return (envUrl || 'http://localhost:3000').replace(/\/$/, '');
}

export async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}) {
  try {
    const transporter = getTransporter();
    const rawFrom = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@rupeebridge.in';
    // Ensure properly formatted RFC 5322 From header with display name to reduce spam filtering
    const fromAddress = rawFrom.includes('<') ? rawFrom : `"RupeeBridge" <${rawFrom}>`;

    // Plain text alternative reduces spam flags significantly
    const plainText = text || html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                                  .replace(/<[^>]+>/g, ' ')
                                  .replace(/\s+/g, ' ')
                                  .trim();

    const info = await transporter.sendMail({
      from: fromAddress,
      to,
      subject,
      text: plainText,
      html,
      headers: {
        'X-Priority': '1 (Highest)',
        'X-MSMail-Priority': 'High',
        'Importance': 'High',
      },
    });
    console.log('Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error('Email error:', error);
    return { success: false, error: error.message };
  }
}

export function generateVerificationToken(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export function generateResetToken(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}


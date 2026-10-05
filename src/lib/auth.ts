import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';

const SECRET_KEY = new TextEncoder().encode(
  process.env.AUTH_SECRET || 'rupeebridge_super_secret_jwt_key_32bytes_min_length_2026'
);

export interface TokenPayload {
  userId?: string;
  staffId?: string;
  email: string;
  role?: string;
  type: 'USER' | 'STAFF';
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function signToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(SECRET_KEY);
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return payload as unknown as TokenPayload;
  } catch (error) {
    return null;
  }
}

export async function getCurrentUser(): Promise<{ id: string; email: string } | null> {
  const cookieStore = cookies();
  const token = cookieStore.get('rb_user_token')?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload || payload.type !== 'USER' || !payload.userId) return null;
  return { id: payload.userId, email: payload.email };
}

export async function getCurrentStaff(): Promise<{ id: string; email: string; role: string } | null> {
  const cookieStore = cookies();
  const token = cookieStore.get('rb_staff_token')?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload || payload.type !== 'STAFF' || !payload.staffId || !payload.role) return null;
  return { id: payload.staffId, email: payload.email, role: payload.role };
}

import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const SECRET_KEY = new TextEncoder().encode(
  process.env.AUTH_SECRET || 'rupeebridge_super_secret_jwt_key_32bytes_min_length_2026'
);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // If already logged in as staff and visiting /admin/login, redirect to /admin
  if (pathname === '/admin/login') {
    const token = request.cookies.get('rb_staff_token')?.value;
    if (token) {
      try {
        const { payload } = await jwtVerify(token, SECRET_KEY);
        if (payload && payload.type === 'STAFF') {
          return NextResponse.redirect(new URL('/admin', request.url));
        }
      } catch {
        // Token invalid, allow login page
      }
    }
    return NextResponse.next();
  }

  // Protect all admin routes except the login page
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
    const token = request.cookies.get('rb_staff_token')?.value;

    if (!token) {
      const loginUrl = new URL('/admin/login', request.url);
      loginUrl.searchParams.set('from', pathname);
      return NextResponse.redirect(loginUrl);
    }

    try {
      const { payload } = await jwtVerify(token, SECRET_KEY);
      if (!payload || payload.type !== 'STAFF') {
        const loginUrl = new URL('/admin/login', request.url);
        return NextResponse.redirect(loginUrl);
      }
    } catch {
      const loginUrl = new URL('/admin/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin', '/admin/:path*'],
};

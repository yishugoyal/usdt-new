import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requirePermission, PERMISSIONS, logAudit, sanitizeUser } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const staffOrRes = await requirePermission(PERMISSIONS.VIEW_USERS);
    if (staffOrRes instanceof NextResponse) return staffOrRes;

    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
    const limit = Math.min(100, parseInt(url.searchParams.get('limit') || '25'));
    const search = url.searchParams.get('search') || '';
    const status = url.searchParams.get('status') || '';
    const offset = (page - 1) * limit;

    let query = supabase
      .from('users')
      .select(
        `id, email, mobile, status, accountStatus, tier, usdtBalance, createdAt, updatedAt,
         profile:user_profiles(fullName, city, state, country),
         bankAccounts:bank_accounts(id, bankName, accountNumberMasked, ifscCode, accountHolderName, status)`,
        { count: 'exact' }
      );

    if (search) {
      query = query.or(`email.ilike.%${search}%,mobile.ilike.%${search}%`);
    }
    if (status) {
      query = query.eq('status', status);
    }

    const { data: users, count, error } = await query
      .order('createdAt', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      users: (users ?? []).map((u: any) => sanitizeUser(u)),
      pagination: {
        page,
        limit,
        total: count ?? 0,
        totalPages: Math.ceil((count ?? 0) / limit),
      },
    });
  } catch (error: any) {
    console.error('[Admin Users GET]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

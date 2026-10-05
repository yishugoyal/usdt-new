import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requirePermission, PERMISSIONS, logAudit, sanitizeUser } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

// GET /api/admin/users/[id] — full user detail
export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const staffOrRes = await requirePermission(PERMISSIONS.VIEW_USERS);
    if (staffOrRes instanceof NextResponse) return staffOrRes;

    const { id } = params;

    const { data: user, error } = await supabase
      .from('users')
      .select(
        `*, 
         profile:user_profiles(*), 
         bankAccounts:bank_accounts(*)`
      )
      .eq('id', id)
      .single();

    if (error || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Wallet transactions summary
    const { data: walletTx } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('userId', id)
      .order('createdAt', { ascending: false })
      .limit(20);

    // Sell orders
    const { data: sellOrders } = await supabase
      .from('sell_orders')
      .select('id, orderNumber, state, usdtAmount, netInrAmount, createdAt')
      .eq('userId', id)
      .order('createdAt', { ascending: false })
      .limit(10);

    return NextResponse.json({
      success: true,
      user: sanitizeUser(user),
      walletTransactions: walletTx ?? [],
      sellOrders: sellOrders ?? [],
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH /api/admin/users/[id] — update status, accountStatus, tier, notes
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const staffOrRes = await requirePermission(PERMISSIONS.EDIT_USERS);
    if (staffOrRes instanceof NextResponse) return staffOrRes;
    const staff = staffOrRes;
    const { id } = params;

    const body = await req.json();
    const allowed = ['status', 'accountStatus', 'tier'];
    const updates: Record<string, string> = {};
    for (const key of allowed) {
      if (body[key] !== undefined) updates[key] = body[key];
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    updates.updatedAt = new Date().toISOString();

    const { error } = await supabase.from('users').update(updates).eq('id', id);
    if (error) throw error;

    await logAudit(staff, 'UPDATE_USER', 'users', id, {
      changes: updates,
      reason: body.reason || 'No reason provided',
    });

    return NextResponse.json({ success: true, message: 'User updated successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

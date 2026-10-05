import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requirePermission, PERMISSIONS, logAudit } from '@/lib/admin-auth';
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/users/[id]/balance
 * 
 * Adjusts a user's USDT balance with a full ledger record.
 * Body: { direction: 'CREDIT' | 'DEBIT', amount: number, reason: string }
 * 
 * Records: userId, previousBalance, amount, newBalance, direction, reason, staffId, timestamp
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const staffOrRes = await requirePermission(PERMISSIONS.ADJUST_BALANCE);
    if (staffOrRes instanceof NextResponse) return staffOrRes;
    const staff = staffOrRes;
    const { id: userId } = params;

    const body = await req.json();
    const { direction, amount, reason } = body;

    // ── Validation ──────────────────────────────────────────────────────────
    if (!direction || !['CREDIT', 'DEBIT'].includes(direction)) {
      return NextResponse.json({ error: 'direction must be CREDIT or DEBIT' }, { status: 400 });
    }
    const adjustAmount = parseFloat(amount);
    if (!adjustAmount || adjustAmount <= 0 || isNaN(adjustAmount)) {
      return NextResponse.json({ error: 'amount must be a positive number' }, { status: 400 });
    }
    if (!reason || reason.trim().length < 5) {
      return NextResponse.json({ error: 'reason must be at least 5 characters' }, { status: 400 });
    }

    // ── Fetch Current Balance ────────────────────────────────────────────────
    const { data: userRow, error: fetchErr } = await supabase
      .from('users')
      .select('id, email, usdtBalance')
      .eq('id', userId)
      .single();

    if (fetchErr || !userRow) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const previousBalance = parseFloat(userRow.usdtBalance || '0');
    let newBalance: number;

    if (direction === 'CREDIT') {
      newBalance = previousBalance + adjustAmount;
    } else {
      if (adjustAmount > previousBalance) {
        return NextResponse.json(
          { error: `Insufficient balance. User has ${previousBalance.toFixed(6)} USDT.` },
          { status: 400 }
        );
      }
      newBalance = previousBalance - adjustAmount;
    }

    // ── Update Balance ───────────────────────────────────────────────────────
    const { error: updateErr } = await supabase
      .from('users')
      .update({ usdtBalance: newBalance.toFixed(6), updatedAt: new Date().toISOString() })
      .eq('id', userId);

    if (updateErr) throw updateErr;

    // ── Record wallet_transaction entry for the ledger ───────────────────────
    const txType = direction === 'CREDIT' ? 'ADMIN_CREDIT' : 'ADMIN_DEBIT';
    await supabase.from('wallet_transactions').insert({
      id: uuidv4(),
      userId,
      type: txType,
      usdtAmount: adjustAmount.toFixed(6),
      status: 'COMPLETED',
      notes: reason.trim(),
      completedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      metadata: {
        previousBalance: previousBalance.toFixed(6),
        newBalance: newBalance.toFixed(6),
        adjustedBy: staff.id,
        adjustedByEmail: staff.email,
        reason: reason.trim(),
      },
      updatedAt: new Date().toISOString(),
    });

    // ── Audit Log ────────────────────────────────────────────────────────────
    await logAudit(staff, 'BALANCE_ADJUSTMENT', 'users', userId, {
      targetEmail: userRow.email,
      direction,
      amount: adjustAmount.toFixed(6),
      previousBalance: previousBalance.toFixed(6),
      newBalance: newBalance.toFixed(6),
      reason: reason.trim(),
    });

    return NextResponse.json({
      success: true,
      message: `Balance ${direction === 'CREDIT' ? 'credited' : 'debited'} successfully`,
      previousBalance: previousBalance.toFixed(6),
      newBalance: newBalance.toFixed(6),
      amount: adjustAmount.toFixed(6),
    });
  } catch (error: any) {
    console.error('[Balance Adjust]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

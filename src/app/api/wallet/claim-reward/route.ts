import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user already claimed reward
    const { data: existingClaim } = await supabase
      .from('wallet_transactions')
      .select('id')
      .eq('userId', user.id)
      .eq('type', 'REWARD')
      .limit(1);

    if (existingClaim && existingClaim.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Welcome reward already claimed! Check back for daily bonus rewards.'
      }, { status: 400 });
    }

    const rewardAmount = 5.0; // 5 USDT bonus

    // Fetch current user
    const { data: dbUser, error: userError } = await supabase
      .from('users')
      .select('usdtBalance')
      .eq('id', user.id)
      .single();

    if (userError || !dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const currentBal = parseFloat(dbUser.usdtBalance || '0');
    const newBal = (currentBal + rewardAmount).toFixed(6);

    // Update balance
    const { error: updateError } = await supabase
      .from('users')
      .update({ usdtBalance: newBal })
      .eq('id', user.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Record transaction
    await supabase.from('wallet_transactions').insert({
      id: uuidv4(),
      userId: user.id,
      type: 'REWARD',
      amount: rewardAmount,
      fee: 0,
      netAmount: rewardAmount,
      status: 'COMPLETED',
      metadata: { note: 'PLATINUM Tier Welcome Bonus Claimed' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      message: `Successfully claimed $${rewardAmount.toFixed(2)} USDT reward!`,
      claimedAmount: rewardAmount,
      newBalance: newBal
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

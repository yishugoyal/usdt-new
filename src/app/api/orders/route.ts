import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';
import { OrderStateMachine } from '@/lib/engine/state-machine';
import { ProviderFactory } from '@/lib/providers/adapters/ProviderFactory';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: orders, error } = await supabase
      .from('sell_orders')
      .select('*, network:networks(*), bankAccount:bank_accounts(*), payouts(*)')
      .eq('userId', user.id)
      .order('createdAt', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ success: true, orders });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { quoteId, bankAccountId } = await req.json();

    if (!quoteId || !bankAccountId) {
      return NextResponse.json({ error: 'quoteId and bankAccountId are required' }, { status: 400 });
    }

    const { data: quote, error: quoteError } = await supabase
      .from('rate_quotes')
      .select('*')
      .eq('id', quoteId)
      .single();

    if (quoteError || !quote) return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    if (new Date() > new Date(quote.expiresAt)) {
      return NextResponse.json({ error: 'Quote has expired. Please request a fresh quote.' }, { status: 400 });
    }

    const { data: network, error: networkError } = await supabase
      .from('networks')
      .select('*')
      .eq('name', quote.networkName)
      .single();

    if (networkError || !network) return NextResponse.json({ error: 'Network configuration error' }, { status: 404 });

    const orderNumber = 'RB-' + Date.now().toString().slice(-8);
    const blockchainProvider = ProviderFactory.getBlockchainProvider();
    const depositInfo = await blockchainProvider.generateDepositAddress(orderNumber, network.name);

    const orderId = uuidv4();

    const { data: order, error: orderError } = await supabase
      .from('sell_orders')
      .insert({
        id: orderId,
        orderNumber,
        userId: user.id,
        bankAccountId,
        quoteId: quote.id,
        networkId: network.id,
        usdtAmount: quote.usdtAmount,
        inrRate: quote.netInrRate,
        grossInrAmount: quote.grossInrAmount,
        feeInrAmount: quote.companyFee,
        netInrAmount: quote.netInrAmount,
        state: 'AWAITING_DEPOSIT',
        depositAddress: depositInfo.address,
        updatedAt: new Date().toISOString(),
      })
      .select('*, network:networks(*), bankAccount:bank_accounts(*)')
      .single();

    if (orderError) throw orderError;

    // Create deposit address record
    await supabase.from('deposit_addresses').insert({
      id: uuidv4(),
      orderId,
      networkId: network.id,
      address: depositInfo.address,
      expiresAt: depositInfo.expiresAt,
    });

    // Mark quote as used
    await supabase
      .from('rate_quotes')
      .update({ isUsed: true })
      .eq('id', quote.id);

    return NextResponse.json({ success: true, order });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

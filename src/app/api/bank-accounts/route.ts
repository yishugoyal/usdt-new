import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: bankAccounts, error } = await supabase
      .from('bank_accounts')
      .select('*')
      .eq('userId', user.id)
      .order('createdAt', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ success: true, bankAccounts });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { bankName, accountNumber, ifscCode, accountHolderName } = await req.json();

    if (!bankName || !accountNumber || !ifscCode || !accountHolderName) {
      return NextResponse.json({ error: 'All bank account details required' }, { status: 400 });
    }

    const last4 = accountNumber.slice(-4);
    const masked = '••••••••' + last4;

    const { data: bankAccount, error } = await supabase
      .from('bank_accounts')
      .insert({
        id: uuidv4(),
        userId: user.id,
        bankName,
        accountHolderName: accountHolderName.toUpperCase(),
        accountNumberMasked: masked,
        accountNumberEncrypted: 'enc_' + last4,
        ifscCode: ifscCode.toUpperCase(),
        isVerified: true,
        status: 'ACTIVE',
        updatedAt: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, bankAccount });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

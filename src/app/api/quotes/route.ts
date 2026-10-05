import { NextResponse } from 'next/server';
import { QuoteEngine } from '@/lib/engine/quote-engine';
import { getCurrentUser } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    const userId = user?.id;

    const { usdtAmount, networkName } = await req.json();

    if (!usdtAmount || !networkName) {
      return NextResponse.json(
        { error: 'usdtAmount and networkName are required' },
        { status: 400 }
      );
    }

    const quote = await QuoteEngine.generateQuote({
      userId,
      usdtAmount,
      networkName,
    });

    return NextResponse.json({ success: true, quote });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Quote generation failed' }, { status: 400 });
  }
}

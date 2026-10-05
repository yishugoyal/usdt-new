import { Decimal, toDecimal } from '@/lib/decimal';
import { ProviderFactory } from '../providers/adapters/ProviderFactory';
import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

export interface QuoteParams {
  userId?: string;
  usdtAmount: string | number;
  networkName: string;
}

export interface CalculatedQuote {
  quoteId: string;
  usdtAmount: string;
  providerRate: string;
  netInrRate: string;
  grossInrAmount: string;
  companyFee: string;
  netInrAmount: string;
  rateSource: string;
  expiresAt: Date;
}

export class QuoteEngine {
  static async generateQuote(params: QuoteParams): Promise<CalculatedQuote> {
    const usdtAmt = toDecimal(params.usdtAmount);
    if (usdtAmt.lessThan(50)) {
      throw new Error('Minimum sell amount is 50 USDT');
    }
    if (usdtAmt.greaterThan(100000)) {
      throw new Error('Maximum sell amount per transaction is 100,000 USDT');
    }

    const rateProvider = ProviderFactory.getRateProvider();
    const liveRateRes = await rateProvider.fetchLiveRate('USDT', 'INR');
    const providerRate = liveRateRes.rate;

    const spreadPct = toDecimal(process.env.DEFAULT_SPREAD_PERCENTAGE || '0.5');
    const companyFeePct = toDecimal(process.env.DEFAULT_COMPANY_FEE_PERCENTAGE || '0.25');

    const spreadMultiplier = toDecimal(1).minus(spreadPct.div(100));
    const netInrRate = providerRate.mul(spreadMultiplier).toDecimalPlaces(4);

    const grossInrAmount = usdtAmt.mul(netInrRate).toDecimalPlaces(2);
    const companyFee = grossInrAmount.mul(companyFeePct.div(100)).toDecimalPlaces(2);
    const netInrAmount = grossInrAmount.minus(companyFee).toDecimalPlaces(2);

    const expirySeconds = parseInt(process.env.QUOTE_EXPIRY_SECONDS || '300', 10);
    const lockedAt = new Date();
    const expiresAt = new Date(lockedAt.getTime() + expirySeconds * 1000);

    const { data: dbQuote, error } = await supabase
      .from('rate_quotes')
      .insert({
        id: uuidv4(),
        userId: params.userId || null,
        assetSymbol: 'USDT',
        networkName: params.networkName,
        usdtAmount: usdtAmt.toFixed(6),
        providerRate: providerRate.toFixed(4),
        companySpread: spreadPct.toFixed(4),
        companyFee: companyFee.toFixed(4),
        netInrRate: netInrRate.toFixed(4),
        grossInrAmount: grossInrAmount.toFixed(4),
        netInrAmount: netInrAmount.toFixed(4),
        rateSource: liveRateRes.source,
        lockedAt: lockedAt.toISOString(),
        expiresAt: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    return {
      quoteId: dbQuote.id,
      usdtAmount: usdtAmt.toFixed(2),
      providerRate: providerRate.toFixed(2),
      netInrRate: netInrRate.toFixed(2),
      grossInrAmount: grossInrAmount.toFixed(2),
      companyFee: companyFee.toFixed(2),
      netInrAmount: netInrAmount.toFixed(2),
      rateSource: liveRateRes.source,
      expiresAt,
    };
  }
}

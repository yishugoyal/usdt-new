import { IRateProvider, RateResponse } from '../interfaces/IRateProvider';
import { Decimal } from '@/lib/decimal';
import { supabase } from '@/lib/supabase';

export class MockRateProvider implements IRateProvider {
  name = 'MANUAL_ADMIN_RATE_PROVIDER';

  async fetchLiveRate(assetSymbol: string, currency: string): Promise<RateResponse> {
    // Check if admin manually configured a base rate in system_settings
    let baseRate = 90.00;
    try {
      const { data } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'MANUAL_USDT_INR_RATE')
        .maybeSingle();

      if (data?.value && !isNaN(parseFloat(data.value))) {
        baseRate = parseFloat(data.value);
      } else if (process.env.MANUAL_USDT_INR_RATE && !isNaN(parseFloat(process.env.MANUAL_USDT_INR_RATE))) {
        baseRate = parseFloat(process.env.MANUAL_USDT_INR_RATE);
      }
    } catch (e: any) {
      console.warn('[MockRateProvider] Fallback to default rate:', e?.message);
    }

    return {
      assetSymbol,
      currency,
      rate: new Decimal(baseRate).toDecimalPlaces(2),
      timestamp: new Date(),
      source: 'Manual (Admin Set)',
    };
  }
}

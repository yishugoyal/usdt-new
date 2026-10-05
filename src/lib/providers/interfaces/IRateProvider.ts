import { Decimal } from '@/lib/decimal';

export interface RateResponse {
  assetSymbol: string;
  currency: string;
  rate: Decimal;
  timestamp: Date;
  source: string;
}

export interface IRateProvider {
  name: string;
  fetchLiveRate(assetSymbol: string, currency: string): Promise<RateResponse>;
}

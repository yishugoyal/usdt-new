import { IRateProvider } from '../interfaces/IRateProvider';
import { IBlockchainProvider } from '../interfaces/IBlockchainProvider';
import { IPayoutProvider } from '../interfaces/IPayoutProvider';
import { IComplianceProvider } from '../interfaces/IComplianceProvider';

import { MockRateProvider } from './MockRateProvider';
import { MockBlockchainProvider } from './MockBlockchainProvider';
import { MockPayoutProvider } from './MockPayoutProvider';
import { MockComplianceProvider } from './MockComplianceProvider';

export class ProviderFactory {
  static getRateProvider(): IRateProvider {
    return new MockRateProvider();
  }

  static getBlockchainProvider(): IBlockchainProvider {
    return new MockBlockchainProvider();
  }

  static getPayoutProvider(): IPayoutProvider {
    return new MockPayoutProvider();
  }

  static getComplianceProvider(): IComplianceProvider {
    return new MockComplianceProvider();
  }
}

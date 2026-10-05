import { IBlockchainProvider, DepositInfo, VerificationResult } from '../interfaces/IBlockchainProvider';
import { Decimal } from '@/lib/decimal';

export class MockBlockchainProvider implements IBlockchainProvider {
  name = 'MOCK_SANDBOX_BLOCKCHAIN_PROVIDER';

  async generateDepositAddress(orderId: string, networkName: string): Promise<DepositInfo> {
    const prefixMap: Record<string, string> = {
      'TRC20 (Tron)': 'T',
      'ERC20 (Ethereum)': '0x',
      'BEP20 (BNB Smart Chain)': '0x',
      'Polygon': '0x',
      'Solana': '',
    };

    const prefix = prefixMap[networkName] || '0x';
    const hexChars = '0123456789abcdefABCDEF';
    let randAddress = prefix;
    for (let i = 0; i < (networkName.includes('Tron') ? 33 : 40); i++) {
      randAddress += hexChars.charAt(Math.floor(Math.random() * hexChars.length));
    }

    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour deposit window

    return {
      address: randAddress,
      networkName,
      expiresAt,
    };
  }

  async verifyTransaction(txHash: string, networkName: string): Promise<VerificationResult> {
    // Standard mock verification simulating blockchain confirmation lookup
    const isTron = networkName.includes('Tron');
    const isSolana = networkName.includes('Solana');
    const requiredConfs = isTron ? 19 : isSolana ? 32 : 12;

    return {
      txHash,
      networkName,
      fromAddress: isTron ? 'TYq8u1wM8t72k...' : '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
      toAddress: '0xRupeeBridgeCompanyCustodyVault',
      amount: new Decimal('100.00'),
      confirmations: requiredConfs + 5,
      blockNumber: 48920192,
      isConfirmed: true,
      timestamp: new Date(),
    };
  }
}

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import ConditionalSiteLayout from '@/components/ConditionalSiteLayout';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'RupeeBridge | Advanced Institutional USDT → INR Sell-to-Company Platform',
  description:
    'RupeeBridge is a direct company counterparty settlement platform allowing verified users to sell USDT for INR transferred straight to their verified bank accounts.',
  keywords: 'USDT to INR, Sell USDT India, Institutional Crypto Liquidation, Bank Payout USDT',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body
        className={`${inter.className} bg-background text-text antialiased`}
      >
        <ConditionalSiteLayout>{children}</ConditionalSiteLayout>
      </body>
    </html>
  );
}

/*
# Create RupeeBridge Schema - Full Table Set

This migration creates the complete database schema for the RupeeBridge platform,
a USDT-to-INR sell-to-company platform. All tables use UUID primary keys and
application-level auth (bcrypt password hashing + JWT via jose), not Supabase Auth.

## Tables Created (in dependency order):

1. users - Customer accounts with email/mobile/password
2. user_profiles - Extended user profile info (1:1 with users)
3. staff_users - Internal staff/admin accounts with roles
4. bank_accounts - User bank accounts for INR payouts
5. assets - Crypto assets (USDT)
6. networks - Blockchain networks per asset (TRC20, ERC20, etc.)
7. rate_providers - Rate source configurations
8. rate_quotes - Locked rate quotes for sell orders
9. sell_orders - Main order entity tracking USDT sell flow
10. deposit_addresses - Per-order deposit addresses
11. blockchain_transactions - On-chain tx records
12. confirmation_records - Block confirmation tracking
13. risk_alerts - Risk engine alerts per order
14. compliance_cases - Compliance review cases
15. payouts - INR bank payout records
16. ledger_entries - Double-entry ledger
17. fee_rules - Fee configuration
18. tax_rules - Tax configuration
19. limit_rules - User tier limits
20. notifications - User notifications
21. support_tickets - Customer support tickets
22. audit_logs - Staff action audit trail
23. webhook_events - Incoming webhook idempotency
24. reconciliation_records - Daily reconciliation snapshots
25. system_settings - Key-value system config
26. production_readiness_checks - Production gate checklist
27. provider_configurations - External provider configs

## Security Notes:
- RLS is NOT enabled on these tables because the app uses server-side Prisma
  with its own JWT-based auth. The Next.js API routes enforce access control.
- All access goes through the service role key (server-side only), never the
  anon key from the browser.
*/

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  email TEXT UNIQUE NOT NULL,
  mobile TEXT UNIQUE NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "isEmailVerified" BOOLEAN NOT NULL DEFAULT false,
  "isMobileVerified" BOOLEAN NOT NULL DEFAULT false,
  "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
  "mfaSecret" TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_profiles (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "fullName" TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  "postalCode" TEXT,
  country TEXT NOT NULL DEFAULT 'IN',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS staff_users (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'SUPPORT',
  "mfaEnabled" BOOLEAN NOT NULL DEFAULT true,
  "mfaSecret" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bank_accounts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "bankName" TEXT NOT NULL,
  "accountNumberMasked" TEXT NOT NULL,
  "accountNumberEncrypted" TEXT NOT NULL,
  "ifscCode" TEXT NOT NULL,
  "accountHolderName" TEXT NOT NULL,
  "isVerified" BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  "coolingOffUntil" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  symbol TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  decimals INTEGER NOT NULL DEFAULT 6,
  "isEnabled" BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS networks (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "assetId" TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  "chainId" TEXT,
  "contractAddress" TEXT,
  "minConfirmations" INTEGER NOT NULL DEFAULT 12,
  "minDepositAmount" DECIMAL(28,6) NOT NULL,
  "isEnabled" BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS rate_providers (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rate_quotes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" TEXT REFERENCES users(id) ON DELETE SET NULL,
  "assetSymbol" TEXT NOT NULL DEFAULT 'USDT',
  "networkName" TEXT NOT NULL,
  "usdtAmount" DECIMAL(28,6) NOT NULL,
  "providerRate" DECIMAL(28,6) NOT NULL,
  "companySpread" DECIMAL(28,6) NOT NULL,
  "companyFee" DECIMAL(28,6) NOT NULL,
  "netInrRate" DECIMAL(28,6) NOT NULL,
  "grossInrAmount" DECIMAL(28,6) NOT NULL,
  "netInrAmount" DECIMAL(28,6) NOT NULL,
  "rateSource" TEXT NOT NULL,
  "lockedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "isUsed" BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS sell_orders (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "orderNumber" TEXT UNIQUE NOT NULL,
  "userId" TEXT NOT NULL REFERENCES users(id),
  "bankAccountId" TEXT NOT NULL REFERENCES bank_accounts(id),
  "quoteId" TEXT NOT NULL REFERENCES rate_quotes(id),
  "networkId" TEXT NOT NULL REFERENCES networks(id),
  "usdtAmount" DECIMAL(28,6) NOT NULL,
  "inrRate" DECIMAL(28,6) NOT NULL,
  "grossInrAmount" DECIMAL(28,6) NOT NULL,
  "feeInrAmount" DECIMAL(28,6) NOT NULL,
  "netInrAmount" DECIMAL(28,6) NOT NULL,
  state TEXT NOT NULL DEFAULT 'DRAFT',
  "depositAddress" TEXT,
  "txHash" TEXT,
  "confirmedAt" TIMESTAMPTZ,
  "completedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS deposit_addresses (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "orderId" TEXT UNIQUE NOT NULL REFERENCES sell_orders(id),
  "networkId" TEXT NOT NULL REFERENCES networks(id),
  address TEXT NOT NULL,
  memo TEXT,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "isUsed" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS blockchain_transactions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "orderId" TEXT REFERENCES sell_orders(id),
  "networkId" TEXT NOT NULL REFERENCES networks(id),
  "txHash" TEXT UNIQUE NOT NULL,
  "fromAddress" TEXT NOT NULL,
  "toAddress" TEXT NOT NULL,
  amount DECIMAL(28,6) NOT NULL,
  confirmations INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL,
  "blockNumber" BIGINT,
  "detectedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "confirmedAt" TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS confirmation_records (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "txId" TEXT NOT NULL REFERENCES blockchain_transactions(id) ON DELETE CASCADE,
  "confirmationCount" INTEGER NOT NULL,
  "verifiedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS risk_alerts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL REFERENCES users(id),
  "orderId" TEXT REFERENCES sell_orders(id),
  "riskLevel" TEXT NOT NULL,
  score INTEGER NOT NULL,
  "triggerRules" TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN',
  "resolutionNotes" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS compliance_cases (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "caseNumber" TEXT UNIQUE NOT NULL,
  "userId" TEXT NOT NULL REFERENCES users(id),
  "orderId" TEXT REFERENCES sell_orders(id),
  trigger TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN',
  "riskScore" INTEGER NOT NULL,
  evidence TEXT NOT NULL,
  "analystNotes" TEXT,
  "reviewerId" TEXT REFERENCES staff_users(id),
  decision TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payouts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "payoutNumber" TEXT UNIQUE NOT NULL,
  "orderId" TEXT NOT NULL REFERENCES sell_orders(id),
  "bankAccountId" TEXT NOT NULL REFERENCES bank_accounts(id),
  amount DECIMAL(28,6) NOT NULL,
  provider TEXT NOT NULL,
  "providerReference" TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING_APPROVAL',
  "initiatedAt" TIMESTAMPTZ,
  "completedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ledger_entries (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "entryNumber" TEXT UNIQUE NOT NULL,
  "orderId" TEXT REFERENCES sell_orders(id),
  "accountType" TEXT NOT NULL,
  debit DECIMAL(28,6) NOT NULL,
  credit DECIMAL(28,6) NOT NULL,
  description TEXT NOT NULL,
  "timestamp" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS fee_rules (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  "feePercentage" DECIMAL(28,6) NOT NULL,
  "minFee" DECIMAL(28,6) NOT NULL,
  "maxFee" DECIMAL(28,6) NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tax_rules (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  "taxPercentage" DECIMAL(28,6) NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS limit_rules (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userTier" TEXT NOT NULL DEFAULT 'STANDARD',
  "minOrderUsdt" DECIMAL(28,6) NOT NULL,
  "maxOrderUsdt" DECIMAL(28,6) NOT NULL,
  "maxDailyUsdt" DECIMAL(28,6) NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'INFO',
  "isRead" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS support_tickets (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "ticketNumber" TEXT UNIQUE NOT NULL,
  "userId" TEXT NOT NULL REFERENCES users(id),
  "orderId" TEXT REFERENCES sell_orders(id),
  subject TEXT NOT NULL,
  category TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'MEDIUM',
  status TEXT NOT NULL DEFAULT 'OPEN',
  messages TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "staffId" TEXT REFERENCES staff_users(id),
  "actorType" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  action TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT,
  details TEXT NOT NULL,
  "ipAddress" TEXT,
  "timestamp" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS webhook_events (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  provider TEXT NOT NULL,
  "eventId" TEXT UNIQUE NOT NULL,
  "eventType" TEXT NOT NULL,
  payload TEXT NOT NULL,
  signature TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING',
  "processedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reconciliation_records (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  date TIMESTAMPTZ NOT NULL,
  "totalDepositsUsdt" DECIMAL(28,6) NOT NULL,
  "totalPayoutsInr" DECIMAL(28,6) NOT NULL,
  "ledgerBalanceUsdt" DECIMAL(28,6) NOT NULL,
  "custodyBalanceUsdt" DECIMAL(28,6) NOT NULL,
  "bankBalanceInr" DECIMAL(28,6) NOT NULL,
  status TEXT NOT NULL,
  discrepancy DECIMAL(28,6) NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS system_settings (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  "isPublic" BOOLEAN NOT NULL DEFAULT false,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS production_readiness_checks (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  category TEXT NOT NULL,
  name TEXT UNIQUE NOT NULL,
  "isPassed" BOOLEAN NOT NULL DEFAULT false,
  details TEXT,
  "checkedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS provider_configurations (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "providerName" TEXT UNIQUE NOT NULL,
  "providerType" TEXT NOT NULL,
  "isSandbox" BOOLEAN NOT NULL DEFAULT true,
  "configData" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for frequently queried columns
CREATE INDEX IF NOT EXISTS idx_bank_accounts_userId ON bank_accounts("userId");
CREATE INDEX IF NOT EXISTS idx_sell_orders_userId ON sell_orders("userId");
CREATE INDEX IF NOT EXISTS idx_sell_orders_state ON sell_orders(state);
CREATE INDEX IF NOT EXISTS idx_rate_quotes_userId ON rate_quotes("userId");
CREATE INDEX IF NOT EXISTS idx_notifications_userId ON notifications("userId");
CREATE INDEX IF NOT EXISTS idx_risk_alerts_userId ON risk_alerts("userId");
CREATE INDEX IF NOT EXISTS idx_risk_alerts_orderId ON risk_alerts("orderId");
CREATE INDEX IF NOT EXISTS idx_compliance_cases_userId ON compliance_cases("userId");
CREATE INDEX IF NOT EXISTS idx_ledger_entries_orderId ON ledger_entries("orderId");
CREATE INDEX IF NOT EXISTS idx_blockchain_tx_orderId ON blockchain_transactions("orderId");
CREATE INDEX IF NOT EXISTS idx_networks_assetId ON networks("assetId");
CREATE INDEX IF NOT EXISTS idx_payouts_orderId ON payouts("orderId");

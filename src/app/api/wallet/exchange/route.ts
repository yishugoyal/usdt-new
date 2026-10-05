import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { ProviderFactory } from "@/lib/providers/adapters/ProviderFactory";
import { toDecimal } from "@/lib/decimal";
import { v4 as uuidv4 } from "uuid";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { usdtAmount, bankAccountId } = await req.json();

    if (!usdtAmount || parseFloat(usdtAmount) < 10)
      return NextResponse.json({ error: "Minimum exchange amount is 10 USDT" }, { status: 400 });
    if (!bankAccountId)
      return NextResponse.json({ error: "Bank account is required for exchange" }, { status: 400 });

    // Check balance
    const { data: userRow, error: userFetchError } = await supabase
      .from("users")
      .select("usdtBalance")
      .eq("id", user.id)
      .single();

    if (userFetchError) throw userFetchError;

    const currentBalance = parseFloat(userRow?.usdtBalance || "0");
    const exchangeAmt = parseFloat(usdtAmount);

    if (currentBalance < exchangeAmt)
      return NextResponse.json({ error: "Insufficient USDT balance" }, { status: 400 });

    // Verify bank account belongs to user
    const { data: bank } = await supabase
      .from("bank_accounts")
      .select("id, bankName, accountHolderName, accountNumberMasked, ifscCode")
      .eq("id", bankAccountId)
      .eq("userId", user.id)
      .single();

    if (!bank) return NextResponse.json({ error: "Bank account not found" }, { status: 404 });

    // Get live rate
    const rateProvider = ProviderFactory.getRateProvider();
    const liveRateRes = await rateProvider.fetchLiveRate("USDT", "INR");
    const providerRate = liveRateRes.rate;

    const spreadPct = toDecimal(process.env.DEFAULT_SPREAD_PERCENTAGE || "0.5");
    const companyFeePct = toDecimal(process.env.DEFAULT_COMPANY_FEE_PERCENTAGE || "0.25");

    const spreadMultiplier = toDecimal(1).minus(spreadPct.div(100));
    const netInrRate = providerRate.mul(spreadMultiplier).toDecimalPlaces(4);
    const grossInrAmount = toDecimal(exchangeAmt).mul(netInrRate).toDecimalPlaces(2);
    const companyFee = grossInrAmount.mul(companyFeePct.div(100)).toDecimalPlaces(2);
    const netInrAmount = grossInrAmount.minus(companyFee).toDecimalPlaces(2);

    const txId = uuidv4();
    const nowIso = new Date().toISOString();

    // Deduct balance
    const newBalance = (currentBalance - exchangeAmt).toFixed(6);
    const { error: balanceError } = await supabase
      .from("users")
      .update({ usdtBalance: newBalance, updatedAt: nowIso })
      .eq("id", user.id);
    if (balanceError) throw balanceError;

    // Record exchange transaction
    const { error: txError } = await supabase.from("wallet_transactions").insert({
      id: txId,
      userId: user.id,
      type: "EXCHANGE",
      usdtAmount: exchangeAmt.toFixed(6),
      inrAmount: netInrAmount.toFixed(2),
      inrRate: netInrRate.toFixed(4),
      bankAccountId,
      status: "PROCESSING",
      notes: `Exchanged ${exchangeAmt} USDT @ ₹${netInrRate.toFixed(2)}/USDT. Bank payout: ₹${netInrAmount.toFixed(2)} to ${bank.bankName} (${bank.accountHolderName})`,
      metadata: {
        bankName: bank.bankName,
        accountHolderName: bank.accountHolderName,
        accountNumberMasked: bank.accountNumberMasked,
        ifscCode: bank.ifscCode,
        grossInrAmount: grossInrAmount.toString(),
        companyFee: companyFee.toString(),
        netInrAmount: netInrAmount.toString(),
        rate: netInrRate.toString(),
        userEmail: user.email,
        utr: null,
        source: "WALLET_EXCHANGE",
      },
      createdAt: nowIso,
      updatedAt: nowIso,
    });
    if (txError) throw txError;

    return NextResponse.json({
      success: true,
      exchange: {
        id: txId,
        usdtAmount: exchangeAmt,
        inrRate: netInrRate.toFixed(2),
        inrAmount: netInrAmount.toFixed(2),
        bankName: bank.bankName,
        status: "PROCESSING",
        newBalance,
      },
    });
  } catch (error: any) {
    console.error("Exchange error:", error);
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 });
  }
}

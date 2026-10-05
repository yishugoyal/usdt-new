import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const TRON_USDT_CONTRACTS = [
  "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t", // Official Tron USDT (TRC20)
];

const MIN_CONFIRMATIONS = 19;
const MAX_ATTEMPTS_PER_HOUR = 10;
const DEPOSIT_EXPIRY_MINUTES = 30;

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { transactionId, txHash } = body;

    if (!transactionId) return NextResponse.json({ error: "Transaction ID is required" }, { status: 400 });
    if (!txHash || typeof txHash !== "string" || txHash.trim().length < 10)
      return NextResponse.json({ error: "Please enter a valid Transaction Hash (TxID)" }, { status: 400 });

    const cleanHash = txHash.trim().replace(/^0x/i, "").toLowerCase();

    if (!/^[0-9a-f]{64}$/.test(cleanHash)) {
      return NextResponse.json({
        error: "Invalid TxID format. A Tron transaction hash must be exactly 64 hexadecimal characters.",
      }, { status: 400 });
    }

    // SECURITY 1: Rate limiting (max 10 verify attempts / user / hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recentAttempts } = await supabase
      .from("wallet_transactions")
      .select("id", { count: "exact", head: true })
      .eq("userId", user.id)
      .eq("type", "DEPOSIT")
      .gte("updatedAt", oneHourAgo);

    if ((recentAttempts ?? 0) >= MAX_ATTEMPTS_PER_HOUR) {
      return NextResponse.json({ error: "Too many verification attempts. Please wait before trying again." }, { status: 429 });
    }

    // Fetch the pending deposit order
    const { data: tx, error: txError } = await supabase
      .from("wallet_transactions")
      .select("*")
      .eq("id", transactionId)
      .eq("userId", user.id)
      .eq("type", "DEPOSIT")
      .single();

    if (txError || !tx) {
      return NextResponse.json({ error: "Deposit order not found or does not belong to your account." }, { status: 404 });
    }

    // SECURITY 2: Idempotency
    if (tx.status === "COMPLETED") {
      return NextResponse.json({
        success: true,
        alreadyCompleted: true,
        message: "This deposit has already been verified and credited to your balance.",
        txHash: tx.txHash,
      });
    }

    // SECURITY 3: Deposit expiry
    const meta = (typeof tx.metadata === "object" && tx.metadata !== null) ? tx.metadata : {};
    const expiresAt = meta.expiresAt
      ? new Date(meta.expiresAt)
      : new Date(new Date(tx.createdAt).getTime() + DEPOSIT_EXPIRY_MINUTES * 60 * 1000);

    if (Date.now() > expiresAt.getTime()) {
      await supabase
        .from("wallet_transactions")
        .update({ status: "FAILED", notes: "Deposit window expired.", updatedAt: new Date().toISOString() })
        .eq("id", transactionId)
        .eq("status", "PENDING");
      return NextResponse.json({
        error: "This deposit order has expired (30-minute window). Please create a new deposit.",
      }, { status: 410 });
    }

    // SECURITY 4: Global txHash uniqueness — check ALL statuses, ALL rows
    const { data: globalHashCheck } = await supabase
      .from("wallet_transactions")
      .select("id, status, userId")
      .eq("txHash", cleanHash)
      .neq("id", transactionId)
      .limit(1)
      .maybeSingle();

    if (globalHashCheck) {
      return NextResponse.json({
        error: "This Transaction ID (TxHash) has already been submitted. Each on-chain transaction can only be used once.",
      }, { status: 409 });
    }

    // SECURITY 5: Lock the txHash immediately on PENDING record (race-condition + DB-constraint safe)
    // The partial unique index on txHash (WHERE txHash IS NOT NULL) means if two concurrent
    // requests try to lock the same hash, the DB will reject the second one with error 23505.
    const lockMeta = { ...meta, lastVerifyAttempt: new Date().toISOString(), submittedTxHash: cleanHash };
    const { error: lockError } = await supabase
      .from("wallet_transactions")
      .update({ txHash: cleanHash, metadata: lockMeta, updatedAt: new Date().toISOString() })
      .eq("id", transactionId)
      .eq("status", "PENDING");

    // DB unique index violation — another row already has this txHash
    if (lockError) {
      const isUniqueViolation =
        lockError.code === "23505" ||
        (lockError.message || "").toLowerCase().includes("unique") ||
        (lockError.message || "").toLowerCase().includes("duplicate");

      if (isUniqueViolation) {
        return NextResponse.json({
          error: "This Transaction ID has already been used for a previous deposit. Each on-chain transaction can only fund one deposit.",
        }, { status: 409 });
      }
      // For other errors, log and continue (non-critical lock step)
      console.warn("Hash lock non-critical error:", lockError.message);
    }

    // SECURITY 6: TronScan on-chain verification
    const apiKey = process.env.TRONSCAN_API_KEY || process.env.BLOCKCHAIN_PROVIDER_API_KEY || "";
    const headers: Record<string, string> = { Accept: "application/json", "User-Agent": "RupeeBridge-Validator/2.0" };
    if (apiKey) headers["TRON-PRO-API-KEY"] = apiKey;

    let tronScanData: any = null;

    try {
      const res = await fetch(`https://apilist.tronscanapi.com/api/transaction-info?hash=${cleanHash}`, { headers, cache: "no-store" });
      if (res.ok) tronScanData = await res.json();
    } catch (e: any) {
      console.warn("TronScan primary error:", e.message);
    }

    // Fallback: TronGrid
    if (!tronScanData || (!tronScanData.contractRet && !tronScanData.hash)) {
      try {
        const gridHeaders: Record<string, string> = {};
        if (apiKey) gridHeaders["TRON-PRO-API-KEY"] = apiKey;
        const gridRes = await fetch(`https://api.trongrid.io/v1/transactions/${cleanHash}`, { headers: gridHeaders, cache: "no-store" });
        if (gridRes.ok) {
          const gridJson = await gridRes.json();
          if (gridJson.data?.length > 0) {
            const raw = gridJson.data[0];
            const ret = raw.ret?.[0]?.contractRet || (raw.result ? "SUCCESS" : "UNKNOWN");
            tronScanData = { contractRet: ret, fromGrid: true, raw };
          }
        }
      } catch (err: any) {
        console.warn("TronGrid fallback error:", err.message);
      }
    }

    if (!tronScanData || (!tronScanData.contractRet && !tronScanData.hash && !tronScanData.fromGrid)) {
      return NextResponse.json({
        error: "Transaction not found on the Tron blockchain yet. Please wait 3-5 minutes and try again.",
      }, { status: 404 });
    }

    // Execution status check
    const contractResult = (tronScanData.contractRet || "").toUpperCase();

    if (contractResult === "") {
      return NextResponse.json({
        error: "Transaction is still being processed by the Tron network. Please wait 2-3 minutes and try again.",
      }, { status: 202 });
    }

    if (contractResult !== "SUCCESS") {
      return NextResponse.json({
        error: `Transaction failed on the Tron blockchain (status: ${contractResult}). No deposit will be credited.`,
      }, { status: 400 });
    }

    // Block confirmation check (min 19 = ~1 minute)
    const onChainConfirmations: number =
      tronScanData.confirmations ??
      tronScanData.confirmed_nodes ??
      (tronScanData.block_timestamp ? 999 : 0);

    if (!tronScanData.fromGrid && typeof onChainConfirmations === "number" && onChainConfirmations < MIN_CONFIRMATIONS) {
      return NextResponse.json({
        error: `Transaction found but only ${onChainConfirmations}/${MIN_CONFIRMATIONS} block confirmations. Please wait ~1 minute and try again.`,
      }, { status: 202 });
    }

    // Find the USDT TRC20 transfer to our deposit address
    const expectedAddress = (tx.depositAddress || "").trim().toLowerCase();
    const expectedAmount = parseFloat(tx.usdtAmount || "0");

    let transfers: any[] = [];
    if (Array.isArray(tronScanData.trc20TransferInfo)) transfers = tronScanData.trc20TransferInfo;
    else if (tronScanData.tokenTransferInfo) transfers = [tronScanData.tokenTransferInfo];

    const isUsdtContract = (c: string) =>
      TRON_USDT_CONTRACTS.some((x) => x.toLowerCase() === c.toLowerCase());

    const actualTransfer = transfers.find((t: any) => {
      const toAddr = (t.to_address || "").trim().toLowerCase();
      const symbol = (t.symbol || "").toUpperCase();
      const isUsdt =
        symbol === "USDT" ||
        isUsdtContract(t.contract_address || "") ||
        (t.name && t.name.toLowerCase().includes("tether"));
      return isUsdt && toAddr === expectedAddress;
    });

    if (!actualTransfer) {
      if (transfers.length > 0) {
        return NextResponse.json({
          error: `Transfer destination (${transfers[0].to_address}) does not match your deposit address (${tx.depositAddress}). Verify your withdrawal destination.`,
        }, { status: 400 });
      }
      return NextResponse.json({
        error: "No USDT (TRC20) transfer found in this transaction. Ensure you sent USDT on TRC20 network, not TRX or another token.",
      }, { status: 400 });
    }

    // Amount verification
    const decimals = actualTransfer.decimals || 6;
    const rawAmount = actualTransfer.amount_str || actualTransfer.amount || "0";
    const actualAmount = parseFloat(rawAmount) / Math.pow(10, decimals);

    if (actualAmount < expectedAmount * 0.999) {
      return NextResponse.json({
        error: `Transferred amount (${actualAmount.toFixed(2)} USDT) is less than the required deposit (${expectedAmount.toFixed(2)} USDT). Deposit cannot be credited until the full amount is received.`,
      }, { status: 400 });
    }

    // ALL CHECKS PASSED - Credit balance
    const creditedAmount = actualAmount;

    const { data: dbUser, error: userFetchError } = await supabase
      .from("users")
      .select("usdtBalance")
      .eq("id", user.id)
      .single();

    if (userFetchError || !dbUser) {
      return NextResponse.json({ error: "Failed to fetch user wallet balance." }, { status: 500 });
    }

    const currentBal = parseFloat(dbUser.usdtBalance || "0");
    const newBalance = (currentBal + creditedAmount).toFixed(6);

    const { error: balanceUpdateError } = await supabase
      .from("users")
      .update({ usdtBalance: newBalance, updatedAt: new Date().toISOString() })
      .eq("id", user.id);

    if (balanceUpdateError) {
      console.error("Balance update error:", balanceUpdateError);
      return NextResponse.json({ error: "Failed to update wallet balance." }, { status: 500 });
    }

    // Mark COMPLETED with full audit metadata
    const finalMeta = {
      ...lockMeta,
      verifiedVia: "TronScan API",
      fromAddress: actualTransfer.from_address,
      toAddress: actualTransfer.to_address,
      contractAddress: actualTransfer.contract_address,
      actualAmountCredited: creditedAmount,
      onChainConfirmations,
      confirmedAt: new Date().toISOString(),
    };

    const { error: completedError } = await supabase
      .from("wallet_transactions")
      .update({
        status: "COMPLETED",
        txHash: cleanHash, // DB unique index will reject this if hash already exists
        metadata: finalMeta,
        notes: `Verified via TronScan. Credited +${creditedAmount.toFixed(6)} USDT. From: ${actualTransfer.from_address}.`,
        updatedAt: new Date().toISOString(),
      })
      .eq("id", transactionId);

    // If DB uniqueness constraint fires here, rollback the balance credit
    if (completedError) {
      const isUniqueViolation =
        completedError.code === "23505" ||
        (completedError.message || "").toLowerCase().includes("unique");

      if (isUniqueViolation) {
        // Revert the balance we just added
        await supabase
          .from("users")
          .update({ usdtBalance: currentBal.toFixed(6), updatedAt: new Date().toISOString() })
          .eq("id", user.id);

        return NextResponse.json({
          error: "This Transaction ID was already used by another deposit. Your balance has not been modified.",
        }, { status: 409 });
      }

      console.error("Failed to mark deposit COMPLETED:", completedError);
      return NextResponse.json({ error: "Deposit credited but record update failed. Contact support with your TxID." }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Deposit verified! +${creditedAmount.toFixed(2)} USDT credited to your wallet.`,
      credited: creditedAmount,
      newBalance,
      txHash: cleanHash,
    });

  } catch (error: any) {
    console.error("verify-deposit error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

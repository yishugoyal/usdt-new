import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getCurrentStaff } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const staff = await getCurrentStaff();
    if (!staff) return NextResponse.json({ error: "Unauthorized admin access" }, { status: 401 });

    // 1. Fetch all wallet transactions
    const { data: transactions, error: txError } = await supabase
      .from("wallet_transactions")
      .select("*")
      .order("createdAt", { ascending: false })
      .limit(300);

    if (txError) throw txError;

    // 2. Fetch users for relationship mapping
    const { data: users, error: userError } = await supabase
      .from("users")
      .select("id, email, mobile, usdtBalance");

    if (userError) throw userError;

    // 3. Fetch bank accounts for exchange relationship mapping
    const { data: bankAccounts, error: bankError } = await supabase
      .from("bank_accounts")
      .select("id, bankName, accountNumberMasked, ifscCode, accountHolderName");

    if (bankError) throw bankError;

    // Create lookup maps
    const userMap = new Map((users || []).map((u: any) => [u.id, u]));
    const bankMap = new Map((bankAccounts || []).map((b: any) => [b.id, b]));

    // Enrich transactions
    const enrichedTransactions = (transactions || []).map((tx: any) => {
      const u = userMap.get(tx.userId) || {
        id: tx.userId,
        email: tx.metadata?.userEmail || "Unknown User",
        mobile: "N/A",
        usdtBalance: "0",
      };

      const b = tx.bankAccountId ? bankMap.get(tx.bankAccountId) : null;

      return {
        ...tx,
        user: u,
        bankAccount: b || (tx.metadata?.bankName ? {
          bankName: tx.metadata.bankName,
          accountNumberMasked: tx.metadata.accountNumberMasked,
          accountHolderName: tx.metadata.accountHolderName,
          ifscCode: tx.metadata.ifscCode,
        } : null),
      };
    });

    // Compute live stats
    let totalWithdrawalsCount = 0;
    let totalWithdrawalsUsdt = 0;
    let pendingWithdrawalsCount = 0;
    let pendingWithdrawalsUsdt = 0;

    let totalExchangesCount = 0;
    let totalExchangesUsdt = 0;
    let totalExchangesInr = 0;
    let pendingExchangesCount = 0;
    let pendingExchangesInr = 0;

    let totalDepositsCount = 0;
    let totalDepositsUsdt = 0;

    for (const t of enrichedTransactions) {
      const usdt = parseFloat(t.usdtAmount || "0");
      const inr = parseFloat(t.inrAmount || "0");
      const isPending = t.status === "PENDING" || t.status === "PROCESSING";

      if (t.type === "WITHDRAW") {
        totalWithdrawalsCount++;
        totalWithdrawalsUsdt += usdt;
        if (isPending) {
          pendingWithdrawalsCount++;
          pendingWithdrawalsUsdt += usdt;
        }
      } else if (t.type === "EXCHANGE") {
        totalExchangesCount++;
        totalExchangesUsdt += usdt;
        totalExchangesInr += inr;
        if (isPending) {
          pendingExchangesCount++;
          pendingExchangesInr += inr;
        }
      } else if (t.type === "DEPOSIT") {
        if (t.status === "COMPLETED") {
          totalDepositsCount++;
          totalDepositsUsdt += usdt;
        }
      }
    }

    const stats = {
      totalWithdrawalsCount,
      totalWithdrawalsUsdt: totalWithdrawalsUsdt.toFixed(2),
      pendingWithdrawalsCount,
      pendingWithdrawalsUsdt: pendingWithdrawalsUsdt.toFixed(2),

      totalExchangesCount,
      totalExchangesUsdt: totalExchangesUsdt.toFixed(2),
      totalExchangesInr: totalExchangesInr.toFixed(2),
      pendingExchangesCount,
      pendingExchangesInr: pendingExchangesInr.toFixed(2),

      totalDepositsCount,
      totalDepositsUsdt: totalDepositsUsdt.toFixed(2),

      pendingTotal: pendingWithdrawalsCount + pendingExchangesCount,
    };

    return NextResponse.json({
      success: true,
      transactions: enrichedTransactions,
      stats,
    });
  } catch (error: any) {
    console.error("Admin transactions GET error:", error);
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const staff = await getCurrentStaff();
    if (!staff) return NextResponse.json({ error: "Unauthorized admin access" }, { status: 401 });

    const { transactionId, status, txHash, utr, notes } = await req.json();

    if (!transactionId || !status) {
      return NextResponse.json({ error: "transactionId and status are required" }, { status: 400 });
    }

    // Fetch existing transaction
    const { data: existingTx, error: fetchError } = await supabase
      .from("wallet_transactions")
      .select("*")
      .eq("id", transactionId)
      .single();

    if (fetchError || !existingTx) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    const nowIso = new Date().toISOString();
    let updatedMetadata = {
      ...(existingTx.metadata || {}),
      updatedBy: staff.email,
      updatedAt: nowIso,
    };

    if (txHash) updatedMetadata.payoutTxHash = txHash;
    if (utr) updatedMetadata.utr = utr;

    // Handle rejection of withdrawal -> refund USDT back to user balance
    if (status === "REJECTED" && existingTx.status !== "REJECTED" && existingTx.type === "WITHDRAW") {
      const withdrawAmt = parseFloat(existingTx.usdtAmount || "0");
      const networkFee = parseFloat(existingTx.metadata?.networkFee || "1");
      const refundAmt = withdrawAmt + networkFee;

      // Get user current balance
      const { data: userRow } = await supabase
        .from("users")
        .select("usdtBalance")
        .eq("id", existingTx.userId)
        .single();

      if (userRow) {
        const currentBal = parseFloat(userRow.usdtBalance || "0");
        const refundedBal = (currentBal + refundAmt).toFixed(6);

        await supabase
          .from("users")
          .update({ usdtBalance: refundedBal, updatedAt: nowIso })
          .eq("id", existingTx.userId);

        updatedMetadata.refunded = true;
        updatedMetadata.refundedAmount = refundAmt;
        updatedMetadata.refundedAt = nowIso;
      }
    }

    const updatePayload: any = {
      status,
      metadata: updatedMetadata,
      updatedAt: nowIso,
    };

    if (txHash) updatePayload.txHash = txHash;
    if (notes) updatePayload.notes = notes;
    if (status === "COMPLETED") updatePayload.completedAt = nowIso;

    const { data: updatedTx, error: updateError } = await supabase
      .from("wallet_transactions")
      .update(updatePayload)
      .eq("id", transactionId)
      .select()
      .single();

    if (updateError) throw updateError;

    return NextResponse.json({
      success: true,
      transaction: updatedTx,
      message: `Transaction ${transactionId} updated to ${status}`,
    });
  } catch (error: any) {
    console.error("Admin transactions PATCH error:", error);
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 });
  }
}

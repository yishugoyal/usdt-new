import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// Simulates blockchain confirmation and credits wallet balance
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { transactionId, txHash } = await req.json();
    if (!transactionId)
      return NextResponse.json({ error: "transactionId is required" }, { status: 400 });

    // Fetch the pending transaction
    const { data: tx, error: txError } = await supabase
      .from("wallet_transactions")
      .select("*")
      .eq("id", transactionId)
      .eq("userId", user.id)
      .eq("type", "DEPOSIT")
      .single();

    if (txError || !tx)
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });

    if (tx.status === "COMPLETED")
      return NextResponse.json({ error: "Transaction already confirmed" }, { status: 409 });

    const usdtToCredit = parseFloat(tx.usdtAmount);

    // Mark transaction completed
    const { error: updateTxError } = await supabase
      .from("wallet_transactions")
      .update({ status: "COMPLETED", txHash: txHash || null, completedAt: new Date().toISOString() })
      .eq("id", transactionId);

    if (updateTxError) throw updateTxError;

    // Fetch current balance
    const { data: userRow, error: userFetchError } = await supabase
      .from("users")
      .select("usdtBalance")
      .eq("id", user.id)
      .single();

    if (userFetchError) throw userFetchError;

    const newBalance = (parseFloat(userRow?.usdtBalance || "0") + usdtToCredit).toFixed(6);

    // Update user balance
    const { error: balanceError } = await supabase
      .from("users")
      .update({ usdtBalance: newBalance, updatedAt: new Date().toISOString() })
      .eq("id", user.id);

    if (balanceError) throw balanceError;

    return NextResponse.json({
      success: true,
      newBalance,
      credited: usdtToCredit,
    });
  } catch (error: any) {
    console.error("Confirm deposit error:", error);
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 });
  }
}

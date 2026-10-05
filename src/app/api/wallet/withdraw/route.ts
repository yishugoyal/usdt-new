import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { v4 as uuidv4 } from "uuid";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { usdtAmount, networkName, withdrawAddress } = await req.json();

    if (!usdtAmount || parseFloat(usdtAmount) < 5)
      return NextResponse.json({ error: "Minimum withdrawal is 5 USDT" }, { status: 400 });
    if (!networkName || !withdrawAddress)
      return NextResponse.json({ error: "Network and withdrawal address are required" }, { status: 400 });

    const { data: userRow, error: fetchError } = await supabase
      .from("users")
      .select("usdtBalance")
      .eq("id", user.id)
      .single();

    if (fetchError) throw fetchError;

    const currentBalance = parseFloat(userRow?.usdtBalance || "0");
    const withdrawAmt = parseFloat(usdtAmount);

    if (currentBalance < withdrawAmt)
      return NextResponse.json({ error: "Insufficient USDT balance" }, { status: 400 });

    const networkFee = 1; // fixed 1 USDT network fee
    const totalDeduct = withdrawAmt + networkFee;
    if (currentBalance < totalDeduct)
      return NextResponse.json({ error: `Insufficient balance (need ${totalDeduct} USDT incl. ${networkFee} USDT network fee)` }, { status: 400 });

    const newBalance = (currentBalance - totalDeduct).toFixed(6);

    const { error: balanceError } = await supabase
      .from("users")
      .update({ usdtBalance: newBalance, updatedAt: new Date().toISOString() })
      .eq("id", user.id);

    if (balanceError) throw balanceError;

    const txId = uuidv4();
    const nowIso = new Date().toISOString();
    const { error: txError } = await supabase.from("wallet_transactions").insert({
      id: txId,
      userId: user.id,
      type: "WITHDRAW",
      usdtAmount: withdrawAmt.toFixed(6),
      networkName,
      depositAddress: withdrawAddress,
      status: "PROCESSING",
      notes: `Withdrew ${withdrawAmt} USDT to ${withdrawAddress} via ${networkName}. Fee: ${networkFee} USDT`,
      metadata: {
        withdrawAddress,
        networkName,
        networkFee,
        netAmount: withdrawAmt.toFixed(6),
        totalDeducted: totalDeduct.toFixed(6),
        userEmail: user.email,
        source: "WALLET_WITHDRAWAL",
      },
      createdAt: nowIso,
      updatedAt: nowIso,
    });

    if (txError) throw txError;

    return NextResponse.json({
      success: true,
      withdrawal: {
        id: txId,
        usdtAmount: withdrawAmt,
        networkName,
        withdrawAddress,
        status: "PROCESSING",
        newBalance,
      },
    });
  } catch (error: any) {
    console.error("Withdraw error:", error);
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 });
  }
}

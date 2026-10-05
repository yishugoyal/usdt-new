import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = params;
    if (!id) return NextResponse.json({ error: "Missing deposit ID" }, { status: 400 });

    const { data: tx, error } = await supabase
      .from("wallet_transactions")
      .select("*")
      .eq("id", id)
      .eq("userId", user.id)
      .single();

    if (error || !tx) {
      return NextResponse.json({ error: "Deposit order not found" }, { status: 404 });
    }

    const meta = (typeof tx.metadata === "object" && tx.metadata !== null) ? tx.metadata : {};
    const depositId = meta.depositId || `DEP-${tx.id.slice(0, 8).toUpperCase()}`;
    const remark = tx.status === "COMPLETED" ? "Completed" : tx.status === "FAILED" ? "Failed" : "Processing";
    const expiresAt = meta.expiresAt || new Date(new Date(tx.createdAt).getTime() + 30 * 60 * 1000).toISOString();

    return NextResponse.json({
      success: true,
      deposit: {
        id: tx.id,
        depositId,
        amount: parseFloat(tx.usdtAmount || "0").toFixed(6),
        network: tx.networkName || "TRC20",
        depositAddress: tx.depositAddress,
        createdAt: tx.createdAt,
        status: tx.status,
        remark,
        expiresAt,
        txHash: tx.txHash,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 });
  }
}

// Cancel deposit order
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = params;
    const { error } = await supabase
      .from("wallet_transactions")
      .update({ status: "CANCELLED" })
      .eq("id", id)
      .eq("userId", user.id)
      .eq("status", "PENDING");

    if (error) throw error;
    return NextResponse.json({ success: true, message: "Deposit cancelled" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 });
  }
}

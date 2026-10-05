import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { ProviderFactory } from "@/lib/providers/adapters/ProviderFactory";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: userRow } = await supabase
      .from("users")
      .select("usdtBalance, tier, accountStatus")
      .eq("id", user.id)
      .single();

    // Get live rate
    let liveRate = null;
    let rateSource = "N/A";
    try {
      const rateProvider = ProviderFactory.getRateProvider();
      const rateRes = await rateProvider.fetchLiveRate("USDT", "INR");
      liveRate = parseFloat(rateRes.rate.toFixed(2));
      rateSource = rateRes.source;
    } catch (_) {}

    return NextResponse.json({
      success: true,
      balance: {
        usdt: parseFloat(userRow?.usdtBalance || "0").toFixed(6),
        tier: userRow?.tier || "PLATINUM",
        accountStatus: userRow?.accountStatus || "Active",
        liveRate,
        rateSource,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

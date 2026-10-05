import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { v4 as uuidv4 } from "uuid";

export const dynamic = "force-dynamic";

const DEFAULT_TRON_DEPOSIT_ADDRESS = "TL1417xeaNrvU6La3N5Vgpye1e47i4zHUv";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const usdtAmount = body.usdtAmount;
    const networkName = body.networkName || "TRC20";

    if (!usdtAmount || parseFloat(usdtAmount) < 1) {
      return NextResponse.json({ error: "Minimum deposit is 1 USDT" }, { status: 400 });
    }

    // 1. Check if deposits on this network are enabled in system_settings
    const enabledKey = networkName.includes("ETH") || networkName.includes("ERC20")
      ? "ETH_DEPOSIT_ENABLED"
      : networkName.includes("BSC") || networkName.includes("BEP20")
      ? "BSC_DEPOSIT_ENABLED"
      : "TRON_DEPOSIT_ENABLED";

    const { data: enabledRow } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", enabledKey)
      .maybeSingle();

    if (enabledRow && enabledRow.value === "false") {
      return NextResponse.json(
        { error: `${networkName} deposits are currently paused by the platform administrator.` },
        { status: 400 }
      );
    }

    // 2. Fetch deposit address from system_settings or default
    let depositAddress = "";
    try {
      const addressKey = networkName.includes("ETH") || networkName.includes("ERC20")
        ? "ETH_DEPOSIT_ADDRESS"
        : networkName.includes("BSC") || networkName.includes("BEP20")
        ? "BSC_DEPOSIT_ADDRESS"
        : "TRON_DEPOSIT_ADDRESS";

      const { data: settingRow } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", addressKey)
        .maybeSingle();

      if (settingRow?.value && settingRow.value.trim().length > 15) {
        depositAddress = settingRow.value.trim();
      }
    } catch (e) {
      console.warn("Could not query deposit address from system_settings:", e);
    }

    if (!depositAddress) {
      depositAddress = process.env.TRON_DEPOSIT_ADDRESS || DEFAULT_TRON_DEPOSIT_ADDRESS;
    }

    // 3. Randomly generate Deposit ID (e.g. DEP-83920194)
    const randomNum = Math.floor(10000000 + Math.random() * 90000000);
    const depositId = `DEP-${randomNum}`;

    const txId = uuidv4();
    const nowIso = new Date().toISOString();

    // 4. Create PENDING wallet_transaction entry
    const { error: insertError } = await supabase.from("wallet_transactions").insert({
      id: txId,
      userId: user.id,
      type: "DEPOSIT",
      usdtAmount: parseFloat(usdtAmount).toFixed(6),
      networkName,
      depositAddress,
      status: "PENDING",
      notes: `User initiated deposit ${depositId} of ${usdtAmount} USDT via ${networkName} to ${depositAddress}`,
      metadata: {
        depositId,
        expectedAmount: parseFloat(usdtAmount).toFixed(6),
        networkName,
        depositAddress,
        userEmail: user.email,
        source: "WALLET_DEPOSIT",
      },
      createdAt: nowIso,
      updatedAt: nowIso,
    });

    if (insertError) {
      console.error("Failed to insert pending deposit transaction:", insertError);
      throw insertError;
    }

    return NextResponse.json({
      success: true,
      deposit: {
        id: txId,
        depositId,
        amount: parseFloat(usdtAmount).toFixed(6),
        network: networkName,
        address: depositAddress,
        qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(depositAddress)}`,
        status: "PENDING",
        instructions: [
          `Send exactly ${parseFloat(usdtAmount).toFixed(2)} USDT (${networkName}) to the address above.`,
          "Wait 1-3 minutes for the blockchain network to confirm your transaction.",
          "Your wallet balance will be automatically credited upon confirmation.",
        ],
      },
    });
  } catch (error: any) {
    console.error("Wallet deposit API error:", error);
    return NextResponse.json({ error: error.message || "Failed to initialize deposit" }, { status: 500 });
  }
}

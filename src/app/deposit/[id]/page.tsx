"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  Copy, CheckCircle2, ArrowLeft, RefreshCw, AlertTriangle, Lightbulb,
  ExternalLink, ShieldCheck, Check, Clock, QrCode, ArrowRight, XCircle
} from "lucide-react";

interface DepositData {
  id: string;
  depositId: string;
  amount: string;
  network: string;
  depositAddress: string;
  createdAt: string;
  status: string;
  remark: string;
  expiresAt: string;
  txHash?: string;
}

export default function DepositPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [deposit, setDeposit] = useState<DepositData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Verification state
  const [txHash, setTxHash] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState("");
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [pendingConfirmation, setPendingConfirmation] = useState<string | null>(null); // 202: found but not yet confirmed
  const [successData, setSuccessData] = useState<{ credited: number; newBalance: string; txHash: string } | null>(null);

  // Copy feedback
  const [copiedAddr, setCopiedAddr] = useState(false);
  const [copiedAmt, setCopiedAmt] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  // Countdown timer (30 min)
  const [timeLeft, setTimeLeft] = useState<{ hours: string; minutes: string; seconds: string }>({
    hours: "00",
    minutes: "30",
    seconds: "00",
  });
  const [isExpired, setIsExpired] = useState(false);

  // Load deposit data
  const loadDeposit = useCallback(async () => {
    if (!id) return;
    try {
      const res = await fetch(`/api/wallet/deposit/${id}`);
      const data = await res.json();
      if (data.success && data.deposit) {
        setDeposit(data.deposit);
        if (data.deposit.status === "COMPLETED") {
          setSuccessData({
            credited: parseFloat(data.deposit.amount),
            newBalance: "",
            txHash: data.deposit.txHash || "",
          });
        }
      } else {
        setError(data.error || "Deposit order not found");
      }
    } catch {
      setError("Failed to load deposit order");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadDeposit();
  }, [loadDeposit]);

  // Live countdown timer calculation
  useEffect(() => {
    if (!deposit?.expiresAt) return;

    const targetTime = new Date(deposit.expiresAt).getTime();

    const updateTimer = () => {
      const now = Date.now();
      const diff = targetTime - now;

      if (diff <= 0) {
        setTimeLeft({ hours: "00", minutes: "00", seconds: "00" });
        setIsExpired(true);
        return;
      }

      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({
        hours: h.toString().padStart(2, "0"),
        minutes: m.toString().padStart(2, "0"),
        seconds: s.toString().padStart(2, "0"),
      });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [deposit?.expiresAt]);

  const copyText = (text: string, type: "addr" | "amt" | "id") => {
    navigator.clipboard.writeText(text);
    if (type === "addr") { setCopiedAddr(true); setTimeout(() => setCopiedAddr(false), 2000); }
    if (type === "amt") { setCopiedAmt(true); setTimeout(() => setCopiedAmt(false), 2000); }
    if (type === "id") { setCopiedId(true); setTimeout(() => setCopiedId(false), 2000); }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txHash.trim()) {
      setVerifyError("Please enter the transaction hash (TxID)");
      return;
    }

    setVerifying(true);
    setVerifyError(null);
    setPendingConfirmation(null);
    setVerifyMsg("Querying TronScan blockchain network...");

    const stepTimer1 = setTimeout(() => {
      setVerifyMsg("Validating USDT contract & recipient address...");
    }, 1200);

    const stepTimer2 = setTimeout(() => {
      setVerifyMsg("Verifying block confirmations & amount...");
    }, 2400);

    try {
      const res = await fetch("/api/wallet/verify-deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactionId: deposit?.id,
          txHash: txHash.trim(),
        }),
      });

      const data = await res.json();
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);

      if (data.success) {
        setSuccessData({
          credited: data.credited || parseFloat(deposit?.amount || "0"),
          newBalance: data.newBalance || "",
          txHash: data.txHash || txHash,
        });
      } else if (res.status === 202) {
        // Transaction found on-chain but not yet confirmed enough — let user retry
        setPendingConfirmation(data.error || "Transaction is pending confirmation. Please wait and try again.");
      } else {
        setVerifyError(data.error || "Verification failed. Please check the TxID and try again.");
      }
    } catch {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      setVerifyError("Network connection error. Please try again.");
    } finally {
      setVerifying(false);
      setVerifyMsg("");
    }
  };

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel this deposit?")) return;
    try {
      if (deposit?.id) {
        await fetch(`/api/wallet/deposit/${deposit.id}`, { method: "DELETE" });
      }
    } catch {
      // Ignore
    }
    router.push("/dashboard");
  };

  const formatDateTime = (iso: string) => {
    try {
      const d = new Date(iso);
      const pad = (n: number) => n.toString().padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    } catch {
      return iso;
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0a1a", color: "#fff", fontFamily: "'Inter', sans-serif" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 44, height: 44, border: "3px solid rgba(139,92,246,0.2)", borderTop: "3px solid #8b5cf6", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 16px" }} />
          <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 14 }}>Loading deposit order...</p>
        </div>
      </div>
    );
  }

  if (error || !deposit) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0a1a", color: "#fff", fontFamily: "'Inter', sans-serif", padding: 20 }}>
        <div style={{ maxWidth: 440, width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: 32, textAlign: "center" }}>
          <XCircle size={48} color="#f87171" style={{ margin: "0 auto 16px" }} />
          <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Deposit Order Not Found</h2>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 24 }}>{error || "The requested deposit session has expired or is invalid."}</p>
          <Link href="/dashboard" style={{ textDecoration: "none" }}>
            <button style={{ background: "linear-gradient(135deg, #8b5cf6, #6366f1)", color: "#fff", border: "none", borderRadius: 12, padding: "12px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer", width: "100%" }}>
              Return to Dashboard
            </button>
          </Link>
        </div>
      </div>
    );
  }

  // QR Code URL via reliable QR generator
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=8&data=${encodeURIComponent(deposit.depositAddress)}`;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@500;700;800&display=swap');
        *{box-sizing:border-box;}
        @keyframes spin{to{transform:rotate(360deg);}}
        @keyframes pulse{0%,100%{opacity:1;}50%{opacity:0.4;}}
        @keyframes slideUp{from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:translateY(0);}}
        .glow-btn:hover{box-shadow:0 0 24px rgba(139,92,246,0.45);transform:translateY(-1px);}
        @media(max-width:768px){
          .deposit-grid{grid-template-columns:1fr!important;}
          .timer-box{font-size:24px!important;}
          .header-banner{padding:14px 16px!important;}
        }
      `}</style>

      <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #090a16 0%, #120924 50%, #071018 100%)", color: "#fff", fontFamily: "'Inter', sans-serif", padding: "24px 16px 48px" }}>
        
        {/* Top Navigation */}
        <div style={{ maxWidth: 900, margin: "0 auto 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <button
            onClick={() => router.push("/dashboard")}
            style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "8px 14px", color: "rgba(255,255,255,0.8)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          >
            <ArrowLeft size={16} /> Dashboard
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>USDT Wallet Deposit</span>
            <span style={{ background: "rgba(34,197,94,0.15)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.3)", padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700 }}>
              TRC20
            </span>
          </div>
        </div>

        <div style={{ maxWidth: 900, margin: "0 auto" }}>

          {/* SUCCESS MODAL / BANNER */}
          {successData && (
            <div style={{ background: "linear-gradient(135deg, rgba(34,197,94,0.25), rgba(16,185,129,0.15))", border: "1px solid rgba(34,197,94,0.4)", borderRadius: 20, padding: "28px 24px", marginBottom: 24, textAlign: "center", animation: "slideUp 0.3s ease" }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#22c55e", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", boxShadow: "0 0 30px rgba(34,197,94,0.5)" }}>
                <Check size={32} strokeWidth={3} />
              </div>
              <h2 style={{ fontSize: 24, fontWeight: 900, color: "#fff", marginBottom: 6 }}>Deposit Confirmed & Credited!</h2>
              <p style={{ fontSize: 15, color: "#4ade80", fontWeight: 700, marginBottom: 12 }}>
                +{parseFloat(deposit.amount).toFixed(2)} USDT Added to Your Wallet Balance
              </p>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", fontFamily: "'JetBrains Mono', monospace", wordBreak: "break-all", maxWidth: 500, margin: "0 auto 24px" }}>
                TxID: {successData.txHash}
              </p>
              <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
                <button
                  onClick={() => router.push("/dashboard")}
                  style={{ background: "linear-gradient(135deg, #8b5cf6, #6366f1)", color: "#fff", border: "none", borderRadius: 12, padding: "12px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}
                  className="glow-btn"
                >
                  Go to Wallet Dashboard <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* MAIN INSTRUCTION HEADER */}
          <div className="header-banner" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: "20px 24px", marginBottom: 20, backdropFilter: "blur(20px)" }}>
            <p style={{ fontSize: 14, color: "#e2e8f0", fontWeight: 600, lineHeight: 1.5, marginBottom: 14 }}>
              Kindly complete the deposit process as soon as possible and place the sale order to get your payment faster.
            </p>

            {/* Countdown Box */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 14, padding: "14px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Clock size={20} color="#f87171" />
                <span style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", fontWeight: 600 }}>Deposit Window:</span>
              </div>
              <div className="timer-box" style={{ fontSize: 26, fontWeight: 900, color: "#f87171", fontFamily: "'JetBrains Mono', monospace", letterSpacing: 2 }}>
                {timeLeft.hours} : {timeLeft.minutes} : {timeLeft.seconds} <span style={{ fontSize: 13, color: "rgba(248,113,113,0.8)", fontWeight: 700, letterSpacing: 0 }}>Remaining</span>
              </div>
            </div>

            {/* Fee Notice */}
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 12, lineHeight: 1.5 }}>
              If you have transaction fees, don't forget to add them. The transfer amount must match the deposit amount.
            </p>
          </div>

          {/* GRID LAYOUT: QR & PAY ON LEFT, TXID & ORDER DETAILS ON RIGHT */}
          <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 20, alignItems: "start" }} className="deposit-grid">
            
            {/* LEFT COLUMN: SCAN TO PAY */}
            <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: 24, textAlign: "center", backdropFilter: "blur(20px)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 16 }}>
                <QrCode size={18} color="#a78bfa" />
                <h3 style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>Scan to Pay (USDT)</h3>
              </div>

              {/* QR Image Box */}
              <div style={{ background: "#fff", padding: 14, borderRadius: 16, display: "inline-block", boxShadow: "0 10px 30px rgba(0,0,0,0.5)", marginBottom: 18 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrUrl}
                  alt="USDT TRC20 Deposit QR Code"
                  width={220}
                  height={220}
                  style={{ display: "block", borderRadius: 8 }}
                />
              </div>

              {/* Amount to Send */}
              <div style={{ background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.3)", borderRadius: 12, padding: "12px 14px", marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ textAlign: "left" }}>
                  <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600 }}>Amount to Send</p>
                  <p style={{ fontSize: 18, fontWeight: 900, color: "#c4b5fd", fontFamily: "'JetBrains Mono', monospace" }}>
                    {parseFloat(deposit.amount).toFixed(2)} USDT
                  </p>
                </div>
                <button
                  onClick={() => copyText(parseFloat(deposit.amount).toFixed(2), "amt")}
                  style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", color: "#fff", borderRadius: 8, padding: "6px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}
                >
                  {copiedAmt ? <><CheckCircle2 size={12} color="#4ade80" /> Copied</> : <><Copy size={12} /> Copy</>}
                </button>
              </div>

              {/* Deposit Address Box */}
              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 12, textAlign: "left" }}>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 600, textTransform: "uppercase", marginBottom: 6 }}>
                  Deposit Address (TRC20)
                </p>
                <p style={{ fontSize: 12, color: "#e2e8f0", fontFamily: "'JetBrains Mono', monospace", wordBreak: "break-all", lineHeight: 1.5, marginBottom: 8 }}>
                  {deposit.depositAddress}
                </p>
                <button
                  onClick={() => copyText(deposit.depositAddress, "addr")}
                  style={{ width: "100%", background: "linear-gradient(135deg, rgba(139,92,246,0.3), rgba(99,102,241,0.2))", border: "1px solid rgba(139,92,246,0.4)", color: "#fff", borderRadius: 8, padding: "8px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                >
                  {copiedAddr ? <><CheckCircle2 size={14} color="#4ade80" /> Address Copied!</> : <><Copy size={14} /> Copy Address</>}
                </button>
              </div>
            </div>

            {/* RIGHT COLUMN: TXID SUBMISSION & ORDER DETAILS */}
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              
              {/* TXID SUBMIT FORM */}
              <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: 24, backdropFilter: "blur(20px)" }}>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: "#fff", marginBottom: 4 }}>Verify On-Chain Deposit</h3>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginBottom: 16 }}>
                  After transferring from your wallet or exchange (e.g., Binance), paste the transaction hash below.
                </p>

                <form onSubmit={handleVerify}>
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 8 }}>
                      Transaction ID (TXID)
                    </label>
                    <input
                      type="text"
                      required
                      value={txHash}
                      onChange={(e) => setTxHash(e.target.value)}
                      placeholder="Please enter Txid"
                      disabled={verifying || Boolean(successData)}
                      style={{
                        width: "100%",
                        background: "rgba(255,255,255,0.06)",
                        border: verifyError ? "1px solid #f87171" : "1px solid rgba(255,255,255,0.12)",
                        borderRadius: 12,
                        padding: "13px 16px",
                        fontSize: 13,
                        color: "#fff",
                        fontFamily: "'JetBrains Mono', monospace",
                        outline: "none",
                      }}
                    />
                  </div>

                  {/* Pending confirmation warning (202 response) */}
                  {pendingConfirmation && (
                    <div style={{ background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.4)", borderRadius: 10, padding: "12px 14px", marginBottom: 16, fontSize: 12, color: "#fef08a", lineHeight: 1.6 }}>
                      <strong>⏳ Awaiting Confirmations</strong><br />
                      {pendingConfirmation}<br />
                      <span style={{ opacity: 0.75 }}>Your TxID is correct. Please wait ~1 minute and click Submit again — the deposit will be credited automatically once confirmed.</span>
                    </div>
                  )}

                  {verifyError && (
                    <div style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 12, color: "#fca5a5", lineHeight: 1.5 }}>
                      ⚠️ {verifyError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={verifying || !txHash.trim() || Boolean(successData)}
                    style={{
                      width: "100%",
                      background: "linear-gradient(135deg, #8b5cf6, #6366f1)",
                      color: "#fff",
                      border: "none",
                      borderRadius: 12,
                      padding: 14,
                      fontSize: 14,
                      fontWeight: 800,
                      cursor: verifying || !txHash.trim() || Boolean(successData) ? "not-allowed" : "pointer",
                      opacity: verifying || !txHash.trim() || Boolean(successData) ? 0.6 : 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      transition: "all 0.2s",
                    }}
                    className="glow-btn"
                  >
                    {verifying ? (
                      <>
                        <RefreshCw size={16} style={{ animation: "spin 1s linear infinite" }} />
                        {verifyMsg || "Checking TronScan API..."}
                      </>
                    ) : (
                      <>Submit</>
                    )}
                  </button>
                </form>
              </div>

              {/* ORDER DETAILS CARD */}
              <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: 24, backdropFilter: "blur(20px)" }}>
                <h3 style={{ fontSize: 15, fontWeight: 800, color: "#fff", marginBottom: 16, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Order Details
                </h3>

                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {/* Deposit Amount */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 10, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <span style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>Deposit Amount</span>
                    <span style={{ fontSize: 15, fontWeight: 800, color: "#4ade80", fontFamily: "'JetBrains Mono', monospace" }}>
                      {parseFloat(deposit.amount).toFixed(2)} USDT
                    </span>
                  </div>

                  {/* Network */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 10, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <span style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>Network</span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: "#fff", background: "rgba(255,255,255,0.08)", padding: "3px 10px", borderRadius: 6 }}>
                      {deposit.network}
                    </span>
                  </div>

                  {/* Deposit Address */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 10, borderBottom: "1px solid rgba(255,255,255,0.06)", flexWrap: "wrap", gap: 6 }}>
                    <span style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>Deposit Address</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 12, color: "#c4b5fd", fontFamily: "'JetBrains Mono', monospace" }}>
                        {deposit.depositAddress.slice(0, 8)}...{deposit.depositAddress.slice(-6)}
                      </span>
                      <button onClick={() => copyText(deposit.depositAddress, "addr")} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer", padding: 2 }}>
                        {copiedAddr ? <Check size={14} color="#4ade80" /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>

                  {/* Deposit ID */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 10, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <span style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>Deposit ID</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#fff", fontFamily: "'JetBrains Mono', monospace" }}>
                        {deposit.depositId}
                      </span>
                      <button onClick={() => copyText(deposit.depositId, "id")} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer", padding: 2 }}>
                        {copiedId ? <Check size={14} color="#4ade80" /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>

                  {/* Create Time */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 10, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <span style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>Create Time</span>
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", fontFamily: "'JetBrains Mono', monospace" }}>
                      {formatDateTime(deposit.createdAt)}
                    </span>
                  </div>

                  {/* Remark */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>Remark</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: deposit.status === "COMPLETED" ? "#4ade80" : "#fbbf24", animation: deposit.status === "COMPLETED" ? "none" : "pulse 2s ease-in-out infinite" }} />
                      <span style={{ fontSize: 13, fontWeight: 700, color: deposit.status === "COMPLETED" ? "#4ade80" : "#fbbf24" }}>
                        {deposit.status === "COMPLETED" ? "Completed" : deposit.remark || "Processing"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* WARNINGS & ADVICE BOXES */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                
                {/* ⚠ Warning */}
                <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 14, padding: "14px 16px", display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <AlertTriangle size={18} color="#f87171" style={{ flexShrink: 0, marginTop: 2 }} />
                  <p style={{ fontSize: 12, color: "#fca5a5", lineHeight: 1.6 }}>
                    ⚠ <strong>Only USDT-TRC20 is supported.</strong> Any loss caused by incorrect operation is your responsibility.
                  </p>
                </div>

                {/* 💡 Binance Tip */}
                <div style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.25)", borderRadius: 14, padding: "14px 16px", display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <Lightbulb size={18} color="#fbbf24" style={{ flexShrink: 0, marginTop: 2 }} />
                  <p style={{ fontSize: 12, color: "#fef08a", lineHeight: 1.6 }}>
                    💡 <strong>Binance Users:</strong> After withdrawal, wait 4–5 minutes for the transaction to confirm, then copy the TxID from Binance → Orders → Withdrawal History → Details.
                  </p>
                </div>
              </div>

              {/* CANCEL BUTTON */}
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={handleCancel}
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)", borderRadius: 10, padding: "10px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}
                >
                  Cancel Deposit
                </button>
              </div>

            </div>
          </div>

        </div>
      </div>
    </>
  );
}

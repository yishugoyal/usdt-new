"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Home, RefreshCw, ArrowDownToLine, ArrowUpFromLine, ArrowLeftRight,
  Landmark, LogOut, ChevronRight, Copy, CheckCircle2,
  TrendingUp, Plus, X, Menu, Wallet, Activity, Shield, Info, Phone,
  User, Lock,   Gift, FileText, CreditCard, Eye, EyeOff, ShieldCheck,
  Clock, Bell
} from "lucide-react";

interface UserSession {
  id: string;
  email: string;
  mobile?: string;
  tier?: string;
  accountStatus?: string;
  createdAt?: string;
}

interface WalletBalance {
  usdt: string;
  tier: string;
  accountStatus: string;
  liveRate: number | null;
  rateSource: string;
}

interface WalletTx {
  id: string;
  type: string;
  usdtAmount: string;
  inrAmount?: string;
  inrRate?: string;
  networkName?: string;
  status: string;
  depositAddress?: string;
  notes?: string;
  createdAt: string;
}

interface OrderItem {
  id: string;
  orderNumber?: string;
  type: string;
  usdtAmount: string;
  inrAmount?: string;
  inrRate?: string;
  status: string;
  bankName?: string;
  accountNumberMasked?: string;
  createdAt: string;
}

interface BankAccount {
  id: string;
  bankName: string;
  accountHolderName: string;
  accountNumberMasked: string;
  ifscCode: string;
}

type ActiveView = "HOME" | "EXCHANGE" | "ORDERS" | "PROFILE" | "SECURITY" | "ABOUT" | "CONTACT";

export default function DashboardPage() {
  const router = useRouter();
  const [view, setView] = useState<ActiveView>("HOME");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [session, setSession] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [transactions, setTransactions] = useState<WalletTx[]>([]);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [orderFilter, setOrderFilter] = useState<"ALL" | "PROGRESSING" | "COMPLETED">("ALL");
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [activeModal, setActiveModal] = useState<"DEPOSIT" | "WITHDRAW" | null>(null);
  const [copied, setCopied] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [processingMsg, setProcessingMsg] = useState("");
  const [toastMsg, setToastMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [alerts, setAlerts] = useState<{ id: string; title: string; message: string; type?: string }[]>([]);

  const [depositAmount, setDepositAmount] = useState("100");
  const [depositNetwork, setDepositNetwork] = useState("TRC20 (Tron)");
  const [depositNetworks, setDepositNetworks] = useState<{ id: string; label: string }[]>([
    { id: "TRC20 (Tron)", label: "TRC20 (Tron) — Recommended" },
  ]);

  // Withdraw state
  const [withdrawAmount, setWithdrawAmount] = useState("50");
  const [withdrawNetwork, setWithdrawNetwork] = useState("TRC20 (Tron)");
  const [withdrawAddress, setWithdrawAddress] = useState("");

  // Exchange state
  const [exchangeAmount, setExchangeAmount] = useState("50");
  const [selectedBankId, setSelectedBankId] = useState("");
  const [showAddBank, setShowAddBank] = useState(false);
  const [newBank, setNewBank] = useState({ bankName: "HDFC Bank", accountHolderName: "", accountNumber: "", ifscCode: "" });



  // Security / Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [changingPw, setChangingPw] = useState(false);
  const [twoFaEnabled, setTwoFaEnabled] = useState(true);

  const showToast = (text: string, ok = true) => {
    setToastMsg({ text, ok });
    setTimeout(() => setToastMsg(null), 3500);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const loadAll = useCallback(async () => {
    try {
      const meRes = await fetch("/api/auth/me", { cache: "no-store" });
      if (!meRes.ok) { router.push("/login"); return; }
      const meData = await meRes.json();
      if (meData.type !== "USER") { router.push("/login"); return; }
      setSession(meData.user);

      const [balRes, txRes, bankRes, orderRes, notifRes] = await Promise.all([
        fetch("/api/wallet/balance"),
        fetch("/api/wallet/transactions"),
        fetch("/api/bank-accounts"),
        fetch("/api/orders"),
        fetch("/api/notifications"),
      ]);

      if (balRes.ok) {
        const b = await balRes.json();
        if (b.success) setBalance(b.balance);
      }

      let txList: WalletTx[] = [];
      if (txRes.ok) {
        const t = await txRes.json();
        if (t.success) {
          txList = t.transactions || [];
          setTransactions(txList);

        }
      }

      if (bankRes.ok) {
        const bk = await bankRes.json();
        if (bk.success) {
          setBankAccounts(bk.bankAccounts || []);
          if (bk.bankAccounts && bk.bankAccounts.length > 0) {
            setSelectedBankId((prev) => prev || bk.bankAccounts[0].id);
          }
        }
      }

      let combinedOrders: OrderItem[] = [];
      if (orderRes.ok) {
        const o = await orderRes.json();
        if (o.success && Array.isArray(o.orders)) {
          combinedOrders = o.orders.map((ord: any) => ({
            id: ord.id,
            orderNumber: ord.orderNumber || ord.id.slice(0, 8),
            type: "OTC_EXCHANGE",
            usdtAmount: String(ord.usdtAmount || 0),
            inrAmount: String(ord.netInrAmount || 0),
            inrRate: String(ord.inrRate || 0),
            status: ord.state || "PROCESSING",
            bankName: ord.bankAccount?.bankName,
            accountNumberMasked: ord.bankAccount?.accountNumberMasked,
            createdAt: ord.createdAt
          }));
        }
      }

      const walletExchanges: OrderItem[] = txList.map((tx: WalletTx) => ({
        id: tx.id,
        orderNumber: "RBW-" + tx.id.slice(0, 6).toUpperCase(),
        type: tx.type,
        usdtAmount: tx.usdtAmount,
        inrAmount: tx.inrAmount,
        inrRate: tx.inrRate,
        status: tx.status,
        createdAt: tx.createdAt
      }));

      const allOrders = [...combinedOrders, ...walletExchanges].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setOrders(allOrders);

      if (notifRes.ok) {
        const n = await notifRes.json();
        const unread = (n.notifications || []).filter((x: any) => !x.isRead).slice(0, 4);
        setAlerts(unread);
      }

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { loadAll(); }, [loadAll]);

  useEffect(() => {
    const hasPending = transactions.some((t) =>
      ["PENDING", "PROCESSING", "AWAITING_DEPOSIT"].includes((t.status || "").toUpperCase())
    );
    if (!hasPending) return;
    const timer = setInterval(() => { loadAll(); }, 15000);
    return () => clearInterval(timer);
  }, [transactions, loadAll]);

  const openDepositModal = async () => {
    setActiveModal("DEPOSIT");
    try {
      const res = await fetch("/api/wallet/deposit");
      const data = await res.json();
      if (data.success && Array.isArray(data.networks) && data.networks.length > 0) {
        setDepositNetworks(data.networks);
        setDepositNetwork((prev) =>
          data.networks.some((n: { id: string }) => n.id === prev) ? prev : data.networks[0].id
        );
      }
    } catch {
      // keep default TRC20
    }
  };

  const dismissAlerts = async () => {
    const ids = alerts.map((a) => a.id);
    setAlerts([]);
    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationIds: ids }),
      });
    } catch {
      // ignore
    }
  };

  const txStatusColor = (status: string) => {
    const s = (status || "").toUpperCase();
    if (s === "COMPLETED" || s === "SETTLED") return "#4ade80";
    if (["FAILED", "REJECTED", "CANCELLED", "EXPIRED"].includes(s)) return "#f87171";
    return "#fbbf24";
  };

  const openTransaction = (tx: WalletTx) => {
    if (tx.type === "DEPOSIT") {
      router.push(`/deposit/${tx.id}`);
    }
  };

  const availableUsdt = parseFloat(balance?.usdt || "0");
  const progressingUsdt = transactions
    .filter(t => t.status === "PENDING" || t.status === "PROCESSING" || t.status === "AWAITING_DEPOSIT")
    .reduce((sum, t) => sum + parseFloat(t.usdtAmount || "0"), 0);

  const totalAmountUsdt = availableUsdt + progressingUsdt;


  const handleDeposit = async () => {
    if (!depositAmount || parseFloat(depositAmount) < 1) {
      showToast("Minimum deposit is 1 USDT", false);
      return;
    }
    setProcessing(true);
    try {
      const res = await fetch("/api/wallet/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usdtAmount: depositAmount, networkName: depositNetwork }),
      });
      
      let data;
      try {
        data = await res.json();
      } catch (parseError) {
        console.error("Failed to parse deposit response:", parseError);
        showToast("Invalid response from server. Please try again.", false);
        return;
      }
      
      const depositId = data.deposit?.id || data.transaction?.id;
      
      if (!res.ok) {
        showToast(data.error || `Server error (${res.status}). Please try again.`, false);
        return;
      }
      
      if (!data.success) {
        showToast(data.error || "Deposit initiation failed", false);
        return;
      }
      
      if (!depositId) {
        console.error("No deposit ID in response:", data);
        showToast("Deposit created but ID missing. Please check your orders.", false);
        loadAll();
        setActiveModal(null);
        return;
      }
      
      setActiveModal(null);
      showToast("Deposit order created. Send USDT to the address shown.");
      router.push(`/deposit/${depositId}`);
    } catch (networkError) {
      console.error("Deposit network error:", networkError);
      showToast("Could not reach the server. Please check your connection and try again.", false);
    } finally {
      setProcessing(false);
    }
  };

  const handleWithdraw = async () => {
    setProcessing(true);
    try {
      const res = await fetch("/api/wallet/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usdtAmount: withdrawAmount, networkName: withdrawNetwork, withdrawAddress }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`${withdrawAmount} USDT withdrawal initiated!`);
        setActiveModal(null);
        loadAll();
      } else {
        showToast(data.error || "Withdrawal failed", false);
      }
    } catch {
      showToast("Network error", false);
    }
    setProcessing(false);
  };

  const handleExchange = async () => {
    if (!selectedBankId) {
      showToast("Please select a bank account", false);
      return;
    }
    setProcessing(true);
    setProcessingMsg("Fetching live rate...");
    try {
      setTimeout(() => setProcessingMsg("Processing exchange..."), 800);
      const res = await fetch("/api/wallet/exchange", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usdtAmount: exchangeAmount, bankAccountId: selectedBankId }),
      });
      const data = await res.json();
      if (data.success) {
        setProcessingMsg("INR dispatched to bank!");
        setTimeout(() => {
          setView("ORDERS");
          setProcessing(false);
          showToast(`₹${parseFloat(data.exchange.inrAmount).toLocaleString("en-IN")} sent to your bank!`);
          loadAll();
        }, 900);
      } else {
        showToast(data.error || "Exchange failed", false);
        setProcessing(false);
      }
    } catch {
      showToast("Network error", false);
      setProcessing(false);
    }
  };

  const handleAddBank = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/bank-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newBank),
      });
      const data = await res.json();
      if (data.success) {
        setShowAddBank(false);
        setNewBank({ bankName: "HDFC Bank", accountHolderName: "", accountNumber: "", ifscCode: "" });
        showToast("Bank account added!");
        loadAll();
      } else {
        showToast(data.error || "Failed to add bank", false);
      }
    } catch {
      showToast("Network error", false);
    }
  };



  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      showToast("New password must be at least 6 characters", false);
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast("Passwords do not match", false);
      return;
    }
    setChangingPw(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("Password updated successfully!");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        showToast(data.error || "Failed to change password", false);
      }
    } catch {
      showToast("Network error", false);
    }
    setChangingPw(false);
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #0a0a1a 0%, #1a0a2e 50%, #0a1a0a 100%)", fontFamily: "'Inter', sans-serif" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 48, height: 48, border: "3px solid rgba(139,92,246,0.3)", borderTop: "3px solid #8b5cf6", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 16px" }} />
          <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 14 }}>Loading your secure wallet...</p>
        </div>
      </div>
    );
  }

  const exchangePreviewInr = balance?.liveRate && exchangeAmount
    ? (parseFloat(exchangeAmount) * balance.liveRate * 0.995 * 0.9975).toFixed(2) : null;

  const navItems: { id: ActiveView; label: string; icon: React.ReactNode }[] = [
    { id: "HOME", label: "Home", icon: <Home size={18} /> },
    { id: "EXCHANGE", label: "Exchange", icon: <ArrowLeftRight size={18} /> },
    { id: "ORDERS", label: "Orders", icon: <FileText size={18} /> },
    { id: "PROFILE", label: "Profile", icon: <User size={18} /> },
    { id: "SECURITY", label: "Security", icon: <ShieldCheck size={18} /> },
    { id: "ABOUT", label: "About", icon: <Info size={18} /> },
    { id: "CONTACT", label: "Contact", icon: <Phone size={18} /> },
  ];

  const txBadge = (type: string) => {
    if (type === "DEPOSIT") return { label: "DEPOSIT", bg: "rgba(34,197,94,0.15)", color: "#4ade80", border: "rgba(34,197,94,0.3)" };
    if (type === "WITHDRAW") return { label: "WITHDRAW", bg: "rgba(239,68,68,0.15)", color: "#f87171", border: "rgba(239,68,68,0.3)" };
    if (type === "REWARD") return { label: "REWARD", bg: "rgba(251,191,36,0.15)", color: "#fbbf24", border: "rgba(251,191,36,0.3)" };
    return { label: "EXCHANGE", bg: "rgba(139,92,246,0.15)", color: "#a78bfa", border: "rgba(139,92,246,0.3)" };
  };

  const statusBadge = (status: string) => {
    const s = (status || "").toUpperCase();
    if (s === "COMPLETED" || s === "COMPLETED_CONFIRMED" || s === "SETTLED") {
      return { label: "COMPLETED", bg: "rgba(34,197,94,0.15)", color: "#4ade80", border: "rgba(34,197,94,0.3)" };
    }
    if (s === "FAILED" || s === "REJECTED" || s === "CANCELLED" || s === "EXPIRED") {
      return { label: s, bg: "rgba(239,68,68,0.15)", color: "#f87171", border: "rgba(239,68,68,0.3)" };
    }
    return { label: s || "PROGRESSING", bg: "rgba(251,191,36,0.15)", color: "#fbbf24", border: "rgba(251,191,36,0.3)" };
  };

  const filteredOrders = orders.filter(o => {
    const s = (o.status || "").toUpperCase();
    if (orderFilter === "COMPLETED") return s === "COMPLETED" || s === "COMPLETED_CONFIRMED" || s === "SETTLED";
    if (orderFilter === "PROGRESSING") {
      return !["COMPLETED", "COMPLETED_CONFIRMED", "SETTLED", "FAILED", "REJECTED", "CANCELLED", "EXPIRED"].includes(s);
    }
    return true;
  });

  const sidebarStyle: React.CSSProperties = { width: 260, minHeight: "100vh", background: "rgba(255,255,255,0.04)", borderRight: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(20px)", display: "flex", flexDirection: "column", padding: "24px 0", position: "sticky", top: 0 };
  const cardStyle: React.CSSProperties = { background: "rgba(255,255,255,0.05)", borderRadius: 20, border: "1px solid rgba(255,255,255,0.09)", backdropFilter: "blur(20px)" };
  const inputStyle: React.CSSProperties = { width: "100%", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: "12px 16px", fontSize: 15, color: "#fff", outline: "none", boxSizing: "border-box" };
  const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 8 };
  const btnPrimary: React.CSSProperties = { background: "linear-gradient(135deg, #8b5cf6, #6366f1)", color: "#fff", border: "none", borderRadius: 12, padding: "12px 20px", fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, transition: "all 0.2s" };
  const btnOutline: React.CSSProperties = { background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.85)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: "12px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 };
  const btnDanger: React.CSSProperties = { background: "rgba(239,68,68,0.15)", color: "#f87171", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 12, padding: "12px 20px", fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 };
  const btnGreen: React.CSSProperties = { background: "linear-gradient(135deg, rgba(16,185,129,0.3), rgba(5,150,105,0.2))", color: "#4ade80", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 12, padding: "12px 20px", fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 };
  const btnGold: React.CSSProperties = { background: "linear-gradient(135deg, rgba(251,191,36,0.3), rgba(245,158,11,0.2))", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.4)", borderRadius: 12, padding: "10px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 };
  const overlayStyle: React.CSSProperties = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(12px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 };
  const modalStyle: React.CSSProperties = { background: "linear-gradient(135deg, #1a1a2e, #16162a)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 24, padding: 28, width: "100%", maxWidth: 460, position: "relative", maxHeight: "90vh", overflowY: "auto" };
  const closeBtnStyle: React.CSSProperties = { position: "absolute", top: 20, right: 20, background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", borderRadius: 8, width: 32, height: 32, cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" };

  const navItemStyle = (active: boolean): React.CSSProperties => ({
    display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", borderRadius: 12,
    cursor: "pointer", transition: "all 0.2s", marginBottom: 4, fontSize: 14,
    fontWeight: active ? 700 : 500,
    background: active ? "linear-gradient(135deg, rgba(139,92,246,0.25), rgba(99,102,241,0.2))" : "transparent",
    color: active ? "#c4b5fd" : "rgba(255,255,255,0.55)",
    border: active ? "1px solid rgba(139,92,246,0.3)" : "1px solid transparent",
  });

  const Sidebar = ({ mobile = false }) => (
    <aside style={{ ...sidebarStyle, ...(mobile ? { position: "fixed" as const, left: 0, top: 0, zIndex: 70 } : {}) }}>
      <div style={{ padding: "0 20px 24px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <Link href="/" style={{ textDecoration: "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, #8b5cf6, #6366f1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Landmark size={16} color="#fff" />
            </div>
            <span style={{ fontSize: 20, fontWeight: 800, color: "#fff" }}>RupeeBridge</span>
          </div>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>USDT to INR Exchange</p>
        </Link>
      </div>

      <div style={{ padding: "16px 12px", flex: 1, overflowY: "auto" }}>
        {navItems.map((item) => (
          <div key={item.id} style={navItemStyle(view === item.id)} onClick={() => { setView(item.id); setSidebarOpen(false); }}>
            {item.icon} {item.label}
            {view === item.id && <ChevronRight size={14} style={{ marginLeft: "auto" }} />}
          </div>
        ))}
      </div>

      <div style={{ margin: "12px", padding: "14px", background: "rgba(255,255,255,0.05)", borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#4ade80", animation: "pulse 2s ease-in-out infinite" }} />
          <p style={{ fontSize: 11, color: "#4ade80", fontWeight: 700 }}>ACTIVE USER</p>
        </div>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", marginBottom: 10, wordBreak: "break-all", fontWeight: 600 }}>{session?.email}</p>
        <button style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#f87171", cursor: "pointer", background: "none", border: "none", fontWeight: 600, padding: 0 }} onClick={handleLogout}>
          <LogOut size={14} /> Logout
        </button>
      </div>
    </aside>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        *{box-sizing:border-box;}
        ::-webkit-scrollbar{width:4px;}::-webkit-scrollbar-thumb{background:rgba(139,92,246,0.4);border-radius:4px;}
        @keyframes spin{to{transform:rotate(360deg);}}
        @keyframes slideUp{from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:translateY(0);}}
        @keyframes pulse{0%,100%{opacity:1;}50%{opacity:0.4;}}
        .anim-up{animation:slideUp 0.3s ease;}
        .glow-btn:hover{box-shadow:0 0 22px rgba(139,92,246,0.45);transform:translateY(-1px);}
        .txrow:hover{background:rgba(255,255,255,0.06)!important;}
        @media(max-width:768px){
          .sidebar-desk{display:none!important;}
          .mobile-topbar{display:flex!important;}
          .main-p{padding:16px!important;}
          .bal-amt{font-size:28px!important;}
          .act-btns{flex-wrap:wrap!important;}
          .act-btns button{flex:1 1 calc(50% - 8px)!important;justify-content:center!important;}
          .ex-grid{grid-template-columns:1fr!important;}
          .profile-bal-grid{grid-template-columns:1fr 1fr!important;}
          .profile-actions-grid{grid-template-columns:1fr!important;}
        }
      `}</style>

      {toastMsg && (
        <div style={{ position: "fixed", top: 20, right: 20, zIndex: 999, padding: "12px 20px", background: toastMsg.ok ? "rgba(16,185,129,0.92)" : "rgba(239,68,68,0.92)", color: "#fff", borderRadius: 12, fontSize: 13, fontWeight: 700, backdropFilter: "blur(12px)", animation: "slideUp 0.3s ease", boxShadow: "0 8px 32px rgba(0,0,0,0.4)", maxWidth: 320, fontFamily: "'Inter',sans-serif" }}>
          {toastMsg.ok ? "✅" : "❌"} {toastMsg.text}
        </div>
      )}

      {/* Mobile top bar */}
      <div className="mobile-topbar" style={{ display: "none", position: "sticky", top: 0, zIndex: 50, background: "rgba(10,10,26,0.97)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.08)", padding: "14px 16px", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg, #8b5cf6, #6366f1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Landmark size={14} color="#fff" />
          </div>
          <span style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>RupeeBridge</span>
        </div>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer" }}>
          {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      <div style={{ minHeight: "100vh", display: "flex", background: "linear-gradient(135deg, #0a0a1a 0%, #1a0a2e 60%, #0a1020 100%)", fontFamily: "'Inter',sans-serif" }}>
        <div className="sidebar-desk"><Sidebar /></div>

        {sidebarOpen && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 60 }} onClick={() => setSidebarOpen(false)}>
            <div onClick={e => e.stopPropagation()}><Sidebar mobile /></div>
          </div>
        )}

        <main style={{ flex: 1, padding: "32px 28px", overflow: "auto" }} className="main-p">

          {/* HOME VIEW */}
          {view === "HOME" && (
            <div className="anim-up">
              <div style={{ marginBottom: 28 }}>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", marginBottom: 4 }}>Hello, <span style={{ color: "#c4b5fd" }}>{session?.email}</span></p>
                <h1 style={{ fontSize: 26, fontWeight: 900, color: "#fff" }}>Your Wallet Dashboard</h1>
              </div>

              {alerts.length > 0 && (
                <div style={{ ...cardStyle, padding: "14px 16px", marginBottom: 20, border: "1px solid rgba(139,92,246,0.35)" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#c4b5fd" }}>
                      <Bell size={16} />
                      <span style={{ fontSize: 13, fontWeight: 800 }}>Updates from operations</span>
                    </div>
                    <button onClick={dismissAlerts} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.45)", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Mark read</button>
                  </div>
                  {alerts.map((a) => (
                    <p key={a.id} style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", marginBottom: 6, lineHeight: 1.45 }}>
                      <strong style={{ color: "#fff" }}>{a.title}.</strong> {a.message}
                    </p>
                  ))}
                </div>
              )}

              {/* Balance card */}
              <div style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.3), rgba(99,102,241,0.2), rgba(16,185,129,0.1))", borderRadius: 24, border: "1px solid rgba(139,92,246,0.3)", padding: "28px 28px 24px", position: "relative", overflow: "hidden", marginBottom: 24 }}>
                <div style={{ position: "absolute", top: -40, right: -40, width: 200, height: 200, background: "radial-gradient(circle, rgba(139,92,246,0.2), transparent)", borderRadius: "50%", pointerEvents: "none" }} />
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
                  <div>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "linear-gradient(135deg, rgba(251,191,36,0.2), rgba(245,158,11,0.1))", border: "1px solid rgba(251,191,36,0.3)", borderRadius: 8, padding: "4px 10px", marginBottom: 12 }}>
                      <span style={{ fontSize: 10, fontWeight: 800, color: "#fbbf24", letterSpacing: 1.5 }}>⭐ {balance?.tier || "PLATINUM"}</span>
                    </div>
                    <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: "rgba(255,255,255,0.5)", textTransform: "uppercase" as const }}>TOTAL BALANCE</p>
                    <p style={{ fontSize: 40, fontWeight: 800, color: "#fff", fontFamily: "monospace", lineHeight: 1.1 }} className="bal-amt">${totalAmountUsdt.toFixed(6)}</p>
                    <p style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginTop: 6 }}>USDT (Tether)</p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ background: "rgba(255,255,255,0.07)", borderRadius: 12, padding: "12px 16px", marginBottom: 8 }}>
                      <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 4 }}>STATUS</p>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "flex-end" }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#4ade80", animation: "pulse 2s ease-in-out infinite" }} />
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#4ade80" }}>{balance?.accountStatus || "Active"}</span>
                      </div>
                    </div>
                    <div style={{ background: "rgba(255,255,255,0.07)", borderRadius: 12, padding: "12px 16px" }}>
                      <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 2 }}>Live Standard Rate</p>
                      <p style={{ fontSize: 20, fontWeight: 800, color: "#4ade80", fontFamily: "monospace" }}>
                        ₹{balance?.liveRate ? balance.liveRate.toFixed(2) : "—"}
                      </p>
                      <p style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>1 USDT = INR</p>
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 12, marginTop: 24, flexWrap: "wrap" }} className="act-btns">
                  <button style={btnGreen} className="glow-btn" onClick={openDepositModal}><ArrowDownToLine size={16} /> Deposit</button>
                  <button style={btnDanger} onClick={() => setActiveModal("WITHDRAW")}><ArrowUpFromLine size={16} /> Withdraw</button>
                  <button style={btnPrimary} className="glow-btn" onClick={() => setView("EXCHANGE")}><ArrowLeftRight size={16} /> Sell Now</button>
                </div>
              </div>

              {/* Stats */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 16, marginBottom: 24 }}>
                {[
                  { label: "Available", value: `${availableUsdt.toFixed(2)} USDT`, icon: <Wallet size={16} />, color: "#4ade80" },
                  { label: "Progressing", value: `${progressingUsdt.toFixed(2)} USDT`, icon: <Clock size={16} />, color: "#fbbf24" },
                  { label: "Exchanged", value: `${transactions.filter(t => t.type === "EXCHANGE").reduce((s, t) => s + parseFloat(t.usdtAmount), 0).toFixed(2)} USDT`, icon: <TrendingUp size={16} />, color: "#a78bfa" },
                  { label: "Total Orders", value: String(orders.length), icon: <Activity size={16} />, color: "#60a5fa" },
                ].map((stat, i) => (
                  <div key={i} style={{ ...cardStyle, padding: "18px 20px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, color: stat.color }}>{stat.icon}<span style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.4)", textTransform: "uppercase" as const }}>{stat.label}</span></div>
                    <p style={{ fontSize: 16, fontWeight: 800, color: "#fff", fontFamily: "monospace" }}>{stat.value}</p>
                  </div>
                ))}
              </div>

              {/* Recent Activity */}
              <div style={{ ...cardStyle, padding: "20px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <p style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>Recent Transactions</p>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={() => setView("ORDERS")} style={{ background: "none", border: "none", color: "#a78bfa", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>View All Orders →</button>
                    <button onClick={loadAll} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer" }}><RefreshCw size={15} /></button>
                  </div>
                </div>
                {transactions.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px 0", color: "rgba(255,255,255,0.3)", fontSize: 13 }}>
                    <Wallet size={32} style={{ opacity: 0.3, margin: "0 auto 12px", display: "block" }} />
                    No transactions yet. Start by depositing USDT!
                  </div>
                ) : transactions.slice(0, 5).map((tx) => {
                  const badge = txBadge(tx.type);
                  return (
                    <div key={tx.id} className="txrow" onClick={() => openTransaction(tx)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", marginBottom: 8, transition: "all 0.2s", cursor: tx.type === "DEPOSIT" ? "pointer" : "default" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: badge.bg, border: `1px solid ${badge.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {tx.type === "DEPOSIT" ? <ArrowDownToLine size={15} color={badge.color} /> : tx.type === "WITHDRAW" ? <ArrowUpFromLine size={15} color={badge.color} /> : tx.type === "REWARD" ? <Gift size={15} color={badge.color} /> : <ArrowLeftRight size={15} color={badge.color} />}
                        </div>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: badge.color, background: badge.bg, border: `1px solid ${badge.border}`, padding: "2px 7px", borderRadius: 6 }}>{badge.label}</span>
                            <span style={{ fontSize: 10, color: txStatusColor(tx.status), fontWeight: 700 }}>● {tx.status}</span>
                            {tx.type === "DEPOSIT" && ["PENDING", "PROCESSING"].includes(tx.status) && (
                              <span style={{ fontSize: 10, color: "#a78bfa", fontWeight: 700 }}>Continue →</span>
                            )}
                          </div>
                          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 3 }}>{new Date(tx.createdAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}{tx.networkName ? ` · ${tx.networkName}` : ""}</p>
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <p style={{ fontSize: 15, fontWeight: 800, color: "#fff", fontFamily: "monospace" }}>{tx.type === "DEPOSIT" || tx.type === "REWARD" ? "+" : "-"}{parseFloat(tx.usdtAmount).toFixed(2)} USDT</p>
                        {tx.inrAmount && <p style={{ fontSize: 11, color: "#4ade80", fontWeight: 600 }}>₹{parseFloat(tx.inrAmount).toLocaleString("en-IN")}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* EXCHANGE VIEW */}
          {view === "EXCHANGE" && (
            <div className="anim-up">
              <div style={{ marginBottom: 28 }}>
                <h1 style={{ fontSize: 26, fontWeight: 900, color: "#fff" }}>Exchange USDT to INR</h1>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>Convert your wallet balance to Indian Rupees directly to your bank account</p>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 24, alignItems: "start" }} className="ex-grid">
                <div style={{ ...cardStyle, padding: 24 }}>
                  <p style={{ fontSize: 16, fontWeight: 800, color: "#fff", marginBottom: 20 }}>Exchange Amount</p>
                  <div style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)", borderRadius: 12, padding: "12px 16px", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>Available Spendable Balance</span>
                    <span style={{ fontSize: 15, fontWeight: 800, color: "#c4b5fd", fontFamily: "monospace" }}>{availableUsdt.toFixed(4)} USDT</span>
                  </div>
                  <div style={{ marginBottom: 20 }}>
                    <label style={labelStyle}>USDT Amount</label>
                    <div style={{ position: "relative" }}>
                      <input type="number" min="10" value={exchangeAmount} onChange={e => setExchangeAmount(e.target.value)} style={{ ...inputStyle, paddingRight: 70 }} placeholder="Enter amount" />
                      <span style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", fontSize: 12, fontWeight: 700, color: "#a78bfa" }}>USDT</span>
                    </div>
                    <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 6 }}>Min: 10 USDT</p>
                  </div>
                  <div style={{ marginBottom: 24 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                      <label style={labelStyle}>Destination Bank</label>
                      <button onClick={() => setShowAddBank(true)} style={{ background: "none", border: "none", color: "#a78bfa", fontSize: 12, cursor: "pointer", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}><Plus size={12} /> Add Bank</button>
                    </div>
                    {bankAccounts.length === 0 ? (
                      <div style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)", borderRadius: 12, padding: 16, textAlign: "center" }}>
                        <p style={{ fontSize: 12, color: "#fbbf24", marginBottom: 10 }}>No bank accounts added yet.</p>
                        <button onClick={() => setShowAddBank(true)} style={{ ...btnPrimary, margin: "0 auto", justifyContent: "center" }}>Add Bank Account</button>
                      </div>
                    ) : bankAccounts.map(bank => (
                      <label key={bank.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 12, cursor: "pointer", background: selectedBankId === bank.id ? "rgba(139,92,246,0.15)" : "rgba(255,255,255,0.04)", border: `1px solid ${selectedBankId === bank.id ? "rgba(139,92,246,0.4)" : "rgba(255,255,255,0.08)"}`, marginBottom: 8 }}>
                        <input type="radio" name="bank" checked={selectedBankId === bank.id} onChange={() => setSelectedBankId(bank.id)} style={{ accentColor: "#8b5cf6" }} />
                        <div><p style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{bank.bankName}</p><p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: "monospace" }}>{bank.accountNumberMasked} · {bank.ifscCode}</p></div>
                      </label>
                    ))}
                  </div>
                  <button disabled={processing || bankAccounts.length === 0} onClick={handleExchange} style={{ ...btnPrimary, width: "100%", justifyContent: "center", padding: 14, opacity: processing || bankAccounts.length === 0 ? 0.5 : 1 }} className="glow-btn">
                    {processing ? <><RefreshCw size={15} style={{ animation: "spin 1s linear infinite" }} /> {processingMsg || "Processing..."}</> : <><ArrowLeftRight size={16} /> Exchange USDT to INR</>}
                  </button>
                </div>
                <div style={{ ...cardStyle, padding: 24 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.5)", marginBottom: 16, textTransform: "uppercase" as const, letterSpacing: 1 }}>Live Summary</p>
                  {[["You Give", `${exchangeAmount || 0} USDT`, "#fff"], ["Live Rate", balance?.liveRate ? `₹${balance.liveRate.toFixed(2)}` : "Loading...", "#4ade80"], ["Platform Fee", "0.25%", "rgba(255,255,255,0.5)"], ["Spread", "0.5%", "rgba(255,255,255,0.5)"]].map(([label, val, color], i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", background: "rgba(255,255,255,0.03)", borderRadius: 10, marginBottom: 8 }}>
                      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}>{label}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color, fontFamily: "monospace" }}>{val}</span>
                    </div>
                  ))}
                  <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 16, marginTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", fontWeight: 600 }}>You Get (est.)</span>
                    <span style={{ fontSize: 22, fontWeight: 900, color: "#4ade80", fontFamily: "monospace" }}>{exchangePreviewInr ? `₹${parseFloat(exchangePreviewInr).toLocaleString("en-IN")}` : "₹—"}</span>
                  </div>
                  <div style={{ marginTop: 16, background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 10, padding: "10px 12px" }}>
                    <p style={{ fontSize: 11, color: "#4ade80", display: "flex", alignItems: "center", gap: 6 }}><Shield size={12} /> Instant IMPS/NEFT settlement to your bank</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ORDERS VIEW */}
          {view === "ORDERS" && (
            <div className="anim-up">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 24 }}>
                <div>
                  <h1 style={{ fontSize: 26, fontWeight: 900, color: "#fff" }}>Orders & Exchange History</h1>
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>Track all your USDT deposits, withdrawals, and INR exchanges</p>
                </div>
                <div style={{ display: "flex", gap: 8, background: "rgba(255,255,255,0.05)", padding: 4, borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)" }}>
                  {(["ALL", "PROGRESSING", "COMPLETED"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setOrderFilter(tab)}
                      style={{
                        background: orderFilter === tab ? "linear-gradient(135deg, #8b5cf6, #6366f1)" : "transparent",
                        color: orderFilter === tab ? "#fff" : "rgba(255,255,255,0.5)",
                        border: "none", borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer"
                      }}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              {filteredOrders.length === 0 ? (
                <div style={{ ...cardStyle, padding: "48px 24px", textAlign: "center" }}>
                  <FileText size={40} style={{ opacity: 0.3, margin: "0 auto 12px", display: "block", color: "#a78bfa" }} />
                  <p style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 6 }}>No {orderFilter.toLowerCase()} orders found</p>
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 20 }}>Exchange your USDT to INR or deposit USDT to see orders here.</p>
                  <button onClick={() => setView("EXCHANGE")} style={{ ...btnPrimary, margin: "0 auto" }} className="glow-btn"><ArrowLeftRight size={16} /> Start Exchange</button>
                </div>
              ) : (
                <div style={{ ...cardStyle, padding: 20 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {filteredOrders.map((ord) => {
                      const badge = statusBadge(ord.status);
                      const isExchange = ord.type.includes("EXCHANGE");
                      return (
                        <div key={ord.id} className="txrow" onClick={() => { if (ord.type === "DEPOSIT") router.push(`/deposit/${ord.id}`); }} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px", borderRadius: 14, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", flexWrap: "wrap", gap: 12, cursor: ord.type === "DEPOSIT" ? "pointer" : "default" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                            <div style={{ width: 42, height: 42, borderRadius: 12, background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                              {isExchange ? <ArrowLeftRight size={18} color="#a78bfa" /> : ord.type === "DEPOSIT" ? <ArrowDownToLine size={18} color="#4ade80" /> : ord.type === "REWARD" ? <Gift size={18} color="#fbbf24" /> : <ArrowUpFromLine size={18} color="#f87171" />}
                            </div>
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                <span style={{ fontSize: 14, fontWeight: 800, color: "#fff" }}>{ord.orderNumber || ord.id.slice(0, 10)}</span>
                                <span style={{ fontSize: 11, fontWeight: 700, color: badge.color, background: badge.bg, border: `1px solid ${badge.border}`, padding: "2px 8px", borderRadius: 6 }}>● {badge.label}</span>
                              </div>
                              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>
                                {new Date(ord.createdAt).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                                {ord.bankName ? ` · Bank: ${ord.bankName}` : ""}
                              </p>
                            </div>
                          </div>

                          <div style={{ textAlign: "right" }}>
                            <p style={{ fontSize: 16, fontWeight: 800, color: "#fff", fontFamily: "monospace" }}>
                              {parseFloat(ord.usdtAmount).toFixed(2)} USDT
                            </p>
                            {ord.inrAmount ? (
                              <p style={{ fontSize: 13, color: "#4ade80", fontWeight: 700, marginTop: 2 }}>
                                ₹{parseFloat(ord.inrAmount).toLocaleString("en-IN")}
                              </p>
                            ) : (
                              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{ord.type}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PROFILE VIEW */}
          {view === "PROFILE" && (
            <div className="anim-up">
              {/* Header Info */}
              <div style={{ ...cardStyle, padding: "24px 28px", marginBottom: 24, position: "relative", overflow: "hidden" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{ width: 56, height: 56, borderRadius: 16, background: "linear-gradient(135deg, #8b5cf6, #6366f1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 900, color: "#fff" }}>
                      {session?.email ? session.email[0].toUpperCase() : "U"}
                    </div>
                    <div>
                      <h2 style={{ fontSize: 20, fontWeight: 800, color: "#fff", marginBottom: 4, wordBreak: "break-all" }}>{session?.email}</h2>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.3)", padding: "3px 8px", borderRadius: 6 }}>
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80" }} />
                          <span style={{ fontSize: 11, fontWeight: 700, color: "#4ade80" }}>Active User</span>
                        </div>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "rgba(251,191,36,0.15)", border: "1px solid rgba(251,191,36,0.3)", padding: "3px 8px", borderRadius: 6 }}>
                          <span style={{ fontSize: 11, fontWeight: 800, color: "#fbbf24" }}>⭐ {balance?.tier || "PLATINUM"}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button onClick={() => setView("SECURITY")} style={btnOutline}>
                    <Shield size={14} /> Security Settings
                  </button>
                </div>
              </div>

              {/* Balances Breakdown Wireframe */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }} className="profile-bal-grid">
                {/* Total Amount */}
                <div style={{ ...cardStyle, padding: "20px 22px", background: "linear-gradient(135deg, rgba(139,92,246,0.15), rgba(99,102,241,0.08))", border: "1px solid rgba(139,92,246,0.3)" }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Total Amount</p>
                  <p style={{ fontSize: 24, fontWeight: 900, color: "#fff", fontFamily: "monospace", marginBottom: 4 }}>{totalAmountUsdt.toFixed(6)}</p>
                  <p style={{ fontSize: 11, color: "#c4b5fd" }}>USDT</p>
                </div>

                {/* Available */}
                <div style={{ ...cardStyle, padding: "20px 22px", background: "linear-gradient(135deg, rgba(34,197,94,0.12), rgba(16,185,129,0.05))", border: "1px solid rgba(34,197,94,0.25)" }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Available</p>
                  <p style={{ fontSize: 24, fontWeight: 900, color: "#4ade80", fontFamily: "monospace", marginBottom: 4 }}>{availableUsdt.toFixed(6)}</p>
                  <p style={{ fontSize: 11, color: "rgba(74,222,128,0.7)" }}>USDT</p>
                </div>

                {/* Progressing */}
                <div style={{ ...cardStyle, padding: "20px 22px", background: "linear-gradient(135deg, rgba(251,191,36,0.12), rgba(245,158,11,0.05))", border: "1px solid rgba(251,191,36,0.25)" }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Progressing</p>
                  <p style={{ fontSize: 24, fontWeight: 900, color: "#fbbf24", fontFamily: "monospace", marginBottom: 4 }}>{progressingUsdt.toFixed(6)}</p>
                  <p style={{ fontSize: 11, color: "rgba(251,191,36,0.7)" }}>USDT In-Flight</p>
                </div>

                {/* Total Deposited */}
                <div style={{ ...cardStyle, padding: "20px 22px", background: "linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.05))", border: "1px solid rgba(99,102,241,0.25)" }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Total Deposited</p>
                  <p style={{ fontSize: 24, fontWeight: 900, color: "#a78bfa", fontFamily: "monospace", marginBottom: 4 }}>
                    {transactions.filter(t => t.type === "DEPOSIT" && t.status === "COMPLETED").reduce((s, t) => s + parseFloat(t.usdtAmount || "0"), 0).toFixed(2)}
                  </p>
                  <p style={{ fontSize: 11, color: "rgba(167,139,250,0.7)" }}>USDT Lifetime</p>
                </div>
              </div>

              {/* Bank Detail & Exchange History Section */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }} className="profile-actions-grid">
                {/* 💳 Bank Detail Card */}
                <div style={{ ...cardStyle, padding: 24 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 20 }}>💳</span>
                      <h3 style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>Bank Detail</h3>
                    </div>
                    <button
                      onClick={() => setShowAddBank(true)}
                      style={{ ...btnPrimary, padding: "8px 14px", fontSize: 12 }}
                      className="glow-btn"
                    >
                      <Plus size={13} /> Enter Bank Detail
                    </button>
                  </div>

                  {bankAccounts.length === 0 ? (
                    <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 12, padding: "24px 16px", textAlign: "center", border: "1px dashed rgba(255,255,255,0.12)" }}>
                      <CreditCard size={28} style={{ opacity: 0.3, margin: "0 auto 8px", display: "block" }} />
                      <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 12 }}>No bank account registered yet.</p>
                      <button onClick={() => setShowAddBank(true)} style={{ ...btnOutline, margin: "0 auto", fontSize: 12 }}>Enter Bank Detail</button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {bankAccounts.map((b) => (
                        <div key={b.id} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "14px 16px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                            <span style={{ fontSize: 14, fontWeight: 800, color: "#fff" }}>{b.bankName}</span>
                            <span style={{ fontSize: 10, background: "rgba(139,92,246,0.2)", color: "#c4b5fd", padding: "2px 6px", borderRadius: 4, fontWeight: 700 }}>PRIMARY</span>
                          </div>
                          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", fontFamily: "monospace" }}>{b.accountNumberMasked}</p>
                          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
                            <span>Holder: {b.accountHolderName}</span>
                            <span>IFSC: {b.ifscCode}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 🔄 Exchange History Card */}
                <div style={{ ...cardStyle, padding: 24 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 20 }}>🔄</span>
                      <h3 style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>Exchange History</h3>
                    </div>
                    <button
                      onClick={() => setView("EXCHANGE")}
                      style={{ ...btnGreen, padding: "8px 16px", fontSize: 12 }}
                      className="glow-btn"
                    >
                      <ArrowLeftRight size={13} /> Sell Now
                    </button>
                  </div>

                  {orders.length === 0 ? (
                    <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 12, padding: "24px 16px", textAlign: "center", border: "1px dashed rgba(255,255,255,0.12)" }}>
                      <ArrowLeftRight size={28} style={{ opacity: 0.3, margin: "0 auto 8px", display: "block" }} />
                      <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 12 }}>No exchange history recorded yet.</p>
                      <button onClick={() => setView("EXCHANGE")} style={{ ...btnGreen, margin: "0 auto", fontSize: 12 }}>Sell Now</button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {orders.slice(0, 3).map((ord) => (
                        <div key={ord.id} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <p style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{ord.orderNumber || ord.id.slice(0, 8)}</p>
                            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>{new Date(ord.createdAt).toLocaleDateString("en-IN")}</p>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <p style={{ fontSize: 13, fontWeight: 800, color: "#fff", fontFamily: "monospace" }}>{parseFloat(ord.usdtAmount).toFixed(2)} USDT</p>
                            {ord.inrAmount && <p style={{ fontSize: 11, color: "#4ade80", fontWeight: 600 }}>₹{parseFloat(ord.inrAmount).toLocaleString("en-IN")}</p>}
                          </div>
                        </div>
                      ))}
                      <button onClick={() => setView("ORDERS")} style={{ ...btnOutline, width: "100%", justifyContent: "center", padding: "8px", fontSize: 12, marginTop: 4 }}>
                        View All {orders.length} Orders →
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* SECURITY VIEW */}
          {view === "SECURITY" && (
            <div className="anim-up" style={{ maxWidth: 720 }}>
              <div style={{ marginBottom: 28 }}>
                <h1 style={{ fontSize: 26, fontWeight: 900, color: "#fff" }}>Security & Account Protection</h1>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>Manage password, sessions, and transaction security</p>
              </div>

              {/* Security Status Badge */}
              <div style={{ background: "linear-gradient(135deg, rgba(16,185,129,0.15), rgba(5,150,105,0.08))", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 16, padding: "18px 22px", marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(16,185,129,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <ShieldCheck size={22} color="#4ade80" />
                  </div>
                  <div>
                    <p style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>Account Security: HIGH (95%)</p>
                    <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>End-to-end encrypted session and protected wallet keys</p>
                  </div>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#4ade80", background: "rgba(16,185,129,0.2)", padding: "4px 10px", borderRadius: 8 }}>PROTECTED</span>
              </div>

              {/* Change Password Card */}
              <div style={{ ...cardStyle, padding: 24, marginBottom: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                  <Lock size={18} color="#a78bfa" />
                  <h3 style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>Change Password</h3>
                </div>

                <form onSubmit={handleChangePassword}>
                  <div style={{ marginBottom: 16 }}>
                    <label style={labelStyle}>Current Password</label>
                    <div style={{ position: "relative" }}>
                      <input
                        type={showPw ? "text" : "password"}
                        required
                        value={currentPassword}
                        onChange={e => setCurrentPassword(e.target.value)}
                        placeholder="Enter current password"
                        style={inputStyle}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw(!showPw)}
                        style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer" }}
                      >
                        {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
                    <div>
                      <label style={labelStyle}>New Password</label>
                      <input
                        type={showPw ? "text" : "password"}
                        required
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        placeholder="Min 6 characters"
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Confirm New Password</label>
                      <input
                        type={showPw ? "text" : "password"}
                        required
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter password"
                        style={inputStyle}
                      />
                    </div>
                  </div>

                  <button
                    disabled={changingPw || !currentPassword || !newPassword}
                    type="submit"
                    style={{ ...btnPrimary, width: "100%", justifyContent: "center", padding: 13, opacity: changingPw || !currentPassword ? 0.5 : 1 }}
                    className="glow-btn"
                  >
                    {changingPw ? <><RefreshCw size={15} style={{ animation: "spin 1s linear infinite" }} /> Updating Password...</> : <><Lock size={15} /> Update Password</>}
                  </button>
                </form>
              </div>

              {/* Security Features & Session Info */}
              <div style={{ ...cardStyle, padding: 24 }}>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: "#fff", marginBottom: 16 }}>Security Preferences</h3>
                
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>Two-Factor Authentication (2FA)</p>
                    <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>Require verification code for large withdrawals</p>
                  </div>
                  <button
                    onClick={() => { setTwoFaEnabled(!twoFaEnabled); showToast(twoFaEnabled ? "2FA Disabled" : "2FA Enabled"); }}
                    style={{
                      background: twoFaEnabled ? "rgba(34,197,94,0.2)" : "rgba(255,255,255,0.1)",
                      color: twoFaEnabled ? "#4ade80" : "rgba(255,255,255,0.5)",
                      border: `1px solid ${twoFaEnabled ? "rgba(34,197,94,0.4)" : "rgba(255,255,255,0.15)"}`,
                      borderRadius: 20, padding: "6px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer"
                    }}
                  >
                    {twoFaEnabled ? "Enabled" : "Disabled"}
                  </button>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>Active Session</p>
                    <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>Current IP: Authenticated Secure Session</p>
                  </div>
                  <span style={{ fontSize: 12, color: "#4ade80", fontWeight: 700 }}>● Online</span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0" }}>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>Anti-Phishing Protection</p>
                    <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>Verify emails from RupeeBridge officially</p>
                  </div>
                  <span style={{ fontSize: 12, color: "#a78bfa", fontWeight: 700 }}>Active</span>
                </div>
              </div>
            </div>
          )}

          {/* ABOUT VIEW */}
          {view === "ABOUT" && (
            <div className="anim-up" style={{ maxWidth: 700 }}>
              <h1 style={{ fontSize: 26, fontWeight: 900, color: "#fff", marginBottom: 8 }}>About RupeeBridge</h1>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.45)", marginBottom: 32, lineHeight: 1.7 }}>India's fastest and most secure USDT-to-INR exchange platform for institutions and high-volume traders.</p>
              {[
                { icon: <Shield size={24} color="#8b5cf6" />, title: "Bank-Grade Security", desc: "Military-grade encryption, MFA, and real-time fraud monitoring protect your funds." },
                { icon: <TrendingUp size={24} color="#4ade80" />, title: "Best Rates Guaranteed", desc: "Multi-provider rate aggregation with transparent fees — no hidden charges." },
                { icon: <Landmark size={24} color="#60a5fa" />, title: "Instant INR Settlement", desc: "INR credited to your bank within minutes via IMPS/NEFT after confirmation." },
                { icon: <Activity size={24} color="#fbbf24" />, title: "24/7 Operations", desc: "Automated platform processes transactions around the clock, even on holidays." },
              ].map((item, i) => (
                <div key={i} style={{ ...cardStyle, padding: 20, display: "flex", gap: 16, alignItems: "flex-start", marginBottom: 16 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{item.icon}</div>
                  <div><p style={{ fontSize: 15, fontWeight: 800, color: "#fff", marginBottom: 6 }}>{item.title}</p><p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.6 }}>{item.desc}</p></div>
                </div>
              ))}
            </div>
          )}

          {/* CONTACT VIEW */}
          {view === "CONTACT" && (
            <div className="anim-up" style={{ maxWidth: 600 }}>
              <h1 style={{ fontSize: 26, fontWeight: 900, color: "#fff", marginBottom: 8 }}>Contact & Support</h1>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.45)", marginBottom: 32 }}>Our team is available 24/7 for queries or issues.</p>
              {[
                { icon: "📧", label: "Email Support", value: "support@rupeebridge.in", sub: "Response within 30 minutes" },
                { icon: "📱", label: "WhatsApp", value: "+91 98765 43210", sub: "Mon–Sat, 9 AM – 11 PM" },
                { icon: "🏢", label: "Registered Office", value: "RupeeBridge Financial Pvt. Ltd.", sub: "Mumbai, Maharashtra, India" },
              ].map((item, i) => (
                <div key={i} style={{ ...cardStyle, padding: 20, display: "flex", alignItems: "center", gap: 16, marginBottom: 12 }}>
                  <span style={{ fontSize: 28 }}>{item.icon}</span>
                  <div>
                    <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: 0.5, marginBottom: 4 }}>{item.label}</p>
                    <p style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>{item.value}</p>
                    <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>{item.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

        </main>
      </div>

      {/* DEPOSIT MODAL */}
      {activeModal === "DEPOSIT" && (
        <div style={overlayStyle} onClick={() => !processing && setActiveModal(null)}>
          <div style={modalStyle} onClick={e => e.stopPropagation()}>
            <button style={closeBtnStyle} onClick={() => setActiveModal(null)}>✕</button>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "linear-gradient(135deg, rgba(34,197,94,0.2), rgba(16,185,129,0.1))", border: "1px solid rgba(34,197,94,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <ArrowDownToLine size={20} color="#4ade80" />
              </div>
              <p style={{ fontSize: 20, fontWeight: 800, color: "#fff" }}>Deposit USDT</p>
            </div>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", marginBottom: 20, lineHeight: 1.5 }}>
              Create a deposit order, send USDT to the generated address, and submit your transaction ID for verification.
            </p>
            
            {/* Info Banner */}
            <div style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)", borderRadius: 12, padding: "12px 14px", marginBottom: 20, display: "flex", gap: 10, alignItems: "flex-start" }}>
              <Info size={16} color="#a78bfa" style={{ flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: 12, color: "#c4b5fd", lineHeight: 1.5 }}>
                <strong style={{ color: "#fff" }}>Quick Process:</strong> Your deposit will be credited automatically after blockchain confirmation. Usually takes 2-5 minutes.
              </p>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>USDT Amount</label>
              <div style={{ position: "relative" }}>
                <input 
                  type="number" 
                  min="1" 
                  value={depositAmount} 
                  onChange={e => setDepositAmount(e.target.value)} 
                  style={{ ...inputStyle, paddingRight: 80 }} 
                  placeholder="100" 
                />
                <span style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", fontSize: 12, fontWeight: 700, color: "#4ade80", background: "rgba(34,197,94,0.15)", padding: "4px 8px", borderRadius: 6 }}>USDT</span>
              </div>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 6 }}>Minimum: 1 USDT · No deposit fees</p>
            </div>
            
            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle}>Network</label>
              <select value={depositNetwork} onChange={e => setDepositNetwork(e.target.value)} style={{ ...inputStyle, color: "#fff", cursor: "pointer" }}>
                {depositNetworks.map((n) => (
                  <option key={n.id} value={n.id}>{n.label}</option>
                ))}
              </select>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 6 }}>
                TRC20 is recommended for fastest confirmation and lowest fees
              </p>
            </div>
            
            <button 
              disabled={processing || !depositAmount || parseFloat(depositAmount) < 1} 
              onClick={handleDeposit} 
              style={{ 
                ...btnGreen, 
                width: "100%", 
                justifyContent: "center", 
                padding: 14,
                opacity: processing || !depositAmount || parseFloat(depositAmount) < 1 ? 0.5 : 1,
                cursor: processing || !depositAmount || parseFloat(depositAmount) < 1 ? "not-allowed" : "pointer"
              }}
              className="glow-btn"
            >
              {processing ? <><RefreshCw size={15} style={{ animation: "spin 1s linear infinite" }} /> Creating deposit order...</> : <><ArrowDownToLine size={16} /> Create Deposit Order</>}
            </button>
          </div>
        </div>
      )}

      {/* WITHDRAW MODAL */}
      {activeModal === "WITHDRAW" && (
        <div style={overlayStyle} onClick={() => !processing && setActiveModal(null)}>
          <div style={modalStyle} onClick={e => e.stopPropagation()}>
            <button style={closeBtnStyle} onClick={() => setActiveModal(null)}>✕</button>
            <p style={{ fontSize: 20, fontWeight: 800, color: "#fff", marginBottom: 6 }}>Withdraw USDT</p>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", marginBottom: 24 }}>Send USDT to an external wallet address</p>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Amount (USDT)</label>
              <input type="number" min="5" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} style={inputStyle} />
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 6 }}>Available Balance: {availableUsdt.toFixed(4)} USDT · Min: 5 · Fee: 1 USDT</p>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Network</label>
              <select value={withdrawNetwork} onChange={e => setWithdrawNetwork(e.target.value)} style={{ ...inputStyle, color: "#fff" }}>
                <option value="TRC20 (Tron)">TRC20 (Tron)</option>
                <option value="ERC20 (Ethereum)">ERC20 (Ethereum)</option>
                <option value="BEP20 (BNB)">BEP20 (BNB Smart Chain)</option>
              </select>
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle}>Destination Address</label>
              <input type="text" value={withdrawAddress} onChange={e => setWithdrawAddress(e.target.value)} style={inputStyle} placeholder="T... or 0x..." />
            </div>
            <button disabled={processing || !withdrawAddress} onClick={handleWithdraw} style={{ ...btnDanger, width: "100%", justifyContent: "center", padding: 14, opacity: !withdrawAddress ? 0.5 : 1 }}>
              {processing ? <><RefreshCw size={15} style={{ animation: "spin 1s linear infinite" }} /> Processing...</> : <><ArrowUpFromLine size={16} /> Withdraw USDT</>}
            </button>
          </div>
        </div>
      )}

      {/* ADD BANK MODAL */}
      {showAddBank && (
        <div style={overlayStyle} onClick={() => setShowAddBank(false)}>
          <form style={modalStyle} onSubmit={handleAddBank} onClick={e => e.stopPropagation()}>
            <button type="button" style={closeBtnStyle} onClick={() => setShowAddBank(false)}>✕</button>
            <p style={{ fontSize: 20, fontWeight: 800, color: "#fff", marginBottom: 6 }}>Add Bank Account</p>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", marginBottom: 24 }}>For INR settlement after USDT exchange</p>
            {[["Bank Name", "bankName", "HDFC Bank"], ["Account Holder Name", "accountHolderName", "RAJESH SHARMA"], ["Account Number", "accountNumber", "50100293049281"], ["IFSC Code", "ifscCode", "HDFC0000240"]].map(([label, key, placeholder]) => (
              <div key={key} style={{ marginBottom: 16 }}>
                <label style={labelStyle}>{label}</label>
                <input type="text" required value={(newBank as any)[key]} onChange={e => setNewBank({ ...newBank, [key]: e.target.value })} placeholder={placeholder} style={inputStyle} />
              </div>
            ))}
            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <button type="button" onClick={() => setShowAddBank(false)} style={{ ...btnOutline, flex: 1, justifyContent: "center" }}>Cancel</button>
              <button type="submit" style={{ ...btnPrimary, flex: 1, justifyContent: "center" }} className="glow-btn">Save Bank</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

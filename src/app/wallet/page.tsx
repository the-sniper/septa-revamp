"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Wallet,
  Plus,
  CreditCard,
  RefreshCw,
  Check,
  AlertCircle,
  Loader2,
  X,
  ExternalLink,
  Shield,
  Minus,
  History,
  Eye,
  EyeOff,
  User,
  Lock,
  ArrowRight,
  LogOut,
} from "lucide-react";
import { Header } from "@/components/Navigation";
import { Drawer } from "@/components/ui/Drawer";
import { BiometricSetup } from "@/components/BiometricSetup";
import { BiometricLogin } from "@/components/BiometricLogin";

// Storage keys
const CREDENTIALS_KEY = "septa-credentials";
const WALLET_KEY = "septa-wallet-data";

// SEPTA Key URLs
const SEPTA_URLS = {
  home: "https://www.septakey.org",
  addFunds: "https://www.septakey.org/AddValue",
  dashboard: "https://www.septakey.org/Dashboard",
};

interface StoredCredentials {
  username: string;
  password: string;
}

interface WalletData {
  balance: number;
  cardNumber: string | null;
  pass: string | null;
  lastUpdated: string;
  transactions: Transaction[];
  paymentProfiles: PaymentProfile[];
  raw?: any;
}

interface PaymentProfile {
  payment_profile_id: string;
  description?: string;
  last_four?: string;
  card_type?: string;
  payment_method_type?: string;
  // Add other fields as discovered, but these are essential
}

interface Transaction {
  id: string;
  type: "debit" | "credit";
  amount: number;
  description: string;
  timestamp: string;
}

export default function WalletPage() {
  const [mounted, setMounted] = useState(false);
  const [credentials, setCredentials] = useState<StoredCredentials | null>(
    null
  );
  const [walletData, setWalletData] = useState<WalletData | null>(null);

  // Login form state
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [showDebug, setShowDebug] = useState(false);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);

  // Add Funds State
  const [showAddFundsDrawer, setShowAddFundsDrawer] = useState(false);
  const [addAmount, setAddAmount] = useState<string>("10.00");
  const [selectedProfileId, setSelectedProfileId] = useState<string>("");
  const [cvv, setCvv] = useState("");
  const [isAddingFunds, setIsAddingFunds] = useState(false);

  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showBiometricSetup, setShowBiometricSetup] = useState(false);
  const [hasBiometrics, setHasBiometrics] = useState(false);

  useEffect(() => {
    // Check if biometrics are enabled on this device
    const bioStats = localStorage.getItem("septa_biometrics_enabled");
    setHasBiometrics(bioStats === "true");
  }, []);

  // Load data from localStorage on mount
  useEffect(() => {
    setMounted(true);

    let savedUsername = "";
    let savedPassword = "";

    // Load credentials
    const savedCreds = localStorage.getItem(CREDENTIALS_KEY);
    if (savedCreds) {
      try {
        const creds = JSON.parse(savedCreds);
        setCredentials(creds);
        setUsername(creds.username);
        setPassword(creds.password);
        savedUsername = creds.username;
        savedPassword = creds.password;
      } catch {
        localStorage.removeItem(CREDENTIALS_KEY);
      }
    }

    // Load wallet data
    const savedWallet = localStorage.getItem(WALLET_KEY);
    if (savedWallet) {
      try {
        setWalletData(JSON.parse(savedWallet));
      } catch {
        localStorage.removeItem(WALLET_KEY);
      }
    }

    // Auto-refresh if we have credentials
    if (savedUsername && savedPassword) {
      // We can't call fetchBalance safely here because it depends on state that might not be set yet
      // in this closure, BUT we can simply call the API directly or use a timeout.
      // Or better, trigger it via a separate effect that watches credentials.
      // However, to keep it simple and avoid loops:
      setTimeout(() => {
        const syncBtn = document.querySelector(
          'button[title="Refresh Balance"]'
        ) as HTMLButtonElement;
        if (syncBtn) syncBtn.click();
      }, 500);
    }
  }, []);

  // Save wallet data
  const saveWalletData = useCallback((data: WalletData) => {
    localStorage.setItem(WALLET_KEY, JSON.stringify(data));
    setWalletData(data);
  }, []);

  // Fetch balance from SEPTA
  const fetchBalance = useCallback(
    async (
      showLoading = true,
      explicitCreds?: { username: string; password: string }
    ) => {
      const user = explicitCreds?.username || credentials?.username || username;
      const pass = explicitCreds?.password || credentials?.password || password;

      if (!user || !pass) {
        setError("Please enter your SEPTA Key credentials");
        return;
      }

      if (showLoading) setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/septa-proxy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: user, password: pass }),
        });

        const result = await response.json();

        if (result.success && result.data) {
          // Save credentials if remember me is checked (or if explicit creds came from biometrics which implies we want to keep them)
          if (rememberMe || explicitCreds) {
            const newCreds = { username: user, password: pass };
            localStorage.setItem(CREDENTIALS_KEY, JSON.stringify(newCreds));
            setCredentials(newCreds);
          }

          // Update wallet data
          const newWalletData: WalletData = {
            balance: result.data.balance ?? walletData?.balance ?? 0,
            cardNumber:
              result.data.cardNumber ?? walletData?.cardNumber ?? null,
            pass: result.data.pass ?? walletData?.pass ?? null,
            lastUpdated: result.data.lastUpdated,
            transactions: result.data.transactions || [],
            paymentProfiles: result.data.paymentProfiles || [],
            raw: result.data.raw,
          };

          saveWalletData(newWalletData);
          setSuccessMessage("Balance & Trips updated!");
          setTimeout(() => setSuccessMessage(null), 3000);

          // Pre-select first payment profile
          if (newWalletData.paymentProfiles.length > 0) {
            setSelectedProfileId(
              newWalletData.paymentProfiles[0].payment_profile_id
            );
          }
        } else {
          setError(result.error || "Failed to fetch balance");
        }
      } catch {
        setError("Network error. Please try again.");
      } finally {
        setIsLoading(false);
      }
    },
    [credentials, username, password, rememberMe, walletData, saveWalletData]
  );

  const handleAddFunds = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!credentials) return;

    setIsAddingFunds(true);
    setError(null);

    try {
      const response = await fetch("/api/septa-proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: credentials.username,
          password: credentials.password,
          action: "add_funds",
          amount: parseFloat(addAmount),
          paymentProfileId: selectedProfileId,
          cvv: cvv,
        }),
      });

      const result = await response.json();
      if (result.success) {
        setSuccessMessage("Funds added successfully!");
        setShowAddFundsDrawer(false);
        setCvv("");
        // Refresh balance after delay
        setTimeout(() => fetchBalance(true), 2000);
      } else {
        setError(result.error || "Failed to add funds");
      }
    } catch (err) {
      setError("Failed to process request");
    } finally {
      setIsAddingFunds(false);
    }
  };

  // Handle login form submission
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetchBalance();
  };

  // Logout / Clear data
  const handleLogout = () => {
    localStorage.removeItem(CREDENTIALS_KEY);
    localStorage.removeItem(WALLET_KEY);
    setCredentials(null);
    setWalletData(null);
    setUsername("");
    setPassword("");
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-septa-blue animate-spin" />
      </div>
    );
  }

  // Main wallet view
  return (
    <>
      <Header title="SEPTA Key" />

      <main className="px-4 py-6 max-w-lg mx-auto space-y-6">
        {/* Success message */}
        {successMessage && (
          <div className="p-3 rounded-xl bg-live/20 border border-live/30 flex items-center gap-3 animate-fade-in">
            <Check className="w-5 h-5 text-live" />
            <p className="text-live font-medium">{successMessage}</p>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="p-3 rounded-xl bg-urgent/20 border border-urgent/30 flex items-center gap-3 animate-fade-in">
            <AlertCircle className="w-5 h-5 text-urgent" />
            <p className="text-urgent font-medium text-sm">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto">
              <X className="w-4 h-4 text-urgent" />
            </button>
          </div>
        )}

        {walletData && credentials ? (
          // Connected - show balance
          <>
            {/* Balance Card */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-septa-gold via-amber-500 to-orange-500 p-6 shadow-xl">
              <div
                className="absolute inset-0 opacity-20"
                onClick={() => setShowDebug(!showDebug)} // Secret toggle
              >
                <svg
                  className="w-full h-full"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                >
                  <pattern
                    id="grid"
                    width="10"
                    height="10"
                    patternUnits="userSpaceOnUse"
                  >
                    <circle cx="5" cy="5" r="1" fill="white" />
                  </pattern>
                  <rect width="100" height="100" fill="url(#grid)" />
                </svg>
              </div>
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/20 rounded-full blur-3xl" />

              <div className="relative">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                      <CreditCard className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-white/70 text-xs font-medium uppercase tracking-wider">
                        SEPTA KEY
                      </p>
                      <p className="text-white font-bold tracking-wide">
                        {walletData.cardNumber
                          ? `•••• ${walletData.cardNumber.slice(-4)}`
                          : "Travel Wallet"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => fetchBalance(true)}
                    disabled={isLoading}
                    className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors disabled:opacity-60 backdrop-blur-sm"
                    title="Refresh Balance"
                  >
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 text-white animate-spin" />
                    ) : (
                      <RefreshCw className="w-5 h-5 text-white" />
                    )}
                  </button>
                </div>

                {/* Balance */}
                <div className="mb-2">
                  <p className="text-white/80 text-sm mb-1 font-medium">
                    Current Balance
                  </p>
                  <p className="text-5xl font-bold text-white font-mono tracking-tight drop-shadow-sm">
                    $
                    {typeof walletData.balance === "number"
                      ? walletData.balance.toFixed(2)
                      : "0.00"}
                  </p>
                </div>

                {walletData.pass && (
                  <div className="inline-flex items-center px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/10 mb-2">
                    <p className="text-white text-xs font-medium">
                      {walletData.pass}
                    </p>
                  </div>
                )}

                <p className="text-white/60 text-xs mb-6 font-medium">
                  Updated:{" "}
                  {new Date(walletData.lastUpdated).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 gap-3">
                  <button
                    onClick={() => setShowAddFundsDrawer(true)}
                    className="flex items-center justify-center gap-2 py-3.5 bg-white text-amber-600 font-bold rounded-xl transition-all hover:bg-gray-50 hover:scale-[1.02] active:scale-95 shadow-lg text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Add Funds
                  </button>
                </div>
              </div>
            </div>

            {/* Debug View */}
            {showDebug && walletData.raw && (
              <div className="p-4 rounded-xl bg-black text-green-400 font-mono text-xs overflow-auto max-h-60 border border-green-900">
                <pre>{JSON.stringify(walletData.raw, null, 2)}</pre>
              </div>
            )}

            {/* Action Cards */}
            <div className="grid grid-cols-2 gap-3">
              <a
                href={SEPTA_URLS.dashboard}
                target="_blank"
                rel="noopener noreferrer"
                className="p-4 rounded-xl bg-bg-secondary border border-border-subtle text-center hover:border-septa-blue/30 transition-colors group"
              >
                <div className="w-10 h-10 rounded-full bg-septa-blue/10 flex items-center justify-center mx-auto mb-3 group-hover:bg-septa-blue/20 transition-colors">
                  <ExternalLink className="w-5 h-5 text-septa-blue" />
                </div>
                <p className="font-semibold text-text-primary text-sm">
                  View Account
                </p>
                <p className="text-xs text-text-muted mt-1">On SEPTA Site</p>
              </a>
              <button
                onClick={() => fetchBalance(true)}
                disabled={isLoading}
                className="p-4 rounded-xl bg-bg-secondary border border-border-subtle text-center hover:border-live/30 transition-colors disabled:opacity-60 group"
              >
                <div className="w-10 h-10 rounded-full bg-live/10 flex items-center justify-center mx-auto mb-3 group-hover:bg-live/20 transition-colors">
                  <RefreshCw
                    className={`w-5 h-5 text-live ${
                      isLoading ? "animate-spin" : ""
                    }`}
                  />
                </div>

                <p className="font-semibold text-text-primary text-sm">
                  Sync Balance
                </p>
                <p className="text-xs text-text-muted mt-1">Latest Data</p>
              </button>
            </div>

            {/* Transaction History */}
            <section>
              <div className="flex items-center justify-between mb-3 px-1">
                <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                  <History className="w-5 h-5 text-text-secondary" />
                  Recent Activity
                </h2>
              </div>

              {walletData.transactions.length > 0 ? (
                <div className="space-y-2">
                  {walletData.transactions.slice(0, 5).map((tx) => {
                    let dateStr = "Unknown Date";
                    try {
                      dateStr = new Date(tx.timestamp).toLocaleDateString(
                        undefined,
                        { month: "short", day: "numeric" }
                      );
                    } catch {
                      dateStr = "Recent";
                    }

                    return (
                      <div
                        key={tx.id}
                        className="p-3.5 rounded-xl bg-bg-secondary border border-border-subtle flex items-center justify-between hover:bg-bg-tertiary transition-colors"
                      >
                        <div className="flex items-center gap-3.5">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center border ${
                              tx.type === "credit"
                                ? "bg-live/10 border-live/20"
                                : "bg-bg-tertiary border-border-subtle"
                            }`}
                          >
                            {tx.type === "credit" ? (
                              <Plus className="w-5 h-5 text-live" />
                            ) : (
                              <Minus className="w-5 h-5 text-text-secondary" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-text-primary text-sm line-clamp-1">
                              {tx.description}
                            </p>
                            <p className="text-xs text-text-muted mt-0.5">
                              {dateStr}
                            </p>
                          </div>
                        </div>
                        <p
                          className={`font-bold font-mono text-sm ${
                            tx.type === "credit"
                              ? "text-live"
                              : "text-text-primary"
                          }`}
                        >
                          {tx.type === "credit" ? "+" : "-"}$
                          {tx.amount.toFixed(2)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 rounded-xl bg-bg-secondary border border-border-subtle text-center">
                  <div className="w-12 h-12 rounded-full bg-bg-tertiary flex items-center justify-center mx-auto mb-3">
                    <History className="w-6 h-6 text-text-muted" />
                  </div>
                  <p className="text-text-muted text-sm font-medium">
                    No recent activity found.
                  </p>
                </div>
              )}

              {/* View More Button */}
              <div className="pt-3">
                <button
                  onClick={() => setShowHistoryDrawer(true)}
                  className="w-full p-3.5 rounded-xl bg-bg-tertiary border border-border-default flex items-center justify-center gap-2 text-text-secondary hover:text-text-primary hover:border-border-strong transition-colors text-sm font-medium"
                >
                  View Full History
                </button>
              </div>
            </section>

            {/* Add Funds Drawer */}
            <Drawer
              isOpen={showAddFundsDrawer}
              onClose={() => setShowAddFundsDrawer(false)}
              title="Add Funds"
            >
              <div className="p-1 space-y-6">
                <form onSubmit={handleAddFunds} className="space-y-6">
                  {/* Amount Selection */}
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-text-secondary block">
                      Amount
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {["10.00", "20.00", "50.00"].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setAddAmount(amt)}
                          className={`py-2 px-3 rounded-lg border text-sm font-medium transition-all ${
                            addAmount === amt
                              ? "bg-septa-blue text-white border-septa-blue"
                              : "bg-bg-tertiary border-border-default text-text-primary hover:border-gray-400"
                          }`}
                        >
                          ${amt}
                        </button>
                      ))}
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted font-mono">
                        $
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        value={addAmount}
                        onChange={(e) => setAddAmount(e.target.value)}
                        className="w-full pl-8 pr-4 py-3 bg-bg-tertiary border border-border-default rounded-xl font-mono text-lg focus:ring-2 focus:ring-septa-blue/20 outline-none"
                      />
                    </div>
                  </div>

                  {/* Payment Method */}
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-text-secondary block">
                      Payment Method
                    </label>
                    {(walletData.paymentProfiles || []).length > 0 ? (
                      <div className="space-y-2">
                        {(walletData.paymentProfiles || []).map((p) => (
                          <label
                            key={p.payment_profile_id}
                            className={`flex items-center gap-4 p-3 rounded-xl border cursor-pointer transition-all ${
                              selectedProfileId === p.payment_profile_id
                                ? "border-septa-blue bg-septa-blue/5"
                                : "border-border-default bg-bg-tertiary hover:border-gray-400"
                            }`}
                          >
                            <input
                              type="radio"
                              name="paymentProfile"
                              value={p.payment_profile_id}
                              checked={
                                selectedProfileId === p.payment_profile_id
                              }
                              onChange={() =>
                                setSelectedProfileId(p.payment_profile_id)
                              }
                              className="w-4 h-4 text-septa-blue"
                            />
                            <div className="flex-1">
                              <p className="font-semibold text-text-primary text-sm">
                                {p.description || p.card_type || "Credit Card"}
                              </p>
                              <p className="text-xs text-text-muted">
                                •••• {p.last_four || "****"}
                              </p>
                            </div>
                            <CreditCard className="w-5 h-5 text-text-muted" />
                          </label>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-600 text-sm">
                        No saved payment methods found. Please add a card on
                        septakey.org first.
                      </div>
                    )}
                  </div>

                  {/* CVV Input */}
                  {(walletData.paymentProfiles || []).length > 0 && (
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-text-secondary block">
                        Card Security Code (CVV)
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                        <input
                          type="password"
                          maxLength={4}
                          value={cvv}
                          onChange={(e) => setCvv(e.target.value)}
                          placeholder="123"
                          className="w-full pl-10 pr-4 py-3 bg-bg-tertiary border border-border-default rounded-xl font-mono text-lg focus:ring-2 focus:ring-septa-blue/20 outline-none"
                          required
                        />
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={
                      isAddingFunds || !selectedProfileId || !addAmount || !cvv
                    }
                    className="w-full py-4 bg-septa-blue hover:bg-septa-blue-bright text-white font-bold rounded-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-septa-blue/20"
                  >
                    {isAddingFunds ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Adding Funds...
                      </>
                    ) : (
                      <>
                        Confirm Payment
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </form>
              </div>
            </Drawer>

            {/* History Drawer */}
            <Drawer
              isOpen={showHistoryDrawer}
              onClose={() => setShowHistoryDrawer(false)}
              title="Trip History"
            >
              <div className="space-y-3 pt-2">
                {walletData.transactions.length > 0 ? (
                  walletData.transactions.map((tx) => {
                    let dateStr = "Unknown Date";
                    let timeStr = "";
                    try {
                      const dateObj = new Date(tx.timestamp);
                      dateStr = dateObj.toLocaleDateString();
                      timeStr = dateObj.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      });
                    } catch {
                      dateStr = "Recent";
                    }

                    return (
                      <div
                        key={tx.id}
                        className="p-4 rounded-xl bg-bg-tertiary border border-border-subtle flex items-center justify-between"
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                              tx.type === "credit"
                                ? "bg-live/10"
                                : "bg-bg-primary"
                            }`}
                          >
                            {tx.type === "credit" ? (
                              <Plus className="w-5 h-5 text-live" />
                            ) : (
                              <Minus className="w-5 h-5 text-text-secondary" />
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-text-primary text-sm">
                              {tx.description}
                            </p>
                            <p className="text-xs text-text-muted mt-0.5">
                              {dateStr} <span className="opacity-50">•</span>{" "}
                              {timeStr}
                            </p>
                          </div>
                        </div>
                        <p
                          className={`font-bold font-mono text-base ${
                            tx.type === "credit"
                              ? "text-live"
                              : "text-text-primary"
                          }`}
                        >
                          {tx.type === "credit" ? "+" : "-"}$
                          {tx.amount.toFixed(2)}
                        </p>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-10 text-text-muted">
                    No history available.
                  </div>
                )}
              </div>
            </Drawer>

            {/* Biometric Setup */}
            <div className="pt-2">
              <BiometricSetup
                username={credentials.username}
                credentials={credentials}
              />
            </div>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="w-full p-3 rounded-xl bg-bg-secondary border border-border-subtle flex items-center justify-center gap-2 text-text-muted hover:text-urgent hover:border-urgent/30 transition-colors text-sm"
            >
              <LogOut className="w-4 h-4" />
              Sign Out & Clear Data
            </button>
          </>
        ) : (
          // Not connected - show login
          <>
            {/* Hero */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-septa-blue via-[#2563eb] to-[#1e40af] p-6 shadow-xl">
              <div className="absolute top-0 right-0 w-40 h-40 bg-septa-gold/20 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full blur-2xl" />

              <div className="relative text-center py-6">
                <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-5 shadow-lg border border-white/10">
                  <Wallet className="w-10 h-10 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-white mb-3">
                  Connect SEPTA Key
                </h1>
                <p className="text-white/80 text-sm leading-relaxed max-w-xs mx-auto">
                  Sign in with your SEPTA Key account to view your balance and
                  manage your wallet.
                </p>
              </div>
            </div>

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="p-5 rounded-2xl bg-bg-secondary border border-border-subtle space-y-5 shadow-sm">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2 ml-1">
                    Username
                  </label>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted group-focus-within:text-septa-blue transition-colors" />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Your SEPTA Key username"
                      className="w-full pl-12 pr-4 py-3.5 bg-bg-tertiary border border-border-default rounded-xl text-text-primary placeholder:text-text-muted focus:border-septa-blue focus:ring-4 focus:ring-septa-blue/10 outline-none transition-all"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2 ml-1">
                    Password
                  </label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted group-focus-within:text-septa-blue transition-colors" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Your SEPTA Key password"
                      className="w-full pl-12 pr-12 py-3.5 bg-bg-tertiary border border-border-default rounded-xl text-text-primary placeholder:text-text-muted focus:border-septa-blue focus:ring-4 focus:ring-septa-blue/10 outline-none transition-all"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary p-1 rounded-md hover:bg-bg-primary transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative flex items-center">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-border-default bg-bg-tertiary transition-all checked:border-septa-blue checked:bg-septa-blue"
                    />
                    <Check className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                  </div>
                  <span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors">
                    Remember my credentials
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 bg-septa-blue hover:bg-septa-blue-bright text-white font-bold rounded-xl transition-all disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-septa-blue/20"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Sign In to Wallet
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>

              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border-default"></span>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-bg-secondary px-2 text-text-muted">
                    Or
                  </span>
                </div>
              </div>

              {hasBiometrics && (
                <BiometricLogin
                  onLoginSuccess={(creds) => {
                    setUsername(creds.username);
                    setPassword(creds.password);
                    fetchBalance(true, creds);
                  }}
                />
              )}
            </form>

            {/* Security note */}
            <div className="p-4 rounded-xl bg-bg-secondary border border-border-subtle">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-septa-green flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-text-primary text-sm">
                    Secure Connection
                  </p>
                  <p className="text-xs text-text-muted mt-1 leading-relaxed">
                    Your credentials are stored locally on your device and used
                    to connect directly to SEPTA. We never store your password
                    on our servers.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </>
  );
}

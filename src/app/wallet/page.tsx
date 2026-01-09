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
  raw?: any;
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

  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
    async (showLoading = true) => {
      const user = credentials?.username || username;
      const pass = credentials?.password || password;

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
          // Save credentials if remember me is checked
          if (rememberMe) {
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
            raw: result.data.raw,
          };

          saveWalletData(newWalletData);
          setSuccessMessage("Balance & Trips updated!");
          setTimeout(() => setSuccessMessage(null), 3000);
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
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-septa-gold via-amber-500 to-orange-500 p-6">
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
                    <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                      <CreditCard className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-white/70 text-xs font-medium">
                        SEPTA KEY
                      </p>
                      <p className="text-white font-bold">
                        {walletData.cardNumber
                          ? `****${walletData.cardNumber}`
                          : "Travel Wallet"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => fetchBalance(true)}
                    disabled={isLoading}
                    className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors disabled:opacity-60"
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
                  <p className="text-white/70 text-sm mb-1">Current Balance</p>
                  <p className="text-5xl font-bold text-white font-mono tracking-tight">
                    ${walletData.balance.toFixed(2)}
                  </p>
                </div>

                {walletData.pass && (
                  <p className="text-white/80 text-sm mb-2">
                    Pass: {walletData.pass}
                  </p>
                )}

                <p className="text-white/60 text-xs mb-6">
                  Last synced:{" "}
                  {new Date(walletData.lastUpdated).toLocaleString()}
                </p>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 gap-3">
                  <a
                    href={SEPTA_URLS.addFunds}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 py-3.5 bg-white text-amber-600 font-bold rounded-xl transition-all hover:bg-white/90 shadow-lg text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Add Funds
                  </a>
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
                className="p-4 rounded-xl bg-bg-secondary border border-border-subtle text-center hover:border-septa-blue/30 transition-colors"
                title="Click pattern on card to toggle debug"
              >
                <ExternalLink className="w-6 h-6 text-septa-blue mx-auto mb-2" />
                <p className="font-semibold text-text-primary text-sm">
                  View Account
                </p>
                <p className="text-xs text-text-muted mt-1">On SEPTA</p>
              </a>
              <button
                onClick={() => fetchBalance(true)}
                disabled={isLoading}
                className="p-4 rounded-xl bg-bg-secondary border border-border-subtle text-center hover:border-live/30 transition-colors disabled:opacity-60"
              >
                {isLoading ? (
                  <Loader2 className="w-6 h-6 text-live mx-auto mb-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-6 h-6 text-live mx-auto mb-2" />
                )}
                <p className="font-semibold text-text-primary text-sm">
                  Sync Balance
                </p>
                <p className="text-xs text-text-muted mt-1">From SEPTA</p>
              </button>
            </div>

            {/* Transaction History */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                  <History className="w-5 h-5" />
                  Recent Activity
                </h2>
              </div>

              {walletData.transactions.length > 0 ? (
                <div className="space-y-2">
                  {walletData.transactions.slice(0, 5).map((tx) => {
                    let dateStr = "Unknown Date";
                    try {
                      dateStr = new Date(tx.timestamp).toLocaleDateString();
                      if (dateStr === "Invalid Date") throw new Error();
                    } catch {
                      dateStr = "Recent";
                    }

                    return (
                      <div
                        key={tx.id}
                        className="p-3 rounded-xl bg-bg-secondary border border-border-subtle flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                              tx.type === "credit"
                                ? "bg-live/10"
                                : "bg-bg-tertiary"
                            }`}
                          >
                            {tx.type === "credit" ? (
                              <Plus className="w-4 h-4 text-live" />
                            ) : (
                              <Minus className="w-4 h-4 text-text-secondary" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-text-primary text-sm line-clamp-1">
                              {tx.description}
                            </p>
                            <p className="text-xs text-text-muted">{dateStr}</p>
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
                <div className="p-6 rounded-xl bg-bg-secondary border border-border-subtle text-center">
                  <p className="text-text-muted text-sm">
                    No recent activity found.
                  </p>
                </div>
              )}

              {/* View More Button */}
              <div className="pt-2">
                <button
                  onClick={() => setShowHistoryDrawer(true)}
                  className="w-full p-3 rounded-xl bg-bg-tertiary border border-border-default flex items-center justify-center gap-2 text-text-secondary hover:text-text-primary hover:border-border-strong transition-colors text-sm"
                >
                  View Full History
                </button>
              </div>
            </section>

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
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-septa-blue via-[#2563eb] to-[#1e40af] p-6">
              <div className="absolute top-0 right-0 w-40 h-40 bg-septa-gold/20 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full blur-2xl" />

              <div className="relative text-center py-4">
                <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <Wallet className="w-10 h-10 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">
                  Connect SEPTA Key
                </h1>
                <p className="text-white/80 text-sm leading-relaxed">
                  Sign in with your SEPTA Key account to view your balance and
                  manage your wallet.
                </p>
              </div>
            </div>

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="p-5 rounded-2xl bg-bg-secondary border border-border-subtle space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Username
                  </label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Your SEPTA Key username"
                      className="w-full pl-12 pr-4 py-3 bg-bg-tertiary border border-border-default rounded-xl text-text-primary placeholder:text-text-muted focus:border-septa-blue focus:ring-2 focus:ring-septa-blue/20 outline-none transition-all"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Your SEPTA Key password"
                      className="w-full pl-12 pr-12 py-3 bg-bg-tertiary border border-border-default rounded-xl text-text-primary placeholder:text-text-muted focus:border-septa-blue focus:ring-2 focus:ring-septa-blue/20 outline-none transition-all"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-5 h-5 rounded border-border-default bg-bg-tertiary text-septa-blue focus:ring-septa-blue/20"
                  />
                  <span className="text-sm text-text-secondary">
                    Remember my credentials
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={isLoading || !username || !password}
                className="w-full py-4 bg-septa-blue hover:bg-septa-blue-bright text-white font-bold rounded-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    Connect Account
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>

            {/* Security note */}
            <div className="p-4 rounded-xl bg-live/10 border border-live/20">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-live flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-live text-sm">
                    Secure Connection
                  </p>
                  <p className="text-xs text-text-secondary mt-1">
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

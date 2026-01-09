import { useState, useEffect } from "react";
import { startRegistration } from "@simplewebauthn/browser";
import {
  Fingerprint,
  Check,
  Loader2,
  AlertCircle,
  XCircle,
} from "lucide-react";

interface BiometricSetupProps {
  username: string;
  credentials: { username: string; password: string };
  onSuccess?: () => void;
}

export function BiometricSetup({
  username,
  credentials,
  onSuccess,
}: BiometricSetupProps) {
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [isEnabled, setIsEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Check status on mount
  useEffect(() => {
    checkStatus();
  }, [username]);

  const checkStatus = async () => {
    try {
      const res = await fetch("/api/auth/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      const data = await res.json();
      const enabled = !!data.enabled;
      setIsEnabled(enabled);

      // Sync local storage
      if (enabled) {
        localStorage.setItem("septa_biometrics_enabled", "true");
      } else {
        localStorage.removeItem("septa_biometrics_enabled");
      }
    } catch (e) {
      console.error("Failed to check biometric status", e);
    } finally {
      setChecking(false);
    }
  };

  const handleSetup = async () => {
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      // 1. Get options from server
      const resp = await fetch("/api/auth/register-challenge", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username }),
      });

      const options = await resp.json();

      if (options.error) {
        throw new Error(options.error);
      }

      // 2. Start browser registration
      // @ts-ignore
      const attResp = await startRegistration(options);

      // 3. Verify with server
      const verifyResp = await fetch("/api/auth/register-verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          response: attResp,
          septaCredentials: credentials, // Sending credentials to be encrypted & stored
        }),
      });

      const verification = await verifyResp.json();

      if (verification.verified) {
        setSuccessMsg("Biometrics enabled!");
        setIsEnabled(true);
        localStorage.setItem("septa_biometrics_enabled", "true");
        if (onSuccess) onSuccess();
      } else {
        throw new Error(verification.error || "Verification failed");
      }
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Failed to setup biometrics");
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async () => {
    if (!confirm("Are you sure you want to disable Touch ID / Face ID login?"))
      return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });

      if (res.ok) {
        setIsEnabled(false);
        setSuccessMsg("Biometrics disabled.");
        localStorage.removeItem("septa_biometrics_enabled");
      } else {
        throw new Error("Failed to disable");
      }
    } catch (e) {
      setError("Could not disable biometrics");
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="w-full h-12 flex items-center justify-center gap-2 bg-bg-tertiary border border-border-default rounded-xl shadow-sm animate-pulse">
        <Loader2 className="w-5 h-5 text-text-muted animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {successMsg && (
        <div className="flex items-center gap-2 text-green-600 bg-green-50 px-4 py-3 rounded-xl border border-green-200 text-sm font-medium mb-2">
          <Check className="w-5 h-5" />
          {successMsg}
        </div>
      )}

      {!isEnabled ? (
        <button
          onClick={handleSetup}
          disabled={loading}
          className="w-full h-12 flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all font-semibold rounded-xl shadow-sm text-sm"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Fingerprint className="w-5 h-5 text-septa-blue" />
          )}
          Enable Touch ID / Face ID
        </button>
      ) : (
        <button
          onClick={handleDisable}
          disabled={loading}
          className="w-full h-12 flex items-center justify-center gap-2 bg-bg-tertiary border border-border-default text-text-primary hover:bg-bg-highlight hover:border-border-strong transition-all font-semibold rounded-xl shadow-sm text-sm"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <XCircle className="w-5 h-5" />
          )}
          Disable Touch ID
        </button>
      )}

      {error && (
        <div className="flex items-start gap-2 text-red-600 text-xs px-2">
          <AlertCircle className="w-3 h-3 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

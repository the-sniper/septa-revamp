import { useState } from "react";
import { startAuthentication } from "@simplewebauthn/browser";
import { Fingerprint, Loader2, AlertCircle } from "lucide-react";

interface BiometricLoginProps {
  username?: string; // Optional: can be used if we want to support username-less passkeys later, but mainly for targeting specific user
  onLoginSuccess: (credentials: { username: string; password: string }) => void;
}

export function BiometricLogin({
  username,
  onLoginSuccess,
}: BiometricLoginProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. Get options from server
      const resp = await fetch("/api/auth/login-challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });

      const options = await resp.json();

      if (options.error) {
        throw new Error(options.error);
      }

      // 2. Start browser authentication
      const asseResp = await startAuthentication(options);

      // 3. Verify with server
      const verifyResp = await fetch("/api/auth/login-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response: asseResp }),
      });

      const verification = await verifyResp.json();

      if (verification.verified && verification.credentials) {
        onLoginSuccess(verification.credentials);
      } else {
        throw new Error(verification.error || "Verification failed");
      }
    } catch (e) {
      console.error(e);
      // Clean error message
      let msg = "Failed to authenticate";
      if (e instanceof Error) {
        if (e.name === "NotAllowedError") msg = "Cancelled by user";
        else msg = e.message;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={handleLogin}
        disabled={loading}
        className="w-full flex items-center justify-center gap-3 bg-white border border-gray-200 text-gray-800 hover:bg-gray-50 hover:border-septa-blue/30 hover:shadow-md transition-all font-bold py-3.5 px-4 rounded-xl shadow-sm group"
      >
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin text-septa-blue" />
        ) : (
          <div className="bg-septa-blue/10 p-1.5 rounded-full group-hover:bg-septa-blue/20 transition-colors">
            <Fingerprint className="w-5 h-5 text-septa-blue" />
          </div>
        )}
        <span className="text-sm">Log in with Touch ID</span>
      </button>

      {error && (
        <div className="flex items-center gap-2 justify-center text-red-500 text-xs font-medium animate-fade-in">
          <AlertCircle className="w-3 h-3" />
          {error}
        </div>
      )}
    </div>
  );
}

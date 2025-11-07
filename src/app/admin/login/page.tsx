"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export default function AdminLoginPage() {
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSetup, setIsSetup] = useState<boolean | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [step, setStep] = useState<"login" | "forgot" | "verify" | "reset">("login");
  const [devCode, setDevCode] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Check if admin is already logged in
    const checkAdmin = async () => {
      try {
        const res = await fetch("/api/admin/check");
        const data = await res.json();
        if (data.ok && data.isAdmin) {
          const callbackUrl = searchParams.get("callbackUrl") || "/admin/sync";
          router.push(callbackUrl);
        } else if (data.ok && data.adminEmail) {
          // Setup done, show login
          setIsSetup(true);
          setEmail(data.adminEmail);
        } else {
          // Not setup yet
          setIsSetup(false);
        }
      } catch (e) {
        setIsSetup(false);
      }
    };
    checkAdmin();
  }, [router, searchParams]);

  async function handleSetup(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!email || !password) {
      setError("Email and password are required");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/admin/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (data.ok) {
        // Setup successful, now login
        await handleLogin(e);
      } else {
        setError(data.error || "Setup failed");
      }
    } catch (e: any) {
      setError("Setup failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (data.ok) {
        const callbackUrl = searchParams.get("callbackUrl") || "/admin/sync";
        router.push(callbackUrl);
      } else {
        setError(data.error || "Invalid password");
      }
    } catch (e: any) {
      setError("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (data.ok) {
        setStep("verify");
        setError("");
        // Store dev code if in development
        if (data.devCode) {
          setDevCode(data.devCode);
        }
      } else {
        setError(data.error || "Failed to send verification code");
      }
    } catch (e: any) {
      setError("Failed to send verification code. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyCode() {
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: verificationCode }),
      });

      const data = await res.json();

      if (data.ok) {
        setStep("reset");
        setError("");
      } else {
        setError(data.error || "Invalid verification code");
      }
    } catch (e: any) {
      setError("Verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword() {
    setError("");
    setLoading(true);

    if (!newPassword || newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/admin/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: verificationCode, newPassword }),
      });

      const data = await res.json();

      if (data.ok) {
        setError("");
        setStep("login");
        setPassword("");
        setVerificationCode("");
        setNewPassword("");
        setShowForgotPassword(false);
        // Show success message
        alert("Password reset successful! Please login with your new password.");
      } else {
        setError(data.error || "Failed to reset password");
      }
    } catch (e: any) {
      setError("Reset failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (isSetup === null) {
    return (
      <main className="grid min-h-[80vh] place-items-center py-12 animate-fade-in">
        <div className="card w-full max-w-md p-8 text-center">
          <p className="text-white/60">Checking admin setup...</p>
        </div>
      </main>
    );
  }

  // First time setup
  if (!isSetup) {
    return (
      <main className="grid min-h-[80vh] place-items-center py-12 animate-fade-in">
        <div className="card w-full max-w-md p-8 space-y-6 animate-slide-up">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-2 text-white">Admin Setup</h1>
            <p className="text-white/60 text-sm">Set up your admin account (one-time setup)</p>
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400 animate-fade-in">
              {error}
            </div>
          )}

          <form onSubmit={handleSetup} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-white/80 mb-2 block">Admin Email</label>
              <input
                type="email"
                className="input-field"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                required
                autoFocus
              />
              <p className="text-xs text-white/50 mt-1">This email cannot be changed later</p>
            </div>
            <div>
              <label className="text-sm font-medium text-white/80 mb-2 block">Admin Password</label>
              <input
                type="password"
                className="input-field"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter a strong password"
                required
                minLength={6}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? "Setting up..." : "Complete Setup"}
            </button>
          </form>
        </div>
      </main>
    );
  }

  // Forgot password flow
  if (step === "forgot") {
    return (
      <main className="grid min-h-[80vh] place-items-center py-12 animate-fade-in">
        <div className="card w-full max-w-md p-8 space-y-6 animate-slide-up">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-2 text-white">Forgot Password</h1>
            <p className="text-white/60 text-sm">Enter your admin email to receive a verification code</p>
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400 animate-fade-in">
              {error}
            </div>
          )}

          <form onSubmit={(e) => { e.preventDefault(); handleForgotPassword(); }} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-white/80 mb-2 block">Admin Email</label>
              <input
                type="email"
                className="input-field"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                required
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? "Sending..." : "Send Verification Code"}
            </button>
            <button
              type="button"
              onClick={() => { setStep("login"); setError(""); }}
              className="btn-outline w-full"
            >
              Back to Login
            </button>
          </form>
        </div>
      </main>
    );
  }

  // Verify code step
  if (step === "verify") {
    return (
      <main className="grid min-h-[80vh] place-items-center py-12 animate-fade-in">
        <div className="card w-full max-w-md p-8 space-y-6 animate-slide-up">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-2 text-white">Verify Code</h1>
            <p className="text-white/60 text-sm">Enter the verification code sent to {email}</p>
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400 animate-fade-in">
              {error}
            </div>
          )}

          {devCode && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-400 animate-fade-in">
              <strong>Development Mode:</strong> Your verification code is: <code className="font-mono font-bold">{devCode}</code>
            </div>
          )}

          <form onSubmit={(e) => { e.preventDefault(); handleVerifyCode(); }} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-white/80 mb-2 block">Verification Code</label>
              <input
                type="text"
                className="input-field"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                placeholder="Enter 6-digit code"
                required
                maxLength={6}
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? "Verifying..." : "Verify Code"}
            </button>
            <button
              type="button"
              onClick={() => { setStep("forgot"); setError(""); setVerificationCode(""); }}
              className="btn-outline w-full"
            >
              Back
            </button>
          </form>
        </div>
      </main>
    );
  }

  // Reset password step
  if (step === "reset") {
    return (
      <main className="grid min-h-[80vh] place-items-center py-12 animate-fade-in">
        <div className="card w-full max-w-md p-8 space-y-6 animate-slide-up">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-2 text-white">Reset Password</h1>
            <p className="text-white/60 text-sm">Enter your new password</p>
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400 animate-fade-in">
              {error}
            </div>
          )}

          <form onSubmit={(e) => { e.preventDefault(); handleResetPassword(); }} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-white/80 mb-2 block">New Password</label>
              <input
                type="password"
                className="input-field"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (min 6 characters)"
                required
                minLength={6}
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? "Resetting..." : "Reset Password"}
            </button>
            <button
              type="button"
              onClick={() => { setStep("verify"); setError(""); setNewPassword(""); }}
              className="btn-outline w-full"
            >
              Back
            </button>
          </form>
        </div>
      </main>
    );
  }

  // Regular login
  return (
    <main className="grid min-h-[80vh] place-items-center py-12 animate-fade-in">
      <div className="card w-full max-w-md p-8 space-y-6 animate-slide-up">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2 text-white">Admin Login</h1>
          <p className="text-white/60 text-sm">Enter password for {email}</p>
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400 animate-fade-in">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-white/80 mb-2 block">Password</label>
            <input
              type="password"
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter admin password"
              required
              autoFocus
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
          <button
            type="button"
            onClick={() => { setStep("forgot"); setError(""); }}
            className="btn-outline w-full"
          >
            Forgot Password?
          </button>
        </form>
      </div>
    </main>
  );
}

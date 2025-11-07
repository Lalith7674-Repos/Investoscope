"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [hasError, setHasError] = useState<string | null>(null);
  const [verify, setVerify] = useState<string | null>(null);
  const [callbackUrl, setCallbackUrl] = useState("/dashboard");
  
  const qp = useSearchParams();
  
  useEffect(() => {
    setHasError(qp.get("error"));
    setVerify(qp.get("verify"));
    setCallbackUrl(qp.get("callbackUrl") || "/dashboard");
  }, [qp]);

  return (
    <main className="grid min-h-[80vh] place-items-center py-12 animate-fade-in">
      <div className="card w-full max-w-md p-8 space-y-6 animate-slide-up">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2 text-white">Create account</h1>
          <p className="text-white/60 text-sm">Join InvestoScope to save your favorites</p>
        </div>

        {hasError ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400 animate-fade-in">
            Registration failed. Try again or use a different method.
          </div>
        ) : null}
        {verify ? (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-400 animate-fade-in">
            Check your email for the magic link.
          </div>
        ) : null}

        <button
          onClick={() => {
            signIn("google", { 
              callbackUrl: callbackUrl || "/dashboard",
              redirect: true 
            });
          }}
          className="btn-primary w-full"
        >
          Continue with Google
        </button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10"></div>
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-black px-2 text-white/40">or</span>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!email) return;
            signIn("email", { 
              email, 
              callbackUrl: callbackUrl || "/dashboard",
              redirect: true 
            });
          }}
          className="space-y-3"
        >
          <input
            type="email"
            placeholder="your@email.com"
            className="input-field"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button type="submit" className="btn-outline w-full">
            Send magic link
          </button>
        </form>

        <div className="pt-4 border-t border-white/10">
          <p className="text-xs text-white/40 text-center">
            Already have an account?{" "}
            <Link href="/login" className="text-white hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

"use client";

// LOGIN screen — email + one-time code (OTP) every time (D-016).
//
// Two stages:
//   1. "email": type your email, we send a 6-digit code.
//   2. "code":  type the code, we verify it and you're in.
//
// No password is stored. The code is single-use and short-lived.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [stage, setStage] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function sendCode() {
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true }, // first sign-in creates the account
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setStage("code");
  }

  async function verifyCode() {
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: "email",
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    // Logged in. Refresh so the server sees the new session, then go home.
    router.push("/");
    router.refresh();
  }

  return (
    <div className="mx-auto mt-10 flex max-w-sm flex-col gap-5">
      <div>
        <h2 className="text-lg font-semibold">Sign in</h2>
        <p className="mt-1 text-sm text-muted">
          {stage === "email"
            ? "Enter your email and we'll send you a one-time code."
            : `We sent a code to ${email}. Enter it below.`}
        </p>
      </div>

      {stage === "email" ? (
        <div className="flex flex-col gap-3">
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-xl border border-border bg-surface px-3 py-3 text-sm outline-none focus:border-accent"
          />
          <button
            onClick={sendCode}
            disabled={!email.trim() || loading}
            className="rounded-xl bg-accent px-4 py-3 text-sm font-medium text-white disabled:opacity-40"
          >
            {loading ? "Sending…" : "Send code"}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="6-digit code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="rounded-xl border border-border bg-surface px-3 py-3 text-center text-lg tracking-widest outline-none focus:border-accent"
          />
          <button
            onClick={verifyCode}
            disabled={!code.trim() || loading}
            className="rounded-xl bg-accent px-4 py-3 text-sm font-medium text-white disabled:opacity-40"
          >
            {loading ? "Verifying…" : "Verify & sign in"}
          </button>
          <button
            onClick={() => {
              setStage("email");
              setCode("");
              setError(null);
            }}
            className="text-sm text-muted"
          >
            ← Use a different email
          </button>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

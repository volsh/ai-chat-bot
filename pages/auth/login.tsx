"use client";

import { useState, useEffect } from "react";
import { supabaseBrowserClient as supabase } from "@/libs/supabase";
import { toast } from "react-hot-toast";
import { useRouter } from "next/router";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [redirectPath, setRedirectPath] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (router.isReady) {
      const { next } = router.query;
      if (typeof next === "string") {
        let redirectTo = decodeURIComponent(next);
        if (!redirectTo.startsWith("/")) redirectTo = "/";
        setRedirectPath(redirectTo);
      }
    }
  }, [router.isReady]);

  const getRedirectUrl = () => {
    const base = `${window.location.origin}/auth/callback`;
    return redirectPath ? `${base}?next=${encodeURIComponent(redirectPath)}` : base;
  };

  const signInWithEmail = async () => {
    if (!email.trim()) {
      toast.error("Please enter a valid email.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: getRedirectUrl(),
      },
    });
    setLoading(false);

    if (error) {
      toast.error("Error sending login email: " + error.message);
    } else {
      toast.success("Check your email for a login link.");
    }
  };

  const signInWithGitHub = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: getRedirectUrl(),
      },
    });
    setLoading(false);
    if (error) {
      toast.error("GitHub login error: " + error.message);
    }
  };

  const signInWithPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !password.trim()) {
      toast.error("Please enter both email and password.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);

    if (error) {
      toast.error("Login failed: " + error.message);
    } else {
      router.push(redirectPath || "/");
    }
  };

  const sendPasswordReset = async () => {
    if (!email.trim()) {
      toast.error("Please enter your email to reset your password.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    setLoading(false);

    if (error) {
      toast.error("Error sending password reset: " + error.message);
    } else {
      toast.success("Password reset link sent to your email.");
    }
  };

  return (
    <main className="mx-auto mt-20 flex max-w-sm flex-col items-center gap-5 rounded-xl border px-6 py-8 shadow dark:border-zinc-700 dark:bg-zinc-900">
      <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Sign In</h2>
      <img src="/logo.png" alt="App Logo" className="m-w-full mb-2 h-auto" />

      {!showPasswordForm && (
        <>
          <input
            type="email"
            className="w-full rounded-md border border-zinc-300 p-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <button
            onClick={signInWithEmail}
            disabled={loading}
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Sending..." : "Send Login Link"}
          </button>

          <button
            onClick={signInWithGitHub}
            className="text-sm text-blue-600 underline dark:text-blue-400"
          >
            Sign in via GitHub
          </button>

          <button
            onClick={() => setShowPasswordForm(true)}
            className="text-sm text-blue-600 underline dark:text-blue-400"
          >
            Sign in with email and password
          </button>
        </>
      )}

      {showPasswordForm && (
        <form onSubmit={signInWithPassword} className="flex w-full flex-col gap-3">
          <input
            type="email"
            className="w-full rounded-md border border-zinc-300 p-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            className="w-full rounded-md border border-zinc-300 p-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
            placeholder="Your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>

          <button
            type="button"
            onClick={() => setShowPasswordForm(false)}
            className="mt-2 text-sm text-blue-600 underline dark:text-blue-400"
          >
            Back to magic link login
          </button>
          <button
            type="button"
            onClick={sendPasswordReset}
            className="text-sm text-blue-600 underline dark:text-blue-400"
          >
            Forgot your password?
          </button>
        </form>
      )}
    </main>
  );
}

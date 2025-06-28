"use client";

import { useState, useEffect } from "react";
import { supabaseBrowserClient as supabase } from "@/libs/supabase";
import { toast } from "react-hot-toast";
import { useRouter } from "next/router";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const [redirectPath, setRedirectPath] = useState<string | null>(null);

  // Extract `next` param (may be `/join?team_id=...`)
  useEffect(() => {
    if (router.isReady) {
      const { next } = router.query;
      if (typeof next === "string") {
        let redirectTo = typeof next === "string" ? decodeURIComponent(next) : "/";
        if (!redirectTo.startsWith("/")) {
          redirectTo = "/";
        }
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
      console.error("OTP Login Error:", error);
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
    if (error) {
      setLoading(false);
      toast.error("Issue with provider login: " + error.message);
      console.error("GitHub Login Error:", error);
    }
  };

  const signInWithPassword = async () => {
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: "therapist2@example.com",
      password: "Test123!",
    });
    if (error) {
      setLoading(false);
      toast.error("Issue with password login: " + error.message);
      console.error("GitHub Login Error:", error);
    } else {
      router.push("/");
    }
  };

  return (
    <main className="mx-auto mt-20 flex max-w-sm flex-col items-center gap-5 rounded-xl border px-6 py-8 shadow dark:border-zinc-700 dark:bg-zinc-900">
      <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Sign In</h2>
      <img src="/logo.png" alt="App Logo" className="m-w-full mb-2 h-auto" />

      <input
        type="email"
        className="w-full rounded-md border border-zinc-300 p-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <button
        type="submit"
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
        Sign in with GitHub
      </button>

      <button
        onClick={signInWithPassword}
        className="text-sm text-blue-600 underline dark:text-blue-400"
      >
        Sign in with password
      </button>
    </main>
  );
}

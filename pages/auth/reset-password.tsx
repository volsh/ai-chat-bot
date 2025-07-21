"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowserClient as supabase } from "@/libs/supabase";
import toast from "react-hot-toast";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next");

  const [sessionChecked, setSessionChecked] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        toast.error("Please login again to reset your password.");
        router.replace("/auth/login");
      } else {
        setSessionChecked(true);
      }
    };
    checkSession();
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirm) {
      toast.error("Passwords do not match.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      toast.error("Failed to update password: " + error.message);
    } else {
      toast.success("Password updated.");
      router.replace(next ? decodeURIComponent(next) : "/");
    }
  };

  if (!sessionChecked) {
    return <p className="mt-20 text-center text-gray-500">Validating session…</p>;
  }

  return (
    <main className="mx-auto mt-20 flex max-w-sm flex-col items-center gap-5 rounded-xl border px-6 py-8 shadow dark:border-zinc-700 dark:bg-zinc-900">
      <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Reset Your Password</h2>

      <form onSubmit={handleReset} className="flex w-full flex-col gap-4">
        <input
          type="password"
          placeholder="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-md border border-zinc-300 p-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
        />

        <input
          type="password"
          placeholder="Confirm new password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="rounded-md border border-zinc-300 p-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Updating..." : "Update Password"}
        </button>
      </form>
    </main>
  );
}

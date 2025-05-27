"use client";

import { useState } from "react";
import { supabaseBrowserClient } from "@/libs/supabase";
import { useSetSession } from "@/context/SessionContext";
import { useRouter } from "next/router";

export default function LoginPage() {
  const setSession = useSetSession();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const signInWithEmail = async () => {
    setLoading(true);
    const { data, error } = await supabaseBrowserClient.auth.signInWithOtp({ email });
    if (!error) {
      const {
        data: { session },
      } = await supabaseBrowserClient.auth.getSession();
      if (session) {
        setSession(session);
        router.push("/chat");
      }
    }
    // alert("Check your email for a login link.");
  };

  const signInWithGitHub = async () => {
    const { data, error } = await supabaseBrowserClient.auth.signInWithOAuth({
      provider: "github",
    });
    if (!error) {
      const {
        data: { session },
      } = await supabaseBrowserClient.auth.getSession();
      if (session) {
        setSession(session);
        router.push("/chat");
      }
    }
  };

  return (
    <div className="mx-auto mt-20 flex max-w-sm flex-col items-center gap-4">
      <h2 className="text-xl font-bold">Login</h2>
      <input
        type="email"
        className="w-full rounded-md border p-2 dark:bg-zinc-800 dark:text-white"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <button onClick={signInWithEmail} className="rounded bg-blue-600 px-4 py-2 text-white">
        {loading ? "Sending..." : "Send Login Link"}
      </button>
      <button onClick={signInWithGitHub} className="text-sm text-gray-500 underline">
        Sign in with GitHub
      </button>
    </div>
  );
}

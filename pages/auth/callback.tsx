"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAppStore } from "@/state";
import { supabaseBrowserClient as supabase } from "@/libs/supabase";
import toast from "react-hot-toast";
import { useShallow } from "zustand/react/shallow";

export default function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [status, setStatus] = useState("Parsing login…");

  const { session, userProfile, loadingProfile, setSession } = useAppStore(
    useShallow((s) => ({
      session: s.session,
      setSession: s.setSession,
      userProfile: s.userProfile,
      loadingProfile: s.loadingProfile,
    }))
  );

  const handledSession = useRef(false);
  const byMagicLink = useRef(false);
  const next = searchParams.get("next");

  // Fallback manual setSession (if Supabase helpers didn't auto-initialize session)
  useEffect(() => {
    const tryManualSession = async () => {
      if (
        handledSession.current || // already ran once
        session || // session already exists
        typeof window === "undefined" ||
        !window.location.hash.includes("access_token")
      ) {
        return;
      }

      handledSession.current = true;

      const hash = window.location.hash;
      if (hash.includes("access_token")) {
        const params = new URLSearchParams(hash.slice(1));
        const access_token = params.get("access_token");
        const refresh_token = params.get("refresh_token");

        if (!access_token || !refresh_token) {
          toast.error("Invalid or expired magic link.");
          return router.replace("/auth/login");
        }

        byMagicLink.current = true;
        setStatus("Finalizing login…");

        const { error } = await supabase.auth.setSession({ access_token, refresh_token });
        if (error) {
          toast.error("Login failed: " + error.message);
          return router.replace("/auth/login");
        }

        // Clean URL
        window.history.replaceState({}, "", window.location.pathname + window.location.search);
      }
    };

    void tryManualSession();
  }, [router]);

  // Redirect once session + profile are loaded
  useEffect(() => {
    if (!session || loadingProfile) return;

    if (!userProfile) {
      toast.error("No user profile found.");
      return router.replace("/auth/login");
    }

    const redirectTo = () => {
      const destination =
        next && decodeURIComponent(next).startsWith("/") ? decodeURIComponent(next) : "/";
      router.replace(destination);
    };

    // Optional invite accept
    const maybeAcceptInvite = async () => {
      try {
        const token = (await supabase.auth.getSession()).data.session?.access_token;
        if (byMagicLink.current && token) {
          await fetch("/api/accept-admin-invite", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
        }
      } catch (err) {
        console.error("Invite update failed", err);
      }
    };

    maybeAcceptInvite().finally(() => redirectTo());
  }, [session, loadingProfile, userProfile, next, router]);

  return (
    <p className="mt-20 text-center text-gray-500">
      {loadingProfile || !session ? status : "Redirecting…"}
    </p>
  );
}

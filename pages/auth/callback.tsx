"use client";

import { useEffect } from "react";
import { useRouter } from "next/router";
import toast from "react-hot-toast";
import useRedirectToChat from "@/hooks/useRedirectToChat";
import { useAppStore } from "@/state";
import { useSearchParams } from "next/navigation";
import { useShallow } from "zustand/react/shallow";

export default function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const next = searchParams.get("next"); // preserve deep redirect

  const { redirectToChat } = useRedirectToChat();
  const { session, userProfile, loadingProfile } = useAppStore(
    useShallow((s) => ({
      session: s.session,
      userProfile: s.userProfile,
      loadingProfile: s.loadingProfile,
    }))
  );

  useEffect(() => {
    let cancelled = false;

    const finalize = async () => {
      if (error) {
        const errorDesc = searchParams.get("error_description");
        toast.error(`Authentication failed - ${decodeURIComponent(errorDesc || error)} `);
        return router.replace("/auth/login");
      }

      if (loadingProfile) return; // Wait until session logic settles
      if (!session) {
        toast.error("Authentication failed.");
        return router.replace("/auth/login");
      }

      if (!userProfile) {
        toast.error("No user profile found.");
        return router.replace("/auth/login");
      }

      if (cancelled) return;

      const role = userProfile?.role || "user";

      if (next) {
        const decodedNext = decodeURIComponent(next);
        return router.replace(decodedNext);
      }

      if (role === "therapist") {
        return router.replace("/dashboard/therapist");
      }

      redirectToChat();
    };

    finalize();
    return () => {
      cancelled = true;
    };
  }, [loadingProfile, session, userProfile, error, next, router, redirectToChat]);

  return (
    <p className="mt-20 text-center text-gray-500">
      {loadingProfile ? "Logging you in…" : "Redirecting…"}
    </p>
  );
}

"use client";

import { supabaseBrowserClient } from "@/libs/supabase";
import { useAppStore } from "@/state";
import { useRouter } from "next/router";
import { useShallow } from "zustand/react/shallow";

export default function LogoutButton() {
  const { session, setSession } = useAppStore(
    useShallow((s) => ({
      session: s.session,
      setSession: s.setSession,
    }))
  );

  const router = useRouter();
  const setUserProfile = useAppStore((s) => s.setUserProfile);

  const logout = async () => {
    await supabaseBrowserClient.auth.signOut();
    setSession(null);
    setUserProfile(null);
    router.replace("/auth/login");
  };

  if (!session) return null;

  return (
    <button onClick={logout} className="text-sm text-red-500 underline">
      Logout
    </button>
  );
}

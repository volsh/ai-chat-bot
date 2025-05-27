"use client";

import { useSetSession } from "@/context/SessionContext";
import { supabaseBrowserClient } from "@/libs/supabase";
import { useRouter } from "next/router";

export default function LogoutButton() {
  const setSession = useSetSession();
  const router = useRouter();

  const logout = async () => {
    await supabaseBrowserClient.auth.signOut();
    setSession(null); // clear local session context
    router.push("/login"); // redirect
  };

  return (
    <button onClick={logout} className="text-sm text-red-500 underline">
      Logout
    </button>
  );
}

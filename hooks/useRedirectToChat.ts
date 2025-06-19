import { supabaseBrowserClient as supabase } from "@/libs/supabase";
import { useAppStore } from "@/state";
import { useRouter } from "next/router";
import { useCallback } from "react";
import toast from "react-hot-toast";
import { useShallow } from "zustand/react/shallow";

export default function useRedirectToChat() {
  const router = useRouter();
  const { session } = useAppStore(
    useShallow((s) => ({
      session: s.session,
    }))
  );
  const redirectToChat = useCallback(async () => {
    if (!session?.user?.id) return;
    // Try to find the user's most recent session
    const { data: sessions, error: fetchError } = await supabase
      .from("sessions")
      .select("id")
      .eq("user_id", session?.user?.id || "")
      .order("created_at", { ascending: false })
      .limit(1);
    if (fetchError) {
      console.error("Session fetch error", fetchError);
      toast.error("Could not fetch sessions");
    }

    if (sessions?.length) {
      return router.replace(`/chat/${sessions[0].id}`);
    }

    // Otherwise, create new
    const { data: newSession, error: createError } = await supabase
      .from("sessions")
      .insert({ user_id: session?.user.id })
      .select("id")
      .single();

    if (createError || !newSession?.id) {
      toast.error("Failed to create new session");
      return router.replace("/auth/login");
    }
    return router.replace(`/chat/${newSession.id}`);
  }, [session]);
  return { redirectToChat };
}

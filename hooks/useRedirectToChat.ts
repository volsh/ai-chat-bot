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
    const userId = session?.user?.id;
    if (!userId) {
      console.warn("No user ID available. Skipping fetch for latest session.");
      return null;
    }

    // Try to find the user's most recent session via treatments
    const { data: latestSession, error: fetchError } = await supabase
      .from("sessions")
      .select("id, treatments!inner(user_id)") // Join treatments
      .eq("treatments.user_id", userId) // Filter by user_id
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (fetchError) {
      console.error("Session fetch error", fetchError);
      toast.error("Could not fetch sessions");
    }

    if (latestSession) {
      return router.replace(`/chat/${latestSession.id}`);
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

import { useCallback, useEffect } from "react";
import { supabaseBrowserClient as supabase } from "@/libs/supabase";
import { useAppStore } from "@/state";
import { useShallow } from "zustand/react/shallow";
import { useRouter } from "next/router";

export function useUserProfileSubscription() {
  const { setUserProfile, userProfile, setLoadingProfile, session } = useAppStore(
    useShallow((s) => ({
      userProfile: s.userProfile,
      setUserProfile: s.setUserProfile,
      setLoadingProfile: s.setLoadingProfile,
      session: s.session,
    }))
  );
  const router = useRouter();
  const userId = session?.user.id;

  const loadUserProfile = useCallback(async () => {
    if (!userId || userProfile || router.pathname.startsWith("/auth/login")) {
      return;
    }
    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    if (profile) {
      setUserProfile(profile);
      setLoadingProfile(false);
    } else {
      setTimeout(() => loadUserProfile(), 1500); // try again
    }
  }, [userId, userProfile, router]);
  useEffect(() => {
    loadUserProfile();
  }, [loadUserProfile]);
}

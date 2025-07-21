import { createContext, useContext, useEffect } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabaseBrowserClient } from "@/libs/supabase";
import { useAppStore } from "@/state";

export const SessionContext = createContext<Session | null>(null);
const SessionUpdateContext = createContext<(session: Session | null) => void>(() => {});

export const SessionProvider = ({
  children,
  initialSession,
}: {
  children: React.ReactNode;
  initialSession?: Session;
}) => {
  const { session, setSession, setLoadingProfile } = useAppStore();

  useEffect(() => {
    let mounted = true;

    // Always check current session on mount (cookie-based or memory)
    supabaseBrowserClient.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      if (error) {
        console.warn("Failed to get session", error);
        return;
      }
      if (data.session) {
        setSession(data.session);
      } else {
        setSession(null); // explicitly clear
      }
    });

    // Subscribe to login/logout/token refresh events
    const { data: listener } = supabaseBrowserClient.auth.onAuthStateChange(
      (_event, newSession) => {
        if (_event === "SIGNED_OUT") {
          setSession(null);
          setLoadingProfile(false);
        } else if (_event === "SIGNED_IN" || _event === "TOKEN_REFRESHED") {
          setSession(newSession ?? null);
        }
      }
    );

    return () => {
      mounted = false;
      listener?.subscription?.unsubscribe?.();
    };
  }, [setSession, setLoadingProfile]);

  return (
    <SessionContext.Provider value={session}>
      <SessionUpdateContext.Provider value={setSession}>{children}</SessionUpdateContext.Provider>
    </SessionContext.Provider>
  );
};

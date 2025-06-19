import { createContext, useContext, useEffect, useState } from "react";
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
    // Try to load session immediately (may be null)
    if (!session) {
      supabaseBrowserClient.auth.getSession().then(({ data }) => {
        if (data?.session) {
          setSession(data.session);
        }
      });
    }

    // Ensure we respond to login/logout events
    const { data: listener } = supabaseBrowserClient.auth.onAuthStateChange(
      (_event, localSession) => {
        if (_event === "SIGNED_OUT") {
          setLoadingProfile(false);
          return;
        }
        if (session) return;
        if (localSession) {
          setSession(localSession);
          return;
        }
        if (_event === "SIGNED_IN" && !localSession) {
          setLoadingProfile(false); // can't load profile, set the loading state to false so main navgiator will redirect to login page
          return;
        }
      }
    );

    return () => {
      listener?.subscription?.unsubscribe?.();
    };
  }, []);

  return (
    <SessionContext.Provider value={session}>
      <SessionUpdateContext.Provider value={setSession}>{children}</SessionUpdateContext.Provider>
    </SessionContext.Provider>
  );
};

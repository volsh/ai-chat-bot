import { createContext, useContext, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabaseBrowserClient } from "@/libs/supabase";

const SessionContext = createContext<Session | null>(null);
const SessionUpdateContext = createContext<(session: Session | null) => void>(() => {});

export const useSession = () => useContext(SessionContext);
export const useSetSession = () => useContext(SessionUpdateContext);

export const SessionProvider = ({
  children,
  initialSession,
}: {
  children: React.ReactNode;
  initialSession?: Session;
}) => {
  const [session, setSession] = useState<Session | null>(initialSession ?? null);

  // Optional fallback: try to rehydrate from Supabase client
  useEffect(() => {
    if (!session) {
      supabaseBrowserClient.auth.getSession().then(({ data }) => {
        if (data.session) setSession(data.session);
      });
    }
  }, [session]);

  return (
    <SessionContext.Provider value={session}>
      <SessionUpdateContext.Provider value={setSession}>{children}</SessionUpdateContext.Provider>
    </SessionContext.Provider>
  );
};

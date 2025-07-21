import { useEffect, useRef, useState } from "react";
import { supabaseBrowserClient as supabase } from "@/libs/supabase";
import { useAppStore } from "@/state";
import { EmotionLog } from "@/types";

type ChangeCallback = {
  onNewMessage?: (m: any) => void;
  onUpdateMessage?: (m: any) => void;
  onNewLog?: (log: EmotionLog) => void;
};

export function useRealtimeSessionData(sessionId: string, callbacks: ChangeCallback) {
  const { userProfile } = useAppStore();
  const isTherapist = userProfile?.role === "therapist";

  const [isReady, setIsReady] = useState(false);
  const readyPromiseRef = useRef<Promise<void> | null>(null);
  const resolveReadyRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    const channel = supabase.channel(`session:${sessionId}`);

    // Reset state
    setIsReady(false);
    readyPromiseRef.current = new Promise<void>((resolve) => {
      resolveReadyRef.current = resolve;
    });

    channel
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          if (isTherapist) {
            console.log("payload.new", payload.new);
            callbacks.onNewMessage?.(payload.new);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          if (isTherapist) {
            callbacks.onUpdateMessage?.(payload.new);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "emotion_logs",
          filter: `source_type=eq.session`,
        },
        (payload) => {
          const log = payload.new as EmotionLog;
          if (isTherapist) {
            callbacks.onNewLog?.(log);
          }
        }
      );

    // ✅ This ensures Realtime is fully active before write
    channel.subscribe((status, err) => {
      if (status === "SUBSCRIBED") {
        setIsReady(true);
        resolveReadyRef.current?.();
      } else if (status === "CHANNEL_ERROR") {
        console.error("Subscription failed", err);
      }
    });

    return () => {
      supabase.removeChannel(channel);
      setIsReady(false);
    };
  }, [sessionId]);

  return {
    isReady,
    waitUntilReady: () => readyPromiseRef.current ?? Promise.resolve(),
  };
}

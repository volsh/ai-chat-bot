import { useEffect, useRef, useState } from "react";
import { supabaseBrowserClient as supabase } from "@/libs/supabase";
import { useAppStore } from "@/state";
import { useShallow } from "zustand/react/shallow";

export type PresenceMetaData = {
  id?: string;
  typing?: boolean;
  name?: string;
  avatar?: string;
  activity?: string;
};

export function usePresenceChannel(sessionId?: string, userId?: string) {
  const [othersTyping, setOthersTyping] = useState<PresenceMetaData[]>([]);
  const presenceChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const { session } = useAppStore(
    useShallow((s) => ({
      session: s.session,
    }))
  );
  useEffect(() => {
    if (!sessionId || !userId) return;

    const channel = supabase.channel(`presence:chat-${sessionId}`, {
      config: { presence: { key: userId } },
    });
    presenceChannelRef.current = channel;

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({
          typing: false,
          name: session?.user.user_metadata.full_name ?? "Anonymous",
          avatar: session?.user.user_metadata.avatar_url ?? "",
          activity: "Idle",
        });
      }
    });

    const updateTypingState = () => {
      const state = channel.presenceState() as Record<string, PresenceMetaData[]>;

      const others = Object.entries(state || {})
        .filter(([id, users]) => id !== userId && users.some((u) => u.typing))
        .map(([id, users]) => ({
          id,
          name: users[0].name ?? "Anonymous",
          activity: users[0].activity ?? "Active",
          avatar: users[0].avatar ?? "",
        })) as PresenceMetaData[];

      setOthersTyping(others); // now an array of rich user objects
    };

    channel.on("presence", { event: "sync" }, updateTypingState);

    return () => {
      supabase.removeChannel(channel);
      presenceChannelRef.current = null;
    };
  }, [sessionId, userId, session]);

  const setTyping = (typing: boolean) => {
    if (presenceChannelRef.current) {
      presenceChannelRef.current.track({ typing, activity: typing ? "Typing…" : "Idle" });
    }
  };

  return { othersTyping, setTyping };
}

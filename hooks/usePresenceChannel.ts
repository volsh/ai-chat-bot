import { useEffect, useRef, useState } from "react";
import { supabaseBrowserClient as supabase } from "@/libs/supabase";
import { useAppStore } from "@/state";
import { useShallow } from "zustand/react/shallow";
import { debounce } from "lodash";

export type PresenceMetaData = {
  id?: string;
  typing?: boolean;
  name?: string;
  avatar?: string;
  activity?: string;
};

export function usePresenceChannel(sessionId?: string, metaOverride?: Partial<PresenceMetaData>) {
  const [othersTyping, setOthersTyping] = useState<PresenceMetaData[]>([]);
  const [othersPresent, setOthersPresent] = useState<PresenceMetaData[]>([]);
  const presenceChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const currentMetadata = useRef<PresenceMetaData | null>(null);

  const { session } = useAppStore(
    useShallow((s) => ({
      session: s.session,
    }))
  );

  const userId = session?.user.id;

  useEffect(() => {
    if (!sessionId || !userId) return;

    const channel = supabase.channel(`presence:chat-${sessionId}`, {
      config: { presence: { key: userId } },
    });
    presenceChannelRef.current = channel;

    const subscribeAndTrack = async () => {
      const { data: userProfile } = await supabase
        .from("users")
        .select("full_name, avatar_url")
        .eq("id", userId)
        .single();

      const fullPresence: PresenceMetaData = {
        name: userProfile?.full_name ?? "Anonymous",
        avatar: userProfile?.avatar_url ?? "",
        activity: "Idle",
        typing: false,
        ...metaOverride,
      };

      currentMetadata.current = fullPresence;

      await channel.track(fullPresence);
    };

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        try {
          await subscribeAndTrack();
        } catch (err) {
          console.warn("Presence track failed:", err);
        }
      }
    });

    const updatePresenceState = debounce(() => {
      const state = channel.presenceState() as Record<string, PresenceMetaData[]>;

      const others = Object.entries(state || {}).filter(([id]) => id !== userId);

      const present = others.map(([id, users]) => ({
        id,
        name: users[0].name ?? "Anonymous",
        activity: users[0].activity ?? "Active",
        avatar: users[0].avatar ?? "",
      }));

      const typing = present.filter((u) => u.activity === "Typing…");

      setOthersPresent(present);
      setOthersTyping(typing);
    }, 100);

    channel.on("presence", { event: "sync" }, updatePresenceState);

    return () => {
      supabase.removeChannel(channel);
      presenceChannelRef.current = null;
    };
  }, [sessionId, userId, metaOverride]);

  const setTyping = (typing: boolean) => {
    if (!currentMetadata.current) return;

    const updated = {
      ...currentMetadata.current,
      typing,
      activity: typing ? "Typing…" : "Idle",
    };

    currentMetadata.current = updated;
    presenceChannelRef.current?.track(updated);
  };

  return {
    othersTyping,
    othersPresent,
    isAnyoneTyping: othersTyping.length > 0,
    isAnyoneOnline: othersPresent.length > 0,
    setTyping,
  };
}

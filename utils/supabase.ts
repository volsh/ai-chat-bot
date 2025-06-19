// utils/supabase.ts

import { supabaseBrowserClient as supabase } from "@/libs/supabase";
import { Emotion, Message, MessageWithEmotion, Session } from "@/types";
import { format } from "date-fns";

export async function loadSession(sessionId: string): Promise<Session> {
  const { data, error } = await supabase.from("sessions").select().eq("id", sessionId).single();

  if (error) {
    console.warn("Failed to load session:", error);
    throw error;
  }

  return data;
}

export async function saveMessageToSupabase(
  sessionId: string,
  msg: Partial<Message>
): Promise<Message> {
  const { data, error } = await supabase
    .from("messages")
    .insert([{ session_id: sessionId, role: msg.role, content: msg.content }])
    .select("*")
    .single();
  if (error) {
    console.error("Failed to save message:", error);
    throw new Error(error.message || "Failed to save message");
  }

  return {
    ...data,
    message_created_at: data.created_at,
    source_id: data.id,
    source_type: "session",
  };
}

export async function loadSessionMessages(sessionId: string): Promise<MessageWithEmotion[]> {
  const { data, error } = await supabase
    .from("v_session_messages_with_emotions")
    .select("*")
    .eq("session_id", sessionId)
    .order("message_created_at", { ascending: true });

  if (error) {
    console.warn("Failed to load messages:", error);
    throw error;
  }

  return data;
}

export async function updateSessionTitle(sessionId: string, firstMessage: string) {
  const res = await fetch("/api/summarize-title", {
    method: "POST",
    body: JSON.stringify({ messages: [{ role: "user", content: firstMessage }] }),
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    console.warn("Failed to summarize session title");
  }

  const { title } = await res.json();
  const fallbackTitle = `Chat – ${format(new Date(), "MMM d")}`;
  const { data, error } = await supabase
    .from("sessions")
    .update([{ title: title || fallbackTitle }])
    .eq("id", sessionId)
    .select()
    .single();

  if (error) {
    console.error("Failed to create session:", error);
    return null;
  }

  return data?.title;
}

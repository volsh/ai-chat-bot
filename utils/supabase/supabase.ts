import { supabaseBrowserClient } from "@/libs/supabase";
import { Message } from "@/types";

export async function saveMessageToSupabase(sessionId: string, msg: Message) {
  await supabaseBrowserClient.from("messages").insert([
    {
      session_id: sessionId,
      ...msg,
    },
  ]);
}

export async function loadSessionMessages(sessionId: string): Promise<Message[]> {
  const { data } = await supabaseBrowserClient
    .from("messages")
    .select("role, content, created_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  return data || [];
}

export async function createSessionWithTitle(userId: string, firstMessage: string) {
  const res = await fetch("/api/summarize-title", {
    method: "POST",
    body: JSON.stringify({ message: firstMessage }),
    headers: { "Content-Type": "application/json" },
  });

  const { title } = await res.json();

  const { data } = await supabaseBrowserClient
    .from("sessions")
    .insert([{ user_id: userId, title }])
    .select()
    .single();

  return data?.id;
}

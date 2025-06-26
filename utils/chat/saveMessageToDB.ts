import { supabaseBrowserClient } from "@/libs/supabase";
import { Message } from "@/types";

export default async function saveMessageToDB(
  sessionId: string,
  msg: Partial<Message>
): Promise<Message> {
  const { data, error } = await supabaseBrowserClient
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

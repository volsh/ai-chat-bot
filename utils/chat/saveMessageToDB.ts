import { supabaseBrowserClient } from "@/libs/supabase";
import { Message, MessageWithEmotion } from "@/types";

export const convertMessageToMessageWithEmotion = (message: Message): MessageWithEmotion => ({
  ...message,
  message_created_at: message.created_at,
  source_id: message.id,
  source_type: "session",
  message_role: message.role,
});

export default async function saveMessageToDB(
  sessionId: string,
  msg: Partial<Message>
): Promise<MessageWithEmotion> {
  const { data, error } = await supabaseBrowserClient
    .from("messages")
    .insert([{ session_id: sessionId, role: msg.role, content: msg.content }])
    .select("*")
    .single();
  if (error) {
    console.error("Failed to save message:", error);
    throw new Error(error.message || "Failed to save message");
  }

  return convertMessageToMessageWithEmotion(data);
}

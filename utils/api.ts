import { Message } from "@/types";

export async function sendChatMessage(sessionId: string, messagesOverride?: Message[]) {
  const messagesToSend = messagesOverride ?? [];

  const res = await fetch("/api/chat", {
    method: "POST",
    body: JSON.stringify({ session_id: sessionId, messages: messagesToSend }),
    headers: { "Content-Type": "application/json" },
  });

  return await res.json(); // should return { message: { role, content } }
}

import { Message, MessageWithEmotion } from "@/types";

export async function sendChatMessage(goal: string, messagesOverride?: MessageWithEmotion[]) {
  const messagesToSend = messagesOverride ?? [];

  const res = await fetch("/api/chat", {
    method: "POST",
    body: JSON.stringify({ messages: messagesToSend, goal }),
    headers: { "Content-Type": "application/json" },
  });

  return await res.json(); // should return { message: { role, content } }
}

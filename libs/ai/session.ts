import { openai } from "@/libs/ai/client";
import { ChatCompletionMessageParam } from "openai/resources";
import { Message } from "@/types";

export async function generateSessionSummary(messages: Message[]): Promise<string> {
  const prompt: ChatCompletionMessageParam[] = [
    {
      role: "system",
      content:
        "Summarize this chat in 1–2 sentences. The user is seeking help or having a conversation with an assistant.",
    },
    ...messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .slice(-10) // use last 10 exchanges for context
      .map((m) => ({ role: m.role, content: m.content })),
  ];

  const response = await openai.chat.completions.create({
    model: "gpt-4-1106-preview",
    messages: prompt,
    temperature: 0.5,
  });
  return response.choices[0].message.content ?? "";
}

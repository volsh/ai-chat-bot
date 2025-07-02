import type { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";
import { MessageWithEmotion } from "@/types"; // adjust if needed

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { messages, goal } = req.body;

  if (!Array.isArray(messages) || typeof goal !== "string") {
    return res.status(400).json({ error: "Invalid input format" });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      temperature: 0.4,
      messages: [
        {
          role: "system",
          content: `You are a therapist assistant helping a user based on the treatment goal: "${goal}". Respond thoughtfully and empathetically, keeping this goal in mind.`,
        },
        ...messages.map((m: MessageWithEmotion) => ({
          content: m.content,
          role: m.message_role || m.role || "user",
        })),
      ],
    });

    res.status(200).json({ message: completion.choices[0].message });
  } catch (e: any) {
    if (e?.code === "insufficient_quota") {
      return res.status(429).json({ error: "Quota exceeded. Try again later." });
    }
    console.error("OpenAI error:", e);
    return res.status(500).json({ error: "Failed to generate message" });
  }
}

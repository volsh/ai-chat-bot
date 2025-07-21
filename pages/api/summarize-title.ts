// pages/api/summarize-title.ts
import type { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Invalid messages array" });
  }

  try {
    const { choices } = await openai.chat.completions.create({
      model: "gpt-4-1106-preview",
      messages: [
        { role: "system", content: "Summarize the conversation in one short sentence." },
        ...messages.map((m) => ({ role: m.role || m.message_role, content: m.content })),
      ],
      temperature: 0.3,
    });

    const title = choices?.[0]?.message?.content?.trim();
    res.status(200).json({ title });
  } catch (err) {
    if (!!err && typeof err === "object" && "code" in err && err.code === "insufficient_quota") {
      return res.status(429).json({ error: "Quota exceeded. Try again later." });
    }
    console.error("OpenAI summary error:", err);
    res.status(500).json({ error: "Failed to generate summary" });
  }
}

import { openai } from "@/libs/ai/client";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { message } = req.body;

  const summary = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      { role: "system", content: "Summarize this message in 3–5 words as a session title." },
      { role: "user", content: message },
    ],
  });

  const title = summary?.choices?.[0]?.message?.content?.trim().replace(/[".]/g, "") ?? "New Chat";
  res.status(200).json({ title });
}

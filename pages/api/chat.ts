import type { NextApiRequest, NextApiResponse } from "next";
import { openai } from "@/utils/ai/client";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { messages } = await req.body;

  const completion = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages,
  });
  try {
    res.status(200).json({ message: completion.choices[0].message });
  } catch (e) {
    if (!!e && typeof e === "object" && "code" in e && e.code === "insufficient_quota") {
      return res.status(429).json({ error: "Quota exceeded. Try again later." });
    }
    return res.status(500).json({ error: "Failed to generate message" });
  }
}

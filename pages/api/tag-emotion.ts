import { openai } from "@/libs/ai/client";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { content, message_id, session_id } = req.body;

  const prompt = `Analyze the emotional tone of this message and return a JSON like:
{
  "emotion": "anxious",
  "intensity": 0.8
}
Message: """${content}"""`;

  const completion = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: prompt }],
  });

  const json = JSON.parse(completion.choices[0].message.content || "{}");

  if (json?.emotion) {
    await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/emotion_logs`, {
      method: "POST",
      headers: {
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        emotion: json.emotion,
        intensity: json.intensity || 0.5,
        message_id,
        session_id,
      }),
    });
  }

  res.status(200).json(json);
}

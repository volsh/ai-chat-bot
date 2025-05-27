import { NextApiRequest, NextApiResponse } from "next";
import { openai } from "@/libs/ai/client";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { messages } = await req.body;

  const completion = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages,
  });
  res.status(200).json({ message: completion.choices[0].message });
}

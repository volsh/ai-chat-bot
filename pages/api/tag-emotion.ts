import { createSupabaseServerClient } from "@/libs/supabase";
import { openai } from "@/utils/ai/client";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { content, source_id, role } = req.body;

    if (!content || !source_id) {
      console.warn("Missing fields:", { content, source_id });
      return res.status(400).json({ error: "Missing fields" });
    }

    const prompt = `Analyze the emotional tone of this message and return a JSON like:
    {
      "emotion": "anxious",
      "intensity": 0.8,
      "tone": "negative",
      "topic": "relationships"
    }
    Message: """${content}"""`;

    console.log("🧠 Sending to OpenAI...");
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
    });

    const raw = completion.choices?.[0]?.message?.content;
    console.log("🧠 OpenAI raw response:", raw);

    let json;
    try {
      json = JSON.parse(raw || "{}");
    } catch (e) {
      console.error("❌ Failed to parse AI response:", raw);
      return res.status(500).json({ error: "Invalid AI response format" });
    }

    if (!json?.emotion) {
      console.warn("❌ Missing emotion field in OpenAI response:", json);
      return res.status(400).json({ error: "No emotion detected" });
    }

    const supabase = createSupabaseServerClient(req, res);

    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user
    const payload = {
      emotion: json.emotion,
      intensity: json.intensity || 0.5,
      tone: json.tone || "Neutral",
      topic: json.topic || "Unknown",
      source_type: "session", // for now
      source_id,
      user_id: role === "user" && user?.id ? user?.id : null,
    };

    console.log("📥 Inserting to Supabase:", payload);

    const { data, error } = await supabase.from("emotion_logs").insert(payload).select().single();

    if (error) {
      console.error("❌ Supabase insert failed:", error);
      return res.status(500).json({ error: "Supabase insert failed" });
    }

    console.log("✅ Tag saved:", data);
    return res.status(200).json(data);
  } catch (err: any) {
    console.error("❌ Tag-emotion handler crashed:", err);
    return res.status(500).json({ error: "Internal server error", detail: err?.message });
  }
}

import { createSupabaseServerClient } from "@/libs/supabase";
import { openai } from "@/utils/ai/client";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { content, sessionGoal, source_id, role } = req.body;

    if (!content || !source_id) {
      console.warn("Missing fields:", { content, source_id });
      return res.status(400).json({ error: "Missing fields" });
    }

    const prompt = `You are analyzing a message within a therapy session. 

The session has a specific goal:
${sessionGoal}

For the message below:
- Identify its emotional characteristics regardless of the goal.
- Then assess its alignment with the session goal:
  - aligned_with_goal: true if the content supports or relates to the goal, false if it does not.
  - alignment_score: A number between 0 and 1 indicating how well this message relates to the goal.
    (1 = fully aligned, 0.5 = partially aligned, 0 = not aligned)

Return a JSON in this exact format:
{
  "emotion": "string",
  "intensity": 0.0,
  "tone": "positive|negative|neutral",
  "topic": "string",
  "aligned_with_goal": true|false,
  "alignment_score": 0.0
}

Message:
"""${content}"""
`;

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
    const user = userData.user;
    const payload = {
      emotion: json.emotion,
      intensity: json.intensity || 0.5,
      tone: json.tone || "Neutral",
      topic: json.topic || "Unknown",
      aligned_with_goal: json.aligned_with_goal,
      alignment_score: json.alignment_score,
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
    const { emotion, intensity, tone } = data;
    if (intensity >= 0.8 && tone === "negative") {
      const { error: funcError } = await supabase.functions.invoke("notify-high-risk", {
        body: {
          emotion,
          intensity,
          tone,
          messageId: source_id,
          link: `${process.env.NEXT_PUBLIC_SITE_URL}/chat`,
        },
      });

      if (funcError) {
        console.error("Edge function notify-high-risk error:", funcError);
        // return res.status(500).json({ error: `Failed to notify high risk ${funcError}` });
      }
    }

    console.log("✅ Tag saved:", data);
    return res.status(200).json(data);
  } catch (err: any) {
    console.error("❌ Tag-emotion handler crashed:", err);
    return res.status(500).json({ error: "Internal server error", detail: err?.message });
  }
}

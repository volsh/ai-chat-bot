import { createSupabaseServerClient } from "@/libs/supabase";
import { MessageWithGoal } from "@/types";
import { openai } from "@/utils/ai/client";
import { PostgrestError } from "@supabase/supabase-js";
import type { NextApiRequest, NextApiResponse } from "next";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { source_id } = req.body;
    if (!source_id) {
      return res.status(400).json({ error: "Missing source_id (message ID)" });
    }

    const supabase = createSupabaseServerClient(req, res);

    // 1️⃣ Load message with session_id, content, role, and goal (via session → treatment → goal)
    const { data: message, error: messageError } = (await supabase
      .from("messages")
      .select(
        `
        id,
        content,
        role,
        session_id,
        sessions (
          id,
          treatment_id,
          treatments (
            goal_id,
            goals (
              title
            )
          )
        )
        `
      )
      .eq("id", source_id)
      .single()) as unknown as { data: MessageWithGoal; error: PostgrestError };

    if (messageError || !message) {
      console.error("❌ Failed to fetch message:", messageError);
      return res.status(404).json({ error: "Failed to fetch message" });
    }

    const session_id = message.session_id;
    const goal = message.sessions?.treatments?.goals?.title || "Unknown goal";
    const role = message.role;

    // 2️⃣ Load last 6 messages for context
    const { data: recentMessages, error: contextError } = await supabase
      .from("messages")
      .select("role, content")
      .eq("session_id", session_id)
      .order("created_at", { ascending: false })
      .limit(6);

    if (contextError) {
      console.error("❌ Failed to load context:", contextError);
      return res.status(500).json({ error: "Failed to load session context" });
    }

    const contextMessages = (recentMessages || []).reverse(); // Oldest first

    // 3️⃣ Compose OpenAI prompt
    const systemPrompt = `You are analyzing the emotional and goal alignment aspects of a therapy session message. 
The session goal is: "${goal}".

Evaluate the last message based on both its emotion and how it relates to the session goal.`;

    const openaiMessages = [
      { role: "system", content: systemPrompt },
      ...contextMessages.map((m) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.content,
      })),
      {
        role: "user",
        content: `Now analyze ONLY the most recent message and return a JSON in this format:

{
  "emotion": "string",
  "intensity": 0.0,
  "tone": "positive|negative|neutral",
  "topic": "string",
  "goal_alignment_score": 0.0
}`,
      },
    ] as ChatCompletionMessageParam[];

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: openaiMessages,
    });

    const raw = completion.choices?.[0]?.message?.content;
    console.log("🧠 OpenAI raw response:", raw);

    let json;
    try {
      json = JSON.parse(raw || "{}");
    } catch {
      return res.status(500).json({ error: "Invalid AI response format", raw });
    }

    if (!json?.emotion) {
      return res.status(400).json({ error: "No emotion detected", raw });
    }

    // 4️⃣ Insert emotion tag
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;

    const payload = {
      emotion: json.emotion,
      intensity: json.intensity ?? 0.5,
      tone: json.tone ?? "neutral",
      topic: json.topic ?? "Unknown",
      alignment_score: json.goal_alignment_score,
      source_type: "session",
      source_id,
      user_id: role === "user" && user?.id ? user.id : null,
    };

    const { data, error } = await supabase.from("emotion_logs").insert(payload).select().single();
    if (error) {
      console.error("❌ Supabase insert failed:", error);
      return res.status(500).json({ error: "Supabase insert failed" });
    }

    // 5️⃣ Trigger high-risk alert if needed
    const { emotion, intensity, tone } = data;
    if (intensity >= 0.8 && tone === "negative" && role === "user") {
      const { error: funcError } = await supabase.functions.invoke("notify-high-risk", {
        body: {
          emotion,
          intensity,
          tone,
          role,
          messageId: source_id,
          link: `${process.env.NEXT_PUBLIC_SITE_URL}/chat`,
        },
      });
      if (funcError) {
        console.error("❌ notify-high-risk failed:", funcError);
      }
    }

    return res.status(200).json(data);
  } catch (err: any) {
    console.error("❌ Emotion tag error:", err);
    return res.status(500).json({ error: "Internal error", detail: err?.message });
  }
}

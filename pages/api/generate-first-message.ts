import type { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";
import { createSupabaseServerClient } from "@/libs/supabase";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { Message, SessionWithGoal } from "@/types";
import { PostgrestError } from "@supabase/supabase-js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { sessionId } = req.body;
  if (!sessionId) {
    return res.status(400).json({ error: "Missing session ID" });
  }

  const supabase = createSupabaseServerClient(req, res);

  // 1. Fetch session, treatment, and goal
  const { data: sessionData, error: sessionError } = (await supabase
    .from("sessions")
    .select(
      `
      id,
      treatment_id,
      created_at,
      treatments (
        id,
        goal_id,
        goals (
          title
        )
      ),
      messages(count)
    `
    )
    .eq("id", sessionId)
    .single()) as unknown as {
    data: SessionWithGoal & { messages: Message & { count: number }[] };
    error: PostgrestError;
  };

  if (sessionError || !sessionData) {
    return res.status(500).json({ error: "Session not found" });
  }

  const goalTitle = sessionData.treatments?.goals?.title;
  const treatmentId = sessionData.treatment_id;
  const messageCount = sessionData.messages?.[0]?.count || 0;

  // 2. If already has messages, skip
  if (messageCount > 0) {
    return res.status(200).json({ message: "Session already started" });
  }

  // 3. Find session number (its position within treatment)
  const { data: allSessions, error: treatmentError } = await supabase
    .from("sessions")
    .select("id, created_at")
    .eq("treatment_id", treatmentId)
    .order("created_at", { ascending: true });

  if (treatmentError || !allSessions?.length) {
    return res.status(500).json({ error: "Failed to load treatment sessions" });
  }

  const sessionIndex = allSessions.findIndex((s) => s.id === sessionId);
  const sessionNumber = sessionIndex >= 0 ? sessionIndex + 1 : 1;

  // 4. Fetch last 2–3 messages from previous sessions in treatment
  const previousSessionIds = allSessions
    .slice(0, sessionIndex)
    .map((s) => s.id)
    .filter(Boolean);

  let previousMessages: { role: string; content: string }[] = [];

  if (previousSessionIds.length > 0) {
    const { data: pastMessages } = await supabase
      .from("messages")
      .select("content, role, created_at")
      .in("session_id", previousSessionIds)
      .order("created_at", { ascending: false })
      .limit(2);

    if (pastMessages?.length) {
      previousMessages = pastMessages
        .reverse() // earliest first
        .map((m) => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: m.content,
        }));
    }
  }

  // 5. Generate message from OpenAI
  try {
    const promptMessages = [
      {
        role: "system",
        content: `You are a compassionate AI therapist preparing a message to start a therapy session. The user is working toward a specific goal in their treatment plan. Based on the treatment goal and current session number, generate an encouraging, relevant first message that sets a safe and welcoming tone. If past conversation context is available, reflect awareness of it.`,
      },
      {
        role: "user",
        content: `Goal: ${goalTitle}\nSession number: ${sessionNumber}`,
      },
      ...previousMessages,
    ] as ChatCompletionMessageParam[];

    const response = await openai.chat.completions.create({
      model: "gpt-4-1106-preview",
      temperature: 0.3,
      messages: promptMessages,
    });

    const message = response.choices?.[0]?.message?.content?.trim();
    if (!message) {
      return res.status(500).json({ error: "No message generated" });
    }

    return res.status(200).json({ message });
  } catch (err: any) {
    if (err?.code === "insufficient_quota") {
      return res.status(429).json({ error: "Quota exceeded. Try again later." });
    }
    console.error("OpenAI error in generate-first-message.ts:", err);
    return res.status(500).json({ error: "Failed to generate message" });
  }
}

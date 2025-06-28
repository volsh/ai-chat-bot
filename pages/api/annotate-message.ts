import type { NextApiRequest, NextApiResponse } from "next";
import { createSupabaseServerClient } from "@/libs/supabase";
import { z } from "zod";
import { annotateMessage } from "@/utils/ai/annotateMessage";

const schema = z.object({
  source_type: z.string().optional(),
  source_id: z.string(),
  corrected_emotion: z.string().optional(),
  corrected_tone: z.string().optional(),
  corrected_topic: z.string().optional(),
  corrected_intensity: z.number().optional(),
  corrected_alignment_score: z.number().optional(),
  note: z.string().optional(),
  flag_reason: z.string().optional(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const supabase = createSupabaseServerClient(req, res);
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;

  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid input",
      issues: parsed.error.flatten(),
    });
  }

  const {
    source_id,
    corrected_emotion,
    corrected_tone,
    corrected_topic,
    corrected_intensity,
    corrected_alignment_score,
    note,
    flag_reason,
  } = parsed.data;

  try {
    await annotateMessage({
      supabase,
      source_id,
      source_type: "session", // for now
      updated_by: user.id,
      corrected_emotion,
      corrected_tone,
      corrected_topic,
      corrected_intensity,
      corrected_alignment_score,
      flag_reason,
      note,
    });

    return res.status(200).json({ success: true });
  } catch (err: any) {
    console.error("Annotation failed", err);
    return res.status(500).json({ error: "Annotation failed" });
  }
}

// pages/api/save-summary.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createSupabaseServerClient } from "@/libs/supabase";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { sessionId, summary } = req.body;
  if (!sessionId || !summary) return res.status(400).json({ error: "Missing fields" });

  const supabase = createSupabaseServerClient(req, res);

  const { error } = await supabase.from("sessions").update({ summary }).eq("id", sessionId);

  if (error) return res.status(500).json({ error: error.message });
  res.status(200).json({ success: true });
}

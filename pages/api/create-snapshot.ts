// pages/api/create-snapshot.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createSupabaseServerClient } from "@/libs/supabase";
import { ExportFilterOptions } from "@/types";
import { v4 as uuidv4 } from "uuid";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const {
    name,
    version,
    filters,
  }: { name: string; version: string; filters: ExportFilterOptions } = req.body;

  if (!name || !version || !filters) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const supabase = createSupabaseServerClient(req, res);
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;

  if (!user) return res.status(401).json({ error: "Unauthorized" });

  try {
    const id = uuidv4();
    const { error } = await supabase.from("fine_tune_snapshots").insert({
      id,
      name,
      version,
      filters,
      user_id: user.id,
      job_status: "pending",
    });

    if (error) throw error;

    res.status(200).json({ success: true, id });
  } catch (err: any) {
    console.error("Create snapshot error", err);
    res.status(500).json({ error: err.message });
  }
}

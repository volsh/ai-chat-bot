// pages/api/export-fine-tune-preview.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createSupabaseServerClient } from "@/libs/supabase";
import { ExportFilterOptions } from "@/types";
import { buildFilteredTrainingQuery } from "@/utils/ai/buildFilteredTrainingQuery";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const supabase = createSupabaseServerClient(req, res);
  const filters: ExportFilterOptions = req.body;

  try {
    const query = buildFilteredTrainingQuery(supabase, filters);
    const { data, count, error } = await query;
    if (error) throw error;

    return res.status(200).json({
      annotations: data,
      total: count || 0,
    });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}

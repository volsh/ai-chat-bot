// pages/api/export-fine-tune-preview.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createSupabaseServerClient } from "@/libs/supabase";
import { ExportFilterOptions } from "@/types";
import { buildFilteredTrainingQuery } from "@/utils/ai/buildFilteredTrainingQuery";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const supabase = createSupabaseServerClient(req, res);
  const filters: ExportFilterOptions = req.body;
  console.log("filters", filters);
  try {
    const query = buildFilteredTrainingQuery(supabase, filters);
    const { data, count, error } = await query.select("*");
    if (error) throw error;

    const emotionSummary = Object.entries(
      (data || []).reduce(
        (acc: Record<string, { count: number; totalScore: number }>, row: any) => {
          const emotion = row.emotion || row.predicted_emotion || "unknown";
          if (!acc[emotion]) acc[emotion] = { count: 0, totalScore: 0 };
          acc[emotion].count++;
          acc[emotion].totalScore += row.score || 0;
          return acc;
        },
        {}
      )
    )
      .map(([emotion, { count, totalScore }]) => ({
        emotion,
        count,
        averageScore: totalScore / count,
      }))
      .sort((a, b) => b.count - a.count); // sort most common first

    return res.status(200).json({
      annotations: data,
      total: count || 0,
      summary: emotionSummary,
    });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}

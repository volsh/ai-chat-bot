// pages/api/export-training-csv.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createSupabaseServerClient } from "@/libs/supabase";
import { stringify } from "csv-stringify/sync";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = createSupabaseServerClient(req, res);
  const { data, error } = await supabase.from("v_emotion_training_data").select("*");

  if (error) return res.status(500).json({ error: error.message });

  const csv = stringify(data, {
    header: true,
    columns: [
      "source_type",
      "source_id",
      "message_id",
      "role",
      "content",
      "emotion",
      "tone",
      "intensity",
      "topic",
      "note",
      "tagged_at",
      "annotation_updated_at",
    ],
  });

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", 'attachment; filename="emotion_training_data.csv"');
  res.status(200).send(csv);
}

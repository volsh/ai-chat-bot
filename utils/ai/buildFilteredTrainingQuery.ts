import { createSupabaseServerClient } from "@/libs/supabase";
import { ExportFilterOptions } from "@/types";

export async function buildFilteredTrainingQuery(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  filters: ExportFilterOptions
) {
  let query = supabase.from("v_emotion_training_data").select("*", { count: "exact" });

  const { data: latestSnapshot } = await supabase
    .from("fine_tune_snapshots")
    .select("created_at")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (filters.users?.length) query = query.in("user_id", filters.users);
  if (filters.therapists?.length) query = query.in("therapist_id", filters.therapists);
  if (filters.sourceTypes?.length) query = query.in("source_type", filters.sourceTypes);
  if (filters.emotions?.length) query = query.in("emotion", filters.emotions);
  if (filters.tones?.length) query = query.in("tone", filters.tones);
  if (filters.topics?.length) query = query.in("topic", filters.topics);
  if (filters.intensity) query = query.gte("intensity", filters.intensity[0]);
  if (filters.intensity) query = query.lte("intensity", filters.intensity[1]);

  if (filters.includeCorrected)
    query = query.gte("annotation_updated_at", latestSnapshot?.created_at);
  if (filters.correctedBy) query = query.eq("annotation_updated_by", filters.correctedBy);
  if (filters.highRiskOnly)
    query = query.eq("severity", "high").or("tone.eq.negative,intensity.gte.0.8");
  if (filters.startDate) query = query.gte("tagged_at", filters.startDate);
  if (filters.endDate) query = query.lte("tagged_at", filters.endDate);
  if (filters.scoreCutoff !== undefined) query = query.gte("score", filters.scoreCutoff);

  query = query.order("score", { ascending: false });
  if (filters.topN) query = query.limit(filters.topN);

  return query;
}

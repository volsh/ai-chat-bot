import { createSupabaseServerClient } from "@/libs/supabase";
import { ExportFilterOptions } from "@/types";

export function buildFilteredTrainingQuery(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  filters: ExportFilterOptions
) {
  let query = supabase.from("v_emotion_training_data").select("*", { count: "exact" });

  if (filters.userId) query = query.eq("user_id", filters.userId);
  if (filters.therapistId) query = query.eq("therapist_id", filters.therapistId);
  if (filters.sourceTypes?.length) query = query.in("source_type", filters.sourceTypes);
  if (filters.emotions?.length) query = query.in("emotion", filters.emotions);
  if (filters.tones?.length) query = query.in("tone", filters.tones);
  if (filters.topics?.length) query = query.in("topic", filters.topics);
  if (filters.intensity) query = query.gte("intensity", filters.intensity[0]);
  if (filters.intensity) query = query.lte("intensity", filters.intensity[1]);

  if (filters.includeCorrected) query = query.not("annotation_updated_at", "is", null);
  if (filters.correctedBy) query = query.eq("annotation_updated_by", filters.correctedBy);
  if (filters.highRiskOnly) query = query.eq("serverity", "high");
  if (filters.startDate) query = query.gte("tagged_at", filters.startDate);
  if (filters.endDate) query = query.lte("tagged_at", filters.endDate);
  if (filters.scoreCutoff !== undefined) query = query.gte("score", filters.scoreCutoff);

  query = query.order("score", { ascending: false });
  if (filters.topN) query = query.limit(filters.topN);

  return query;
}

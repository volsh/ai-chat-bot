import { createSupabaseServerClient } from "@/libs/supabase";
import { ExportFilterOptions, EmotionTrainingRow } from "@/types";
import { buildFilteredTrainingQuery } from "./buildFilteredTrainingQuery";
import sanitizeInput from "../general/sanitizeInput";

/**
 * Fetches and exports filtered training data from `v_emotion_training_data` as a CSV string.
 */
export async function exportTrainingData(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  filters: ExportFilterOptions
) {
  const query = buildFilteredTrainingQuery(supabase, filters);

  const { data, error } = await query;
  if (error) throw new Error("Failed to fetch data: " + error.message);

  if (!data || data.length < 10) throw new Error("Training file must have at least 10 examples");

  const json = generateJSONLTrainingData(data);
  return json;
}

function generateJSONLTrainingData(rows: EmotionTrainingRow[]): string {
  return rows
    .filter((r) => r.content && r.emotion && r.tone && typeof r.intensity === "number" && r.topic)
    .map((r) =>
      JSON.stringify({
        messages: [
          {
            role: "system",
            content:
              "Given a message, extract:\n- emotion\n- tone\n- intensity (0.0 to 1.0)\n- topic\n- corrected assistant message (as 'message')\n- optional therapist note",
          },
          {
            role: "user",
            content: r.content.trim(),
          },
          {
            role: "assistant",
            content: [
              `emotion: ${r.emotion}`,
              `tone: ${r.tone}`,
              `intensity: ${r.intensity.toFixed(2)}`,
              `topic: ${r.topic}`,
              `message: ${sanitizeInput(r.content)}`,
              r.note ? `note: ${sanitizeInput(r.note)}` : null,
              `source: ${r.annotation_updated_at ? "annotated" : "auto"}`,
            ]
              .filter(Boolean)
              .join("\n"),
          },
        ],
      })
    )
    .join("\n");
}

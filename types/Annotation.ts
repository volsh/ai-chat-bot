export interface Annotation {
  id: string;
  note?: string;
  flagged?: boolean;
  flag_reason?: string;
  corrected_emotion?: string;
  corrected_tone?: string;
  corrected_topic?: string;
  corrected_intensity?: number;
  corrected_alignment_score?: number;
  updated_at: string;
  updated_by?: string;
  source_type: "session" | "journal" | "reflection";
  source_id: string;
}

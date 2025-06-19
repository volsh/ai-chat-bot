export interface Annotation {
  id: string;
  severity: "high" | "medium" | "low";
  note?: string;
  flagged?: boolean;
  flag_reason?: string;
  corrected_emotion?: string;
  corrected_tone?: string;
  corrected_topic?: string;
  corrected_intensity?: number;
  at: string;
  by?: string;
  source_type: "session" | "journal" | "reflection";
  source_id: string;
}

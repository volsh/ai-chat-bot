import { Emotion } from "./Emotion";

export interface EmotionLog extends Emotion {
  user_id: string;
  source_type: "session" | "journal" | "reflection";
  source_id: string;
  created_at: string;
}

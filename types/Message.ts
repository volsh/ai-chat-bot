import { Annotation } from "./Annotation";
import { Emotion } from "./Emotion";

export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
  id: string;
}

export interface MessageWithEmotion extends Message, Partial<Emotion>, Partial<Annotation> {
  id: string;
  message_created_at: string;
  original_emotion?: string;
  original_tone?: string;
  original_intensity?: number;
  original_topic?: string;
  emotion_log_id?: string;
  tagged_at?: string;
  annotation_updated_at?: string;
  annotation_updated_by?: string;
  score?: number;
  message_role?: "user" | "assistant" | "system";
}

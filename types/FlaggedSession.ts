import { MessageWithEmotion } from "./Message";
import { Session } from "./Session";

export interface FlaggedSession extends Session {
  session_id: string;
  session_title: string;
  session_created_at: string;
  client_email: string;
  client_id: string;
  client_name: string;
  annotation_count: number;
  flagged_count: number;
  severity_counts: {
    high: number;
    medium: number;
    low: number;
  };
  reviewed: boolean;
  summary?: string;
  top_emotions?: string[];
  top_reasons?: string[];
  folder_name?: string;
  ai_agreement_rate?: number; // 0–100 percent
  treatment_title?: string;
  goal_title?: string;
  treatment_color: string;
  treatment_emoji: string;
  flagged_messages: MessageWithEmotion[];
}

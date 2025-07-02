import { TreatmentWithGoal } from "./Treatment";

export interface Session {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  ended_at: string;
  paused_at: string;
  total_pause_seconds: number;
  emoji: string;
  color: string;
  folder_id: string;
  order_index: number;
  summary?: string;
  bookmarked?: boolean;
  treatment_id: string;
}

export interface SessionWithGoal extends Session {
  treatments: TreatmentWithGoal;
}

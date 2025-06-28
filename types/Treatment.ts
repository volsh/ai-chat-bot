import { Goal } from "./Goal";

export interface Treatment {
  id: string;
  title: string;
  emoji?: string | null;
  color?: string | null;
  folder_id?: string | null;
  order_index?: number | null;
  archived?: boolean;
  created_at?: string;
  updated_at?: string;
  goal_id?: string;
  user_id: string;
  team_id: string;
  status: string;
  ended_at: string;
  summary: string;
  shared_with: string[];
}

export interface TreatmentWithGoal extends Treatment {
  goals: Goal;
}

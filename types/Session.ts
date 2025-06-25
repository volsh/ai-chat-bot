export interface Session {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  ended_at: string;
  goal: string;
  emoji: string;
  color: string;
  folder_id: string;
  order_index: number;
  summary?: string;
  bookmarked?: string;
}

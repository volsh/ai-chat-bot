export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
}

export interface InviteLog {
  id: string;
  to_email: string;
  created_at: string;
  status: "pending" | "accepted" | "expired";
  retry_count: number;
}

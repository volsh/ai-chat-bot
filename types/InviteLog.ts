export interface InviteLog {
  id: string;
  to_email: string;
  created_at: string;
  accepted_at: string;
  status: "pending" | "accepted" | "expired" | "failed";
  retry_count: number;
  token: string;
  invite_url: string;
  last_error: string;
  last_retry_at: string;
}

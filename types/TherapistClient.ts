export interface TherapistClient {
  id: string;
  email: string;
  session_count: number;
  last_active: string | null;
  access_type: "shared" | "team" | "both";
}

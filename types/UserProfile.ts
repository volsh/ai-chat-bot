export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  role: "user" | "therapist" | "admin";
  created_at: string;
  avatar_url?: string;
}

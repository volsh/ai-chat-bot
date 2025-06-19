import { UserProfile } from "./UserProfile";

export interface SupabaseTeamResponse {
  id: string;
  name?: string;
  description?: string;
  team_members?: TeamMember &
    {
      joined_at?: string;
      users?: UserProfile;
    }[];
}

export interface Team {
  id?: string;
  name?: string;
  description?: string;
  team_members: TeamMember[];
}

export interface TeamMember {
  id?: string;
  full_name: string | null;
  email?: string;
  joined_at?: string;
  user_id?: string;
}

export interface TeamMemberWithUsers extends TeamMember {
  users: UserProfile;
}

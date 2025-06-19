// utils/invites/removeInvite.ts
import { supabaseBrowserClient as supabase } from "@/libs/supabase";

export async function removeInvite(inviteId: string) {
  const { error } = await supabase.from("invite_logs").delete().eq("id", inviteId);

  if (error) throw new Error(error.message);
}

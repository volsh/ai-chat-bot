import { supabaseBrowserClient as supabase } from "@/libs/supabase";

export async function updateSessionReviewedStatus(ids: string[], reviewed: boolean) {
  return await supabase.from("sessions").update({ reviewed }).in("id", ids);
}

// utils/admin/logAdminAudit.ts
import { createSupabaseServerClient } from "@/libs/supabase";

export async function logAdminAudit({
  req,
  res,
  action,
  details,
  note,
}: {
  req: any;
  res: any;
  action: string;
  details?: string;
  note?: string;
}) {
  const supabase = createSupabaseServerClient(req, res);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  await supabase.from("admin_audit_logs").insert({
    actor_id: user.id,
    action,
    details,
    note,
  });
}

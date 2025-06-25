// pages/api/join-team.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createSupabaseServerClient } from "@/libs/supabase";
import { z } from "zod";

const InviteSchema = z.object({
  email: z.string().email(),
  team_id: z.string().uuid(),
  token: z.string(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const parse = InviteSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: "Invalid input" });

  const { email, team_id, token } = parse.data;

  if (!email || !team_id || !token) {
    return res.status(400).json({ error: "Bad request. missing params" });
  }

  const supabase = createSupabaseServerClient(req, res);

  const { data: invite } = await supabase
    .from("invite_logs")
    .select("*")
    .eq("team_id", team_id)
    .eq("to_email", email)
    .eq("token", token)
    .eq("status", "pending")
    .limit(1)
    .maybeSingle();
  console.log("invite", invite);
  if (!invite) return res.status(403).json({ error: "Invalid or expired invite." });

  if (invite.status === "accepted") {
    return res.status(403).json({ error: "Invite already used." });
  }

  const userData = await supabase.auth.getUser();
  if (!userData.data.user) return res.status(401).json({ error: "Unauthorized" });
  const user = userData.data.user;
  const userId = user.id;

  await supabase.from("users").upsert({ id: userId, role: "therapist" }, { onConflict: "id" });

  const { error } = await supabase.from("team_members").upsert({
    team_id,
    user_id: userId,
  });
  if (error) {
    return res.status(500).json({ error: "Failed to join team" });
  }
  console.log("team_id", team_id);
  console.log("email", email);

  const existing = await supabase
    .from("invite_logs")
    .update({ status: "accepted", accepted_at: new Date().toISOString() })
    .eq("to_email", email)
    .eq("team_id", team_id)
    .select("id,status")
    // .limit(1)
    // .maybeSingle();
  console.log("existing", existing);

  return res.status(200).json({ success: true });
}

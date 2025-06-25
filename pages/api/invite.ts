// pages/api/invite.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createSupabaseServerClient } from "@/libs/supabase";
import { z } from "zod";

const InviteSchema = z.object({
  email: z.string().email(),
  team_id: z.string().uuid(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const parse = InviteSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: "Invalid input" });

  const { email, team_id } = parse.data;

  if (!email || !team_id) {
    return res.status(403).json({ error: "Bad request. missing params" });
  }

  const supabase = createSupabaseServerClient(req, res);
  const userData = await supabase.auth.getUser();
  if (!userData.data.user) return res.status(401).json({ error: "Unauthorized" });
  const user = userData.data.user;

  if (email === user.email) {
    return res.status(400).json({ error: "You cannot invite yourself." });
  }

  const { data: profile } = await supabase.from("users").select().eq("id", user?.id).single();

  // Call the Edge Function
  const { error: funcError } = await supabase.functions.invoke("send-invite", {
    body: {
      to_email: email,
      from_name: profile.full_name || profile?.email || "AI Chat App",
      inviter_id: user?.id,
      session_title: "Shared session",
      link: `${process.env.NEXT_PUBLIC_SITE_URL}/join-team?team_id=${team_id}&email=${email}`,
      team_id,
    },
  });

  if (funcError) {
    console.error("Edge function error:", funcError);
    return res.status(500).json({ error: `Failed to send invite ${funcError}` });
  }

  return res.status(200).json({ success: true });
}

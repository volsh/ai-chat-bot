import type { NextApiRequest, NextApiResponse } from "next";
import { createSupabaseServerClient } from "@/libs/supabase";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const supabase = createSupabaseServerClient(req, res);

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session?.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { email } = session.user;

  // Update invite status
  const { error: inviteUpdateError } = await supabase
    .from("invite_logs")
    .update({
      status: "accepted",
      accepted_at: new Date().toISOString(),
    })
    .eq("to_email", email)
    .eq("status", "sent");

  if (inviteUpdateError) {
    return res.status(500).json({
      error: "Failed to update records",
      details: inviteUpdateError?.message,
    });
  }

  return res.status(200).json({ success: true });
}

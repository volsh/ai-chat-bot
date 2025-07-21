import type { NextApiRequest, NextApiResponse } from "next";
import { createSupabaseServerClient } from "@/libs/supabase";
import { z } from "zod";
import { differenceInDays } from "date-fns";
import { logAdminAudit } from "@/utils/admin/logAdminAudit";

const SendInviteSchema = z
  .object({
    invite_id: z.string().uuid().optional(),
    email: z.string().email().optional(),
  })
  .refine((data) => (data.invite_id && !data.email) || (!data.invite_id && data.email), {
    message: "Provide either invite_id or email, but not both.",
  });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const parse = SendInviteSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.errors });

  const { invite_id, email } = parse.data;
  const supabase = createSupabaseServerClient(req, res);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const { data: profile } = await supabase.from("users").select().eq("id", user.id).maybeSingle();
  const from_name = profile?.full_name || user.email || "AI Chat App";
  const now = new Date().toISOString();

  if (invite_id) {
    // ✅ RETRY FLOW
    const { data: invite, error: inviteError } = await supabase
      .from("invite_logs")
      .select("*")
      .eq("id", invite_id)
      .single();

    if (!invite || inviteError) return res.status(404).json({ error: "Invite not found" });

    const retryCount = invite.retry_count ?? 0;
    const isExpired = differenceInDays(new Date(), new Date(invite.created_at)) >= 7;
    const retryLimitReached = retryCount >= 3;

    if (!isExpired && retryLimitReached) {
      return res.status(429).json({ error: "Retry limit reached (3)" });
    }

    const to_email = invite.to_email;

    const { error: funcError } = await supabase.functions.invoke("send-therapist-magic-link", {
      body: { to_email, from_name, invite_id },
    });

    if (funcError) {
      await supabase
        .from("invite_logs")
        .update({
          retry_count: retryCount + 1,
          last_retry_at: now,
          last_error: funcError.message || "Unknown error",
          status: "failed",
        })
        .eq("id", invite_id);

      await logAdminAudit({
        req,
        res,
        action: "Send Invite Failed",
        details: `Invite ID: ${invite_id}`,
        note: funcError.message || "Unknown error",
      });

      return res.status(500).json({ error: "Failed to send invite" });
    }

    await supabase
      .from("invite_logs")
      .update({
        retry_count: retryCount + 1,
        last_retry_at: now,
        last_error: null,
        status: "sent",
      })
      .eq("id", invite_id);

    await logAdminAudit({
      req,
      res,
      action: "Sent Therapist Invite",
      details: `Invite ID: ${invite_id}`,
      note: `Sent to ${to_email}`,
    });

    return res.status(200).json({ success: true });
  }

  // ✅ CREATE NEW FLOW
  if (email) {
    // Prevent duplicates
    const { data: existingInvite } = await supabase
      .from("invite_logs")
      .select("id")
      .eq("to_email", email)
      .maybeSingle();

    if (existingInvite) {
      return res.status(409).json({ error: "Invite already sent to this email" });
    }

    const { data: newInvite, error: insertError } = await supabase
      .from("invite_logs")
      .insert({
        to_email: email,
        inviter_id: user.id,
        created_at: now,
      })
      .select()
      .single();

    if (insertError || !newInvite) {
      return res.status(500).json({ error: "Failed to create invite log" });
    }

    const { error: funcError } = await supabase.functions.invoke("send-therapist-magic-link", {
      body: {
        to_email: email,
        from_name,
        invite_id: newInvite.id,
      },
    });

    if (funcError) {
      await supabase
        .from("invite_logs")
        .update({
          last_error: funcError.message || "Unknown error",
          status: "failed",
        })
        .eq("id", newInvite.id);

      await logAdminAudit({
        req,
        res,
        action: "Send Invite Failed",
        details: `New Invite to ${email}`,
        note: funcError.message || "Unknown error",
      });

      return res.status(500).json({ error: "Failed to send invite" });
    }

    await supabase
      .from("invite_logs")
      .update({
        status: "sent",
      })
      .eq("id", newInvite.id);

    await logAdminAudit({
      req,
      res,
      action: "Sent Therapist Invite",
      details: `New Invite ID: ${newInvite.id}`,
      note: `Sent to ${email}`,
    });

    return res.status(200).json({ success: true });
  }

  return res.status(400).json({ error: "Invalid state" });
}

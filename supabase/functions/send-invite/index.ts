import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js";

serve(async (req) => {
  const { to_email, from_name, session_title, link, inviter_id, team_id } = await req.json();
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const existing = await supabase
    .from("invite_logs")
    .select("id", { count: "exact", head: true })
    .eq("to_email", to_email)
    .eq("team_id", team_id);
  if ((existing.count ?? 0) > 0) {
    return new Response(JSON.stringify({ error: "Already invited" }), { status: 409 });
  }

  const ip = req.headers.get("x-forwarded-for") || "unknown";

  // Rate limit: 5 per hour
  const { count } = await supabase
    .from("invite_logs")
    .select("*", { count: "exact", head: true })
    .eq("inviter_id", inviter_id)
    .gte("created_at", new Date(Date.now() - 60 * 60 * 1000).toISOString());

  if ((count ?? 0) >= 10) {
    return new Response(JSON.stringify({ error: "Too many invites. Please try later." }), {
      status: 429,
    });
  }

  const existing = await supabase
    .from("invite_logs")
    .select("*")
    .eq("to_email", email)
    .eq("team_id", team_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing && (existing.retry_count || 0) >= 3) {
    return res.status(429).json({ success: false, error: "Invite retry limit reached" });
  }

  await supabase
    .from("invite_logs")
    .update({ retry_count: (existing.retry_count || 0) + 1, created_at: new Date().toISOString() })
    .eq("id", existing.id);

  const { data: inserted, error: insertError } = await supabase
    .from("invite_logs")
    .insert({ inviter_id, to_email, ip_address: ip, team_id })
    .select("token");

  if (insertError) {
    console.error("Invite log insert failed", insertError);
    return new Response(JSON.stringify({ error: "Failed to create invite" }), { status: 500 });
  }

  const token = inserted?.token;

  if (!token) {
    return new Response(JSON.stringify({ error: "Failed to generate invite token" }), {
      status: 500,
    });
  }

  const inviteLink = `${link}&token=${token}`;

  const { error } = await supabase.functions.invoke("sendgrid", {
    body: {
      personalizations: [{ to: [{ email: to_email }] }],
      from: { email: "no-reply@yourapp.com", name: from_name },
      subject: `${from_name} invited you to collaborate`,
      content: [
        {
          type: "text/html",
          value: `<p>${from_name} invited you to a shared session:</p><p><a href="${inviteLink}">Join Session</a></p>`,
        },
      ],
    },
  });

  if (error) {
    console.error("Email send failed", error);
    return new Response(JSON.stringify({ error: "Email delivery failed" }), { status: 500 });
  }

  return new Response(JSON.stringify({ success: true }), { status: 200 });
});

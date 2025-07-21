import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js";
import { z } from "https://deno.land/x/zod@v3.22.2/mod.ts";

serve(async (req) => {
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SERVICE_ROLE_KEY")!);

  const schema = z.object({
    to_email: z.string().email(),
    from_name: z.string(),
    invite_id: z.string().uuid().optional(),
  });

  const body = await req.json();
  const result = schema.safeParse(body);
  if (!result.success) {
    return new Response(
      JSON.stringify({ error: "Invalid input", details: result.error.format() }),
      { status: 400 }
    );
  }

  const { to_email, from_name, invite_id } = result.data;

  const now = new Date().toISOString();
  let inviteUrl: string | null = null;
  let lastError: string | null = null;

  const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email: to_email,
    options: {
      redirectTo: `${Deno.env.get("FRONTEND_URL")}/auth/callback`,
      data: { role: "therapist" },
    },
  });

  if (linkError || !linkData?.properties?.action_link) {
    lastError = linkError?.message || "Failed to generate magic link";
  } else {
    inviteUrl = linkData.properties.action_link;

    // Send the email
    const { error: sendError } = await supabase.functions.invoke("send-grid", {
      body: {
        personalizations: [{ to: [{ email: to_email }] }],
        from: {
          email: "liorvolsh@gmail.com", // must be verified
          name: from_name,
        },
        subject: `${from_name} invited you to join as a therapist`,
        content: [
          {
            type: "text/html",
            value: `<p>${from_name} invited you to join as a therapist.</p><p><a href="${inviteUrl}">Click here to sign in</a></p>`,
          },
        ],
      },
    });

    if (sendError) {
      lastError = sendError.message || "Failed to send email";
    }
  }

  // ✅ Update invite_logs if invite_id present
  if (invite_id) {
    const { error: updateError } = await supabase
      .from("invite_logs")
      .update({
        invite_url: inviteUrl,
        last_retry_at: now,
        last_error: lastError,
        status: lastError ? "failed" : "sent",
      })
      .eq("id", invite_id);

    if (updateError) {
      console.error("Failed to update invite_logs", updateError);
    }
  }

  if (lastError) {
    console.error("Invite failed:", lastError);
    return new Response(JSON.stringify({ error: lastError }), { status: 500 });
  }

  return new Response(JSON.stringify({ success: true }), { status: 200 });
});

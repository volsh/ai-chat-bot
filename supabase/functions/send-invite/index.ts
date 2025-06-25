import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js";
import { differenceInDays } from "https://esm.sh/date-fns@3.6.0";
serve(async (req) => {
  const { to_email, from_name, session_title, link, inviter_id, team_id } = await req.json();
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL"),
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  );
  // Rate limit: 10 per hour
  const inviterCount = await supabase
    .from("invite_logs")
    .select("*", {
      count: "exact",
      head: true,
    })
    .eq("inviter_id", inviter_id)
    .gte("created_at", new Date(Date.now() - 60 * 60 * 1000).toISOString());
  if ((inviterCount.count ?? 0) >= 10) {
    return new Response(
      JSON.stringify({
        error: "Too many invites. Please try later.",
      }),
      {
        status: 429,
      }
    );
  }
  const expiryCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: existing } = await supabase
    .from("invite_logs")
    .select("id, status, created_at, retry_count, token")
    .eq("inviter_id", inviter_id)
    .or(`to_email.eq.${to_email},team_id.eq.${team_id}`)
    .limit(1)
    .maybeSingle();
  console.log("existing", existing);
  let token;
  if (existing) {
    if (existing.status === "accepted") {
      console.log("Already accepted");
      return new Response(
        JSON.stringify({
          error: "Already accepted",
        }),
        {
          status: 409,
        }
      );
    }
    const isExpired = differenceInDays(new Date(Date.now()), new Date(existing.created_at)) >= 7;
    if (existing.status === "pending" && !isExpired) {
      console.log("Already invited");
      return new Response(
        JSON.stringify({
          error: "Already invited",
        }),
        {
          status: 409,
        }
      );
    }
    if (isExpired && existing.retry_count >= 3) {
      return new Response(
        JSON.stringify({
          error: "Invite retry limit reached",
        }),
        {
          status: 409,
        }
      );
    }
    await supabase
      .from("invite_logs")
      .update({
        retry_count: (existing.retry_count || 0) + 1,
      })
      .eq("id", existing.id);
    token = existing.token;
  } else {
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    const { data: inserted, error: insertError } = await supabase
      .from("invite_logs")
      .insert({
        inviter_id,
        to_email,
        ip_address: ip,
        team_id,
        retry_count: 0,
      })
      .select("token")
      .limit(1)
      .maybeSingle();
    console.log("inserted", inserted);
    console.log("insertError", insertError);
    if (insertError) {
      console.error("Invite log insert failed", insertError);
      return new Response(
        JSON.stringify({
          error: "Failed to create invite",
        }),
        {
          status: 500,
        }
      );
    }
    token = inserted?.token;
  }
  if (!token) {
    return new Response(
      JSON.stringify({
        error: "Failed to generate invite token",
      }),
      {
        status: 500,
      }
    );
  }
  const inviteLink = `${link}&token=${token}`;
  const { error } = await supabase.functions.invoke("send-grid", {
    body: {
      personalizations: [
        {
          to: [
            {
              email: to_email,
            },
          ],
        },
      ],
      from: {
        email: "liorvolsh@gmail.com",
        name: from_name,
      },
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
    return new Response(
      JSON.stringify({
        error: "Email delivery failed",
      }),
      {
        status: 500,
      }
    );
  }
  return new Response(
    JSON.stringify({
      success: true,
    }),
    {
      status: 200,
    }
  );
});

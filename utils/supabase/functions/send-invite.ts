import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js";

serve(async (req) => {
  const { to_email, from_name, session_title, link } = await req.json();

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data, error } = await supabase.functions.invoke("sendgrid", {
    body: {
      personalizations: [{ to: [{ email: to_email }] }],
      from: { email: "no-reply@yourapp.com", name: from_name },
      subject: `${from_name} invited you to collaborate on a session`,
      content: [
        {
          type: "text/plain",
          value: `You're invited to view a session: ${session_title}\n${link}`,
        },
      ],
    },
  });

  return new Response(JSON.stringify({ success: !error }), {
    headers: { "Content-Type": "application/json" },
    status: error ? 400 : 200,
  });
});

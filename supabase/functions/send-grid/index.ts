// supabase/functions/send-grid/index.ts
import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js";

serve(async (req) => {
  const body = await req.json();

  const apiKey = Deno.env.get("SEND_GRID_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "Missing SendGrid API key" }), { status: 500 });
  }

  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return new Response(JSON.stringify({ error: errorText }), { status: 500 });
  }

  return new Response(JSON.stringify({ success: true }), { status: 200 });
});

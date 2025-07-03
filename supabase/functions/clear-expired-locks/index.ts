// supabase/functions/clear-expired-locks/index.ts

import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SERVICE_ROLE_KEY")!
  );

  const { error } = await supabase
    .from("fine_tune_locks")
    .delete()
    .lt("locked_until", new Date().toISOString());

  if (error) {
    console.error("Failed to clear expired locks:", error);
    return new Response("Failed", { status: 500 });
  }

  return new Response("Cleared", { status: 200 });
});

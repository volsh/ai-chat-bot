// supabase/functions/notify-fine-tune-status/index.ts
import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function retryWithBackoff(fn: () => Promise<Response>, retries = 3, delayMs = 1000) {
  let lastError;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      await delay(delayMs * attempt);
    }
  }
  throw lastError;
}

serve(async (req) => {
  try {
    const body = await req.json();
    const jobId = body.id;
    const status = body.status;

    if (!jobId) return new Response("Missing job ID", { status: 400 });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: snapshot, error: updateError } = await supabase
      .from("fine_tune_snapshots")
      .update({
        job_status: status,
        completed_at:
          status === "succeeded" || status === "failed" ? new Date(Date.now()).toISOString() : null,
      })
      .eq("openai_job_id", jobId)
      .select("id, user_id, openai_job_id, filters, retry_count, job_status")
      .single();

    if (updateError || !snapshot) {
      console.error("Failed to update status or locate snapshot:", updateError);
      return new Response("Snapshot update error", { status: 500 });
    }

    const { id: snapshotId, user_id, filters, retry_count, job_status } = snapshot;

    if ((snapshot.retry_count || 0) >= 3 && status !== "succeeded") {
      await supabase
        .from("fine_tune_snapshots")
        .update({ job_status: "failed", completed_at: new Date(Date.now()).toISOString() })
        .eq("openai_job_id", jobId);

      await supabase.from("fine_tune_events").upsert(
        [
          {
            job_id: jobId,
            user_id,
            status: "failed",
            model_version: body.model,
            error_details: "Retry limit reached (3)",
            message: `Job ${status}`,
            auto_retry: true,
            filters: snapshot.filters,
          },
        ],
        { onConflict: "snapshot_id,job_id", ignoreDuplicates: true }
      );

      return new Response("Retry limit reached (3)", { status: 429 });
    }

    // ✅ Deduplicated log event insert
    const { error: updateEventsError } = await supabase.from("fine_tune_events").upsert(
      [
        {
          job_id: jobId,
          user_id,
          status,
          model_version: body.model,
          error_details: body.error?.message || null,
          message: `Job ${status}`,
          auto_retry: true,
          filters: snapshot.filters,
        },
      ],
      { onConflict: "snapshot_id,job_id", ignoreDuplicates: true }
    );

    if (updateEventsError) {
      console.error("Failed to update fine tune events:", updateEventsError);
    }

    const { data: user } = await supabase.from("users").select("email").eq("id", user_id).single();

    if (user?.email) {
      if (status === "succeeded") {
        await supabase.functions.invoke("sendgrid", {
          body: {
            to_email: user.email,
            subject: "🎓 Your fine-tune job succeeded!",
            text: `Your fine-tuning job ${jobId} completed successfully.`,
          },
        });
      } else if (status === "failed") {
        await supabase.functions.invoke("sendgrid", {
          body: {
            to_email: user.email,
            subject: "❌ Fine-tune job failed",
            text: `Your fine-tuning job ${jobId} has failed. We will attempt an automatic retry.`,
          },
        });

        const retryResponse = await retryWithBackoff(async () => {
          const retryUrl = `${Deno.env.get("NEXT_PUBLIC_SITE_URL")}/api/exports/retry-failed`;
          const response = await fetch(retryUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              job_id: jobId,
              user_id,
              auto_retry: true,
              retry_reason: "Auto retry from failure webhook",
              retry_origin: "webhook",
            }),
          });

          if (!response.ok) throw new Error("Retry trigger failed");
          return response;
        });

        if (!retryResponse.ok) {
          await supabase.from("fine_tune_events").upsert(
            [
              {
                job_id: jobId,
                user_id,
                status: "retry_failed",
                error_details: "Retry trigger failed",
                message: "Retry attempt failed inside webhook",
                filters: snapshot.filters,
              },
            ],
            { onConflict: "snapshot_id,job_id" }
          );
        }
      }
    }

    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response("Invalid payload", { status: 400 });
  }
});

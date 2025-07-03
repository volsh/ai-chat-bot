import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import OpenAI from "https://esm.sh/openai@4.26.0";
const openai = new OpenAI({
  apiKey: Deno.env.get("OPENAI_API_KEY"),
});
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
async function retryWithBackoff(fn, retries = 3, delayMs = 1000) {
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
serve(async (_req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? `https://${Deno.env.get("PROJECT_REF")}.supabase.co`,
    Deno.env.get("SERVICE_ROLE_KEY")
  );
  try {
    const { data: snapshots, error } = await supabase
      .from("fine_tune_snapshots")
      .select("id, job_status, file_id, job_id, file_name, user_id, model_version, retry_count")
      .in("job_status", ["running", "pending", "uploading", "validating_files"]);
    if (error) throw error;
    if (!snapshots?.length) {
      console.log("No pending jobs");
      return new Response("OK", {
        status: 200,
      });
    }
    await Promise.all(
      snapshots.map(async (snapshot) => {
        try {
          const job = await retryWithBackoff(() =>
            openai.fineTuning.jobs.retrieve(snapshot.job_id)
          );
          await supabase
            .from("fine_tune_snapshots")
            .update({
              job_status: job.status,
              completed_at:
                job.status === "succeeded" || job.status === "failed"
                  ? new Date().toISOString()
                  : null,
            })
            .eq("id", snapshot.id);
          await supabase.from("fine_tune_events").upsert(
            [
              {
                job_id: job.id,
                snapshot_id: snapshot.id,
                user_id: snapshot.user_id,
                status: job.status,
                model_version: job.model,
                error: job.error?.message || null,
                message: `Job ${job.status}`,
                auto_retry: true,
                retry_reason: "Status update from polling edge function",
                retry_origin: "poller",
              },
            ],
            {
              onConflict: "job_id,status",
              ignoreDuplicates: true,
            }
          );
          if (job.status === "succeeded" || job.status === "failed") {
            const { data: user } = await supabase
              .from("users")
              .select("email")
              .eq("id", snapshot.user_id)
              .single();
            if (user?.email) {
              const subject =
                job.status === "succeeded"
                  ? "🎓 Your fine-tune job succeeded!"
                  : "❌ Fine-tune job failed";
              const text =
                job.status === "succeeded"
                  ? `Your fine-tuning job ${job.id} completed successfully.`
                  : `Your fine-tuning job ${job.id} has failed. We will attempt an automatic retry.`;
              await supabase.functions.invoke("sendgrid", {
                body: {
                  to_email: user.email,
                  subject,
                  text,
                },
              });
              if (job.status === "failed" && (snapshot.retry_count || 0) < 3) {
                const retryResponse = await retryWithBackoff(async () => {
                  const retryUrl = `${Deno.env.get("NEXT_PUBLIC_SITE_URL")}/api/exports/retry-failed`;
                  const response = await fetch(retryUrl, {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      snapshot_id: snapshot.id,
                      job_id: job.id,
                      auto_retry: true,
                      retry_reason: "Auto retry from polling edge function",
                      retry_origin: "poller",
                    }),
                  });
                  if (!response.ok) throw new Error("Retry trigger failed");
                  return response;
                });
                if (!retryResponse.ok) {
                  await supabase.from("fine_tune_events").upsert(
                    [
                      {
                        job_id: job.id,
                        snapshot_id: snapshot.id,
                        user_id: snapshot.user_id,
                        status: "retry_failed",
                        error: "Retry trigger failed",
                        message: "Retry attempt failed from polling edge function",
                      },
                    ],
                    {
                      onConflict: "job_id,status",
                    }
                  );
                }
              }
              if ((snapshot.retry_count || 0) >= 3 && job.status !== "succeeded") {
                await supabase
                  .from("fine_tune_snapshots")
                  .update({
                    job_status: "failed",
                    completed_at: new Date().toISOString(),
                  })
                  .eq("id", snapshot.id);
              }
            }
          }
        } catch (err) {
          console.error(`Error polling job ${snapshot.job_id}:`, err);
        }
      })
    );
    return new Response("Polling complete", {
      status: 200,
    });
  } catch (err) {
    console.error("Cron error:", err);
    return new Response("Internal error", {
      status: 500,
    });
  }
});

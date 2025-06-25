import { createSupabaseServerClient } from "@/libs/supabase";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export default function pollFineTuneStatus(
  snapshotId: string,
  jobId: string,
  supabase: ReturnType<typeof createSupabaseServerClient>
) {
  const interval = 60 * 1000 * 5; // 10 minute
  const MAX_POLL_ATTEMPTS = 10;
  let attempts = 0;

  const poll = async () => {
    attempts++;
    if (attempts > MAX_POLL_ATTEMPTS) {
      console.warn("Polling timeout reached");
      return;
    }
    try {
      const job = await openai.fineTuning.jobs.retrieve(jobId);
      console.log("job", job);
      await supabase.functions.invoke("notify-fine-tune-status", {
        body: {
          id: job.id,
          status: job.status,
          model: job.model,
          error: job.error || null,
          snapshotId,
        },
      });

      if (job.status === "succeeded" || job.status === "failed") return;
      setTimeout(poll, interval);
    } catch (err) {
      console.error("Polling error:", err);
    }
  };

  // Start with current known status
  poll();
}

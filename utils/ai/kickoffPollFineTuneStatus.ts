import { createSupabaseServerClient } from "@/libs/supabase";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export default function kickoffPollFineTuneStatus(
  snapshotId: string,
  jobId: string,
  supabase: ReturnType<typeof createSupabaseServerClient>
) {
  const MAX_POLL_ATTEMPTS = 1; // Only one quick ping before cron takes over
  const DELAY_MS = 5 * 1000; // Short delay for retry (if ever needed)

  let attempts = 0;

  const poll = async (): Promise<void> => {
    if (attempts > MAX_POLL_ATTEMPTS) return;
    attempts++;

    try {
      const job = await openai.fineTuning.jobs.retrieve(jobId);
      console.log(`[kickoffPoll] Job status: ${job.status} (${jobId})`);

      await supabase.functions.invoke("notify-fine-tune-status", {
        body: {
          id: job.id,
          status: job.status,
          model: job.model,
          error: job.error ?? null,
          snapshotId,
        },
      });

      // Stop early if terminal
      if (["succeeded", "failed"].includes(job.status)) return;

      // Optional: if you wanted to retry once more:
      // setTimeout(poll, DELAY_MS);
    } catch (err) {
      console.error(`[kickoffPoll] Error polling job ${jobId}:`, err);
    }
  };

  poll();
}

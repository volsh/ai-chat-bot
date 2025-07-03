import type { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";
import { createSupabaseServerClient } from "@/libs/supabase";
import { exportTrainingData } from "@/utils/ai/exportTrainingData";
import { v4 as uuidv4 } from "uuid";
import kickoffPollFineTuneStatus from "@/utils/ai/kickoffPollFineTuneStatus";
import getFilterHash from "@/utils/ai/getFilterHash";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const {
    snapshotId: inputSnapshotId,
    job_id,
    retry_reason = "Manual retry",
    auto_retry = false,
    retry_origin = "manual",
  } = req.body;

  const supabase = createSupabaseServerClient(req, res);
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  let snapshotId = inputSnapshotId;

  if (!snapshotId && job_id) {
    const { data: event, error } = await supabase
      .from("fine_tune_events")
      .select("snapshot_id")
      .eq("job_id", job_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error || !event?.snapshot_id) {
      return res.status(400).json({ error: "Could not resolve snapshotId from jobId" });
    }

    snapshotId = event.snapshot_id;
  }

  if (!snapshotId) {
    return res.status(400).json({ error: "Missing snapshotId or jobId" });
  }

  try {
    const { data: snapshot } = await supabase
      .from("fine_tune_snapshots")
      .select("*")
      .eq("id", snapshotId)
      .single();

    if (!snapshot) throw new Error("Snapshot not found");

    if ((snapshot.retry_count || 0) >= 3) {
      return res.status(429).json({ error: "Retry limit reached (3)" });
    }

    if (snapshot.job_status === "succeeded") {
      return res.status(400).json({ error: "Snapshot already completed" });
    }

    // ✅ Cooldown check
    const { data: recent } = await supabase
      .from("fine_tune_events")
      .select("created_at")
      .eq("snapshot_id", snapshotId)
      .order("created_at", { ascending: false })
      .limit(1);

    const lastRetry = new Date(recent?.[0]?.created_at || 0);
    if (auto_retry && Date.now() - lastRetry.getTime() < 5 * 60 * 1000) {
      return res.status(429).json({ error: "Retry cooldown active" });
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 10 * 60 * 1000);

    const { data: existingLock } = await supabase
      .from("fine_tune_locks")
      .select("*")
      .eq("snapshot_id", snapshotId)
      .gt("expires_at", now.toISOString())
      .maybeSingle();

    if (existingLock) {
      return res.status(409).json({ error: "Retry already in progress" });
    }

    // ✅ Export as JSONL for OpenAI
    const jsonlString = await exportTrainingData(supabase, snapshot.filters);
    const buffer = Buffer.from(jsonlString, "utf8");

    const openaiFile = await openai.files.create({
      file: new File([buffer], "retry-data.jsonl", { type: "application/jsonl" }),
      purpose: "fine-tune",
    });

    const job = await openai.fineTuning.jobs.create({
      training_file: openaiFile.id,
      model: snapshot.model_version,
    });

    // Lock it
    await supabase.from("fine_tune_locks").upsert({
      snapshot_id: snapshotId,
      user_id: user.id,
      expires_at: expiresAt.toISOString(),
      locked_until: expiresAt.toISOString(),
      context: retry_origin,
    });

    // Update snapshot version and retry count
    const version = new Date().toISOString().replace(/[:.]/g, "-");

    await supabase
      .from("fine_tune_snapshots")
      .update({
        retry_count: (snapshot.retry_count || 0) + 1,
        version,
        file_id: openaiFile.id,
        file_name: openaiFile.filename,
        job_status: job.status,
        file_uploaded_at: now.toISOString(),
      })
      .eq("id", snapshotId);

    await supabase.from("fine_tune_events").insert({
      snapshot_id: snapshotId,
      job_id: job.id,
      user_id: user.id,
      status: "retry_started",
      model_version: snapshot.model_version,
      error: null,
      message: `Retry triggered via ${retry_origin}`,
      retry_reason,
      auto_retry,
    });

    // 🧠 Background poller for immediate status update
    kickoffPollFineTuneStatus(snapshotId, job.id, supabase);

    return res.status(200).json({ success: true, jobId: job.id });
  } catch (err: any) {
    console.error("Retry job failed", err);
    return res.status(500).json({ error: err.message });
  }
}

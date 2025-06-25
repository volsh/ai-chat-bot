import type { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";
import { createSupabaseServerClient } from "@/libs/supabase";
import { exportTrainingData } from "@/utils/ai/exportTrainingData";
import { v4 as uuidv4 } from "uuid";
import pollFineTuneStatus from "@/utils/ai/pollFineTuneStatus";

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

    // ✅ Cooldown check (5 minutes)
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
    const expiresAt = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes

    const { data: existingLock } = await supabase
      .from("fine_tune_locks")
      .select("*")
      .eq("snapshot_id", snapshotId)
      .gt("expires_at", now.toISOString())
      .maybeSingle();

    if (existingLock) {
      return res.status(409).json({ error: "Retry already in progress" });
    }
    const csvString = await exportTrainingData(supabase, snapshot.filters);

    if (!(snapshot.file_path && snapshot.file_uploaded_at)) {
      const fileName = `fine-tune/retry-${uuidv4()}.csv`;
      await supabase.storage
        .from("exports")
        .upload(fileName, csvString, { contentType: "text/csv", upsert: true });
    }

    const openaiRes = await openai.files.create({
      file: new File([Buffer.from(csvString)], "retry-data.csv", {
        type: "text/csv;charset=utf-8",
      }),
      purpose: "fine-tune",
    });

    const job = await openai.fineTuning.jobs.create({
      training_file: openaiRes.id,
      model: snapshot.model_version,
    });

    // Lock it
    await supabase.from("fine_tune_locks").upsert({
      snapshot_id: snapshotId,
      user_id: user.id,
      expires_at: expiresAt,
      locked_until: expiresAt,
      context: retry_origin || "manual",
    });

    const version = new Date().toISOString().replace(/[:.]/g, "-");

    await supabase
      .from("fine_tune_snapshots")
      .update({
        retry_count: (snapshot.retry_count || 0) + 1,
        version,
      })
      .eq("id", snapshotId);

    // 🧠 Background poller to call edge function
    pollFineTuneStatus(snapshotId, job.id, supabase);

    res.status(200).json({ success: true, jobId: job.id });
  } catch (err: any) {
    console.error("Retry job failed", err);
    res.status(500).json({ error: err.message });
  }
}

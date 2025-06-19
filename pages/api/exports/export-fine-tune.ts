import type { NextApiRequest, NextApiResponse } from "next";
import { createSupabaseServerClient } from "@/libs/supabase";
import { exportTrainingData } from "@/utils/ai/exportTrainingData";
import OpenAI from "openai";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import os from "os";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

function getFilterHash(filters: any): string {
  const stable = JSON.stringify(filters, Object.keys(filters).sort());
  return crypto.createHash("sha256").update(stable).digest("hex");
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const supabase = createSupabaseServerClient(req, res);
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const filters = req.body;
  const filterHash = getFilterHash(filters);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 5 * 60 * 1000);

  try {
    const { data: recentLock } = await supabase
      .from("fine_tune_locks")
      .select("created_at")
      .eq("user_id", user.id)
      .eq("filter_hash", filterHash)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    const lastExport = new Date(recentLock?.created_at || 0);
    if (recentLock && now.getTime() - lastExport.getTime() < 5 * 60 * 1000) {
      return res.status(200).json({ locked: true, expiresAt });
    }

    const jsonString = await exportTrainingData(supabase, filters);
    const fileName = `fine-tune/export-${uuidv4()}.json`;
    const tmpPath = path.join(os.tmpdir(), `training-${uuidv4()}.jsonl`);
    fs.writeFileSync(tmpPath, jsonString, "utf8");

    const openaiFile = await openai.files.create({
      file: fs.createReadStream(tmpPath),
      purpose: "fine-tune",
    });

    const fineTuneJob = await openai.fineTuning.jobs.create({
      training_file: openaiFile.id,
      model: "gpt-3.5-turbo",
    });

    fs.unlinkSync(tmpPath);

    const version = new Date().toISOString().replace(/[:.]/g, "-");
    console.log("fineTuneJob", fineTuneJob);

    const { data: newSnapshot, error: snapshotError } = await supabase
      .from("fine_tune_snapshots")
      .insert({
        uploaded_by: user.id,
        user_id: user.id,
        model_version: fineTuneJob.model,
        version,
        filters,
        filter_hash: filterHash,
        file_path: fileName,
        openai_job_id: fineTuneJob.id,
        file_name: openaiFile.filename,
        file_id: openaiFile.id,
        job_status: fineTuneJob.status,
        file_uploaded_at: now.toISOString(),
      })
      .select()
      .single();

    if (snapshotError) {
      throw new Error(snapshotError.message);
    }
    const { error: lockError } = await supabase.from("fine_tune_locks").upsert({
      snapshot_id: newSnapshot.id,
      user_id: user.id,
      filter_hash: filterHash,
      context: "export",
      expires_at: expiresAt.toISOString(),
      locked_until: expiresAt.toISOString(),
    });
    console.log("lockError", lockError);

    if (lockError) {
      throw new Error(lockError.message);
    }

    // 🧠 Background poller to call webhook manually
    pollFineTuneStatus(fineTuneJob.id, fineTuneJob.model, fineTuneJob.status);

    return res.status(200).json({
      success: true,
      jobId: fineTuneJob.id,
      filePath: fileName,
    });
  } catch (err: any) {
    console.error("Fine-tune export error:", err);
    return res.status(500).json({ error: err.message });
  }
}

function pollFineTuneStatus(jobId: string, model: string, initialStatus: string) {
  const interval = 60 * 1000 * 10; // 10 minute
  const MAX_POLL_ATTEMPTS = 3;
  let attempts = 0;

  const poll = async () => {
    attempts++;
    if (attempts > MAX_POLL_ATTEMPTS) {
      console.warn("Polling timeout reached");
      return;
    }
    try {
      const job = await openai.fineTuning.jobs.retrieve(jobId);

      await fetch(`${process.env.SUPABASE_FUNCTIONS_URL}/notify-fine-tune-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: job.id,
          status: job.status,
          model: job.model,
          error: job.error || null,
        }),
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

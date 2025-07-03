// pages/api/exports/start.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createSupabaseServerClient } from "@/libs/supabase";
import { exportTrainingData } from "@/utils/ai/exportTrainingData";
import OpenAI from "openai";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";
import os from "os";
import getFilterHash from "@/utils/ai/getFilterHash";
import kickoffPollFineTuneStatus from "@/utils/ai/kickoffPollFineTuneStatus";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const supabase = createSupabaseServerClient(req, res);
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const { filters, name } = req.body;
  const filterHash = getFilterHash(filters);

  try {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 10 * 60 * 1000);

    const [{ data: existingSnapshot }, { data: latestSnapshot }, { data: lastChange }] =
      await Promise.all([
        supabase
          .from("fine_tune_snapshots")
          .select("id")
          .eq("filter_hash", filterHash)
          .limit(1)
          .maybeSingle(),
        supabase
          .from("fine_tune_snapshots")
          .select("created_at")
          .order("created_at", { ascending: false })
          .limit(1)
          .single(),
        supabase
          .from("emotion_log_changes")
          .select("change_timestamp")
          .order("change_timestamp", { ascending: false })
          .limit(1)
          .single(),
      ]);

    if (lastChange?.change_timestamp <= latestSnapshot?.created_at && existingSnapshot?.id) {
      return res.status(423).json({ error: "A snapshot with the same filters already exists." });
    }

    const { data: recentLock } = await supabase
      .from("fine_tune_locks")
      .select("created_at")
      .eq("user_id", user.id)
      .eq("filter_hash", filterHash)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    const lastExport = recentLock?.created_at ? new Date(recentLock.created_at) : new Date(0);
    if (recentLock && now.getTime() - lastExport.getTime() < 5 * 60 * 1000) {
      return res.status(423).json({ locked: true, expiresAt });
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

    const { data: newSnapshot, error: snapshotError } = await supabase
      .from("fine_tune_snapshots")
      .insert({
        name,
        uploaded_by: user.id,
        user_id: user.id,
        model_version: fineTuneJob.model,
        version,
        filters,
        filter_hash: filterHash,
        file_path: fileName,
        file_name: openaiFile.filename,
        file_id: openaiFile.id,
        job_id: fineTuneJob.id,
        job_status: fineTuneJob.status,
        file_uploaded_at: now.toISOString(),
      })
      .select()
      .single();

    if (snapshotError || !newSnapshot) {
      throw new Error(snapshotError?.message || "Snapshot creation failed");
    }

    const { error: lockError } = await supabase.from("fine_tune_locks").upsert({
      snapshot_id: newSnapshot.id,
      user_id: user.id,
      context: "export",
      expires_at: expiresAt.toISOString(),
      locked_until: expiresAt.toISOString(),
    });

    if (lockError) throw new Error(lockError.message);

    kickoffPollFineTuneStatus(newSnapshot.id, fineTuneJob.id, supabase);

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

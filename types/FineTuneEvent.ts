export interface FineTuneEvent {
  id: string;
  job_id: string;
  user_id: string;
  status: "pending" | "succeeded" | "failed" | "retrying";
  created_at: string;
  message: string;
  retry_count?: number;
  retry_origin: "manual" | "scheduled" | "webhook";
  retry_reason: string;
  model_version?: string;
  error?: string;
  retrain_suggested?: boolean;
  snapshot_id: string;
  fine_tune_snapshots?: {
    job_status?: string;
  };
}

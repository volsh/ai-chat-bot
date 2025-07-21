export interface Snapshot {
  id: string;
  created_at: string;
  version: number;
  filters: Record<string, any>;
  job_status: string;
  retry_count: number;
}

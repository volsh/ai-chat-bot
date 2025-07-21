// types/AdminAuditLog.ts

export interface AdminAuditLog {
  id: string;
  actor: string;
  action: string;
  details: string;
  note: string | null;
  created_at: string;
}

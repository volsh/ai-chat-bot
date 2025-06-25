import crypto from "crypto";

export default function getFilterHash(filters: any): string {
  const stable = JSON.stringify(filters, Object.keys(filters).sort());
  return crypto.createHash("sha256").update(stable).digest("hex");
}

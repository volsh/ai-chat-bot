export type Severity = "low" | "medium" | "high";

/**
 * Computes severity based on intensity + tone
 */
export function getSeverityFromEmotion(intensity: number, tone: string): Severity {
  if (tone === "negative") {
    if (intensity >= 0.8) return "high";
    if (intensity >= 0.5) return "medium";
  }
  return "low";
}

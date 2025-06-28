import { MessageWithEmotion } from "@/types";

export function calculateSessionScore(rows: MessageWithEmotion[]) {
  if (!rows.length) {
    return {
      totalMessages: 0,
      averageAlignment: 0,
      netEmotionalToneBalance: 0,
      finalScore: 0,
    };
  }

  const totalMessages = rows.length;

  // Alignment score (0–1)
  const alignmentScores = rows
    .map((r) => r.alignment_score)
    .filter((val): val is number => typeof val === "number");

  const averageAlignment =
    alignmentScores.reduce((sum, v) => sum + v, 0) / (alignmentScores.length || 1);

  // Emotional tone balance
  const positiveRows = rows.filter((r) => r.tone === "positive" && typeof r.intensity === "number");
  const negativeRows = rows.filter((r) => r.tone === "negative" && typeof r.intensity === "number");

  const totalPositiveIntensity = positiveRows.reduce((sum, r) => sum + (r.intensity || 0), 0);
  const totalNegativeIntensity = negativeRows.reduce((sum, r) => sum + (r.intensity || 0), 0);

  const toneRowCount = positiveRows.length + negativeRows.length;
  const netEmotionalToneBalance =
    toneRowCount > 0 ? (totalPositiveIntensity - totalNegativeIntensity) / toneRowCount : 0;

  // Normalize to [0,1] scale
  const toneScore = (netEmotionalToneBalance + 1) / 2; // -1 to +1 → 0 to 1

  // Dynamic weighting: only use metrics with real values
  const weights = {
    alignment: alignmentScores.length > 0 ? 1 : 0,
    tone: toneRowCount > 0 ? 1 : 0,
  };
  const totalWeight = weights.alignment + weights.tone || 1;

  const finalScore =
    (averageAlignment * weights.alignment + toneScore * weights.tone) / totalWeight;

  return {
    totalMessages,
    averageAlignment,
    netEmotionalToneBalance,
    finalScore,
  };
}

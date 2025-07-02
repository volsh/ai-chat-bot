import { EmotionTrainingRow } from "@/types";

export function calculateSessionScore(rows: EmotionTrainingRow[]) {
  // Only include rows with at least one of tone or alignment_score
  const validRows = rows.filter(
    (r) => typeof r.alignment_score === "number" || typeof r.tone === "string"
  );

  if (!validRows.length) {
    return {
      totalMessages: 0,
      averageAlignment: 0,
      netEmotionalToneBalance: 0,
      finalScore: 0,
    };
  }

  const totalMessages = validRows.length;

  // Alignment
  const alignmentScores = validRows
    .map((r) => r.alignment_score)
    .filter((val): val is number => typeof val === "number");

  const averageAlignment =
    alignmentScores.reduce((sum, v) => sum + v, 0) / (alignmentScores.length || 1);

  // Tone
  const positiveRows = validRows.filter(
    (r) => r.tone === "positive" && typeof r.intensity === "number"
  );
  const negativeRows = validRows.filter(
    (r) => r.tone === "negative" && typeof r.intensity === "number"
  );

  const totalPositiveIntensity = positiveRows.reduce((sum, r) => sum + (r.intensity || 0), 0);
  const totalNegativeIntensity = negativeRows.reduce((sum, r) => sum + (r.intensity || 0), 0);

  const toneRowCount = positiveRows.length + negativeRows.length;
  const netEmotionalToneBalance =
    toneRowCount > 0 ? (totalPositiveIntensity - totalNegativeIntensity) / toneRowCount : 0;

  const toneScore = (netEmotionalToneBalance + 1) / 2;

  // Weighted final score
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

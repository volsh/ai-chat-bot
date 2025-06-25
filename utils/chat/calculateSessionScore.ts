import { EmotionTrainingRow } from "@/types";

export function calculateSessionScore(rows: EmotionTrainingRow[]) {
  if (!rows.length) {
    return {
      totalMessages: 0,
      alignedRatio: 0,
      averageAlignment: 0,
      netEmotionalToneBalance: 0,
      finalScore: 0,
    };
  }

  const totalMessages = rows.length;

  // Goal alignment metrics
  const alignedMessages = rows.filter((r) => {
    const aligned = typeof r["aligned_with_goal"] === "boolean" ? r["aligned_with_goal"] : false;
    return aligned;
  });
  const alignedRatio = alignedMessages.length / totalMessages;

  const averageAlignment =
    rows.reduce((sum, r) => {
      const score = typeof r["alignment_score"] === "number" ? r["alignment_score"] : 0;
      return sum + score;
    }, 0) / totalMessages;

  // Emotional balance
  const totalPositiveIntensity = rows
    .filter((r) => r.tone === "positive")
    .reduce((sum, r) => sum + (r.intensity || 0), 0);
  const totalNegativeIntensity = rows
    .filter((r) => r.tone === "negative")
    .reduce((sum, r) => sum + (r.intensity || 0), 0);
  const netEmotionalToneBalance = (totalPositiveIntensity - totalNegativeIntensity) / totalMessages;

  // Final Score
  const finalScore = alignedRatio * 0.4 + averageAlignment * 0.3 + netEmotionalToneBalance * 0.3;

  return {
    totalMessages,
    alignedRatio,
    averageAlignment,
    netEmotionalToneBalance,
    finalScore,
  };
}

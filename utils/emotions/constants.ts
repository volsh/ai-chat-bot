// utils/emotions/constants.ts

export const severityColors: Record<string, string> = {
  high: "text-red-600",
  medium: "text-yellow-600",
  low: "text-green-600",
};

export const toneColors: Record<string, string> = {
  negative: "text-red-600",
  neutral: "text-yellow-600",
  positive: "text-green-600",
};

export const emotionClasses: Record<string, string> = {
  anger: "text-red-600",
  sadness: "text-blue-600",
  joy: "text-green-600",
  fear: "text-purple-600",
  surprise: "text-yellow-600",
  disgust: "text-pink-600",
  shame: "text-gray-600",
};

export function getEmotionColor(emotion: string) {
  switch (emotion.toLowerCase()) {
    case "angry":
    case "sad":
      return "#ef4444"; // red
    case "anxious":
    case "unhappy":
    case "concerned":
    case "negative":
      return "#f59e0b"; // yellow
    case "joy":
    case "happy":
    case "positive":
      return "#10b981"; // green
    default:
      return "#6b7280"; // gray fallback
  }
}

export const severityEmojiMap: Record<string, string> = {
  Low: "🟢",
  Medium: "🟡",
  High: "🔴",
};

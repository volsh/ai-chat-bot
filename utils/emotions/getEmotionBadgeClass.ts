export function getEmotionBadgeClass(tone: string, intensity: number) {
  if (tone === "negative") {
    if (intensity >= 0.8) return "bg-red-500 text-white";
    if (intensity >= 0.5) return "bg-orange-400 text-black";
    return "bg-orange-200 text-black";
  }

  if (tone === "neutral") {
    if (intensity >= 0.8) return "bg-yellow-500 text-black";
    if (intensity >= 0.5) return "bg-yellow-300 text-black";
    return "bg-gray-300 text-black";
  }

  if (tone === "positive") {
    if (intensity >= 0.8) return "bg-green-600 text-white";
    if (intensity >= 0.5) return "bg-green-300 text-black";
    return "bg-blue-100 text-black";
  }

  // fallback
  return "bg-gray-200 text-black";
}

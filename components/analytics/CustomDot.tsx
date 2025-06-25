const CustomDot = (props: any) => {
  const { cx, cy, payload, value } = props;
  if (value == null || isNaN(value)) {
    return null;
  }
  const intensity = parseFloat(payload.intensity);
  const tone = payload.tone || "neutral";

  let color = "#999";
  if (tone === "positive")
    color = intensity >= 0.8 ? "#27ae60" : intensity >= 0.5 ? "#2ecc71" : "#a9dfbf";
  else if (tone === "negative")
    color = intensity >= 0.8 ? "#c0392b" : intensity >= 0.5 ? "#e74c3c" : "#f5b7b1";
  else color = intensity >= 0.8 ? "#9b59b6" : intensity >= 0.5 ? "#f1c40f" : "#bdc3c7";

  return <circle cx={cx} cy={cy} r={4} fill={color} stroke="#fff" strokeWidth={1} />;
};
export default CustomDot;

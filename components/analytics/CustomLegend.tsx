import { Legend } from "recharts";

const CustomLegend = ({ tones }: { tones: string[] }) => (
  <Legend
    verticalAlign="top"
    align="left"
    content={() => (
      <div className="mb-2 flex flex-wrap gap-4 text-sm text-zinc-700 dark:text-zinc-200">
        {tones.map((tone) => {
          const color =
            tone === "positive" ? "#2ecc71" : tone === "negative" ? "#e74c3c" : "#f1c40f"; // default for neutral
          return (
            <div key={tone} className="flex items-center gap-1">
              <span
                className="inline-block h-3 w-3 rounded-full"
                style={{ backgroundColor: color }}
              />
              {tone.charAt(0).toUpperCase() + tone.slice(1)}
            </div>
          );
        })}
      </div>
    )}
  />
);

export default CustomLegend;

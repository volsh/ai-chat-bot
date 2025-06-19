import { useState } from "react";
import Badge from "@/components/ui/badge";

type Props = {
  value: number;
  onChange: (val: number) => void;
};

export default function RetryCountFilter({ value, onChange }: Props) {
  const [sliderValue, setSliderValue] = useState(value);

  return (
    <div className="flex items-center gap-4">
      <label htmlFor="retry-count" className="text-sm font-medium">
        Retry Count ≥ {sliderValue}
      </label>
      <input
        id="retry-count"
        type="range"
        min={0}
        max={5}
        value={sliderValue}
        onChange={(e) => {
          const val = parseInt(e.target.value);
          setSliderValue(val);
          onChange(val);
        }}
        className="w-full max-w-xs"
      />
      <Badge
        className={
          sliderValue >= 3
            ? "border-red-400 bg-red-100 text-red-800"
            : sliderValue > 0
              ? "border-yellow-400 bg-yellow-100 text-yellow-800"
              : "border-zinc-400 bg-zinc-100 text-zinc-800"
        }
        variant="outline"
      >
        Min Retries: {sliderValue}
      </Badge>
    </div>
  );
}

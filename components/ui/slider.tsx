"use client";

import * as RadixSlider from "@radix-ui/react-slider";
import Label from "./label";
import React, { ReactNode } from "react";
import { Tooltip } from "react-tooltip";

interface BaseProps {
  label: string;
  min: number;
  max: number;
  step?: number;
  id?: string;
  tooltip?: string | ReactNode;
  tooltipId?: string;
}

interface SingleSliderProps {
  type?: "single";
  value: number;
  onChange: (value: number) => void;
}

interface RangeSliderProps {
  type: "range";
  value: [number, number];
  onChange: (value: [number, number]) => void;
}

type SliderProps = BaseProps & (SingleSliderProps | RangeSliderProps);

export default function Slider({
  label,
  min,
  max,
  step = 1,
  tooltipId,
  tooltip,
  ...props
}: SliderProps) {
  const values = props.type === "range" ? props.value : [props.value];

  // Get unique label points: always show min and max, plus current values if not dupes
  const labelPoints = Array.from(
    new Set([min, ...values.filter((v) => v !== min && v !== max), max])
  ).sort((a, b) => a - b);

  return (
    <div className="min-w-[100px] space-y-1">
      {tooltip ? (
        <div className="flex items-center gap-2">
          <label
            htmlFor="score-cutoff"
            className="text-sm font-medium text-zinc-700 dark:text-white"
          >
            {label}
          </label>
          <span
            data-tooltip-id={tooltipId}
            data-tooltip-place="top"
            className="cursor-help text-xs text-zinc-500"
          >
            ⓘ
          </span>
          <Tooltip id={tooltipId}>
            <div className="max-w-xs text-left text-sm leading-snug">{tooltip}</div>
          </Tooltip>
        </div>
      ) : (
        <Label>{label}</Label>
      )}

      <RadixSlider.Root
        min={min}
        max={max}
        step={step}
        value={values}
        onValueChange={(val) =>
          props.type === "range" ? props.onChange([val[0], val[1]]) : props.onChange(val[0])
        }
        className="relative flex h-5 w-full touch-none select-none items-center"
      >
        <RadixSlider.Track className="relative h-1 grow rounded-full bg-gray-300">
          <RadixSlider.Range className="absolute h-full rounded-full bg-blue-500" />
        </RadixSlider.Track>
        {values.map((_, i) => (
          <RadixSlider.Thumb
            key={i}
            className="block h-4 w-4 rounded-full border border-gray-400 bg-white shadow hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        ))}
      </RadixSlider.Root>

      {/* Tick Labels for min, max, and current */}
      <div className="relative mt-2 flex justify-between text-xs text-gray-500">
        {labelPoints.map((point) => (
          <span key={point} className="-ml-2 w-10 text-center">
            {point.toFixed(2)}
          </span>
        ))}
      </div>
    </div>
  );
}

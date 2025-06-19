import React, { useEffect, useMemo, useState } from "react";
import { supabaseBrowserClient as supabase } from "@/libs/supabase";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
  AreaChart,
  Area,
  LabelList,
} from "recharts";
import Spinner from "@/components/ui/spinner";
import DateRangePicker, { Range } from "@/components/ui/dateRangePicker";
import { EmotionLog } from "@/types";
import MultiSelectFilter from "@/components/ui/multiSelectChips";
import clsx from "clsx";
import ssrGuard from "@/utils/auth/ssrGuard";
import { GetServerSidePropsContext } from "next";
import { useAppStore } from "@/state";
import Slider from "@/components/ui/slider";
import Toggle from "@/components/ui/toggle";
import Select from "@/components/ui/select";
import ClearFiltersButton from "@/components/ui/filters/ClearFiltersButton";

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const redirect = await ssrGuard(context, ["user"]);
  if (redirect) return redirect;
  return { props: {} };
}

export default function EmotionTrendsScreen() {
  const [data, setData] = useState<EmotionLog[]>([]);
  const [selectedEmotion, setSelectedEmotion] = useState<string>("");
  const [emotionFilter, setEmotionFilter] = useState<string[]>([]);
  const [toneFilter, setToneFilter] = useState<string[]>([]);
  const [intensityFilter, setIntensityFilter] = useState<[number, number]>([0.1, 1]);
  const [range, setRange] = useState<Range>({ from: "", to: "" });
  const [loading, setLoading] = useState(true);
  const [aggMode, setAggMode] = useState<"avg" | "total">("avg");
  const [chartType, setChartType] = useState<"line" | "bar" | "area">("line");
  const [normalizeBarChart, setNormalizeBarChart] = useState(false);
  const [normalizeArea, setNormalizeArea] = useState(false);
  const [stackedBars, setStackedBars] = useState(false);
  const { session } = useAppStore();

  useEffect(() => {
    const fetchTrends = async () => {
      setLoading(true);
      let query = supabase.from("emotion_logs").select("*").order("created_at");
      if (emotionFilter.length > 0) query = query.in("emotion", emotionFilter);
      if (toneFilter.length > 0) query = query.in("tone", toneFilter);
      query = query.gte("intensity", intensityFilter[0]).lte("intensity", intensityFilter[1]);
      if (range.from && range.to)
        query = query.gte("created_at", range.from).lte("created_at", range.to);
      query = query.eq("user_id", session?.user.id);
      const { data, error } = await query;
      if (!error) setData(data as EmotionLog[]);
      setLoading(false);
    };
    fetchTrends();
  }, [emotionFilter, toneFilter, intensityFilter, range]);

  const flat = useMemo(
    () =>
      data.map((d) => ({
        date: new Date(d.created_at).toLocaleDateString(),
        emotion: d.emotion,
        tone: d.tone,
        intensity: d.intensity,
      })),
    [data]
  );

  const uniqueDates = useMemo(() => Array.from(new Set(flat.map((e) => e.date))).sort(), [flat]);
  const uniqueEmotions = useMemo(
    () => Array.from(new Set(flat.map((e) => e.emotion))).sort(),
    [flat]
  );
  const uniqueTones = useMemo(() => Array.from(new Set(flat.map((e) => e.tone))).sort(), [flat]);

  useEffect(() => {
    setSelectedEmotion(uniqueEmotions?.[0]);
  }, [uniqueEmotions]);

  const toneByEmotion: Record<string, string> = useMemo(
    () =>
      flat.reduce(
        (acc, curr) => {
          if (!acc[curr.emotion]) acc[curr.emotion] = curr.tone;
          return acc;
        },
        {} as Record<string, string>
      ),
    [flat]
  );

  const mergedBarData = useMemo(
    () =>
      uniqueDates.map((date) => {
        const entry: Record<string, any> = { date };
        let total = 0;
        for (const emotion of uniqueEmotions) {
          const val = flat
            .filter((d) => d.date === date && d.emotion === emotion)
            .reduce((sum, d) => sum + d.intensity, 0);
          entry[emotion] = val;
          total += val;
        }
        if (normalizeBarChart && total > 0) {
          for (const emotion of uniqueEmotions) entry[emotion] = (entry[emotion] / total) * 100;
        }
        return entry;
      }),
    [uniqueDates, uniqueEmotions, normalizeBarChart]
  );

  const mergedAreaData = useMemo(
    () =>
      uniqueDates.map((date) => {
        const entry: Record<string, any> = { date };
        let total = 0;
        for (const tone of uniqueTones) {
          const val = flat
            .filter((d) => d.date === date && d.tone === tone)
            .reduce((sum, d) => sum + d.intensity, 0);
          entry[tone] = val;
          total += val;
        }
        if (normalizeArea && total > 0) {
          for (const tone of uniqueTones) entry[tone] = (entry[tone] / total) * 100;
        }
        return entry;
      }),
    [uniqueDates, uniqueTones, normalizeArea]
  );

  const selectedEmotionData = useMemo(
    () => flat.filter((d) => d.emotion === selectedEmotion),
    [flat, selectedEmotion]
  );
  const CustomDot = (props: any) => {
    const { cx, cy, payload } = props;
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

  const CustomLegend = () => (
    <Legend
      verticalAlign="top"
      align="left"
      content={() => (
        <div className="mb-2 flex flex-wrap gap-4 text-sm text-zinc-700 dark:text-zinc-200">
          {uniqueTones.map((tone) => {
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

  const CustomBarTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) return null;

    const entries = payload.filter((p: any) => p?.dataKey && p?.value > 0);
    if (!entries?.length) return null;

    const total = entries.reduce((acc: number, current: any) => {
      acc += current.value;
      return acc;
    }, 0);

    const emotionsData = entries.map((entry: any) => {
      const { dataKey: emotion, value, fill } = entry;
      const percent = total > 0 ? ((value / total) * 100).toFixed(1) : "0.0";
      return { emotion, value, percent, fill };
    });

    return (
      <div className="rounded bg-white p-2 text-xs shadow">
        <div className="mb-1 font-semibold">Date: {label}</div>
        {emotionsData.map((emotionData: any) => (
          <div className="flex items-center justify-between gap-2">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: emotionData.fill }} />
            <span className="flex-1 capitalize">{emotionData.emotion}</span>
            <span className="text-right">
              {emotionData.value.toFixed(2)} ({emotionData.percent}%)
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="relative p-4">
      <h1 className="mb-4 text-xl font-bold text-zinc-800 dark:text-zinc-100">📈 Emotion Trends</h1>

      <div className="mb-4 flex flex-wrap items-center gap-4">
        {(emotionFilter.length > 0 ||
          toneFilter.length > 0 ||
          intensityFilter[0] !== 0.1 ||
          intensityFilter[1] !== 1 ||
          range.from ||
          range.to) && (
          <div className="animate-fade-in mb-4 flex w-full justify-end">
            <ClearFiltersButton
              onClick={() => {
                setEmotionFilter([]);
                setToneFilter([]);
                setIntensityFilter([0.1, 1]);
                setRange({ from: "", to: "" });
              }}
            />
          </div>
        )}

        <MultiSelectFilter
          label="Emotions"
          values={emotionFilter}
          options={uniqueEmotions}
          onChange={setEmotionFilter}
        />
        <MultiSelectFilter
          label="Tone"
          values={toneFilter}
          options={uniqueTones}
          onChange={setToneFilter}
        />
        <Slider
          type="range"
          label="Intensity"
          min={0.1}
          max={1}
          step={0.1}
          value={intensityFilter}
          onChange={setIntensityFilter}
        />
        <DateRangePicker value={range} onChange={setRange} />
        <Select
          label="Chart Type"
          value={chartType}
          onChange={(e) => setChartType(e.target.value as any)}
          options={[
            { value: "line", label: "Line" },
            { value: "bar", label: "Bar" },
            { value: "area", label: "Area" },
          ]}
        />
        {chartType === "bar" && (
          <>
            <Toggle
              label="Group Bars"
              checked={!stackedBars}
              onChange={() => setStackedBars((prev) => !prev)}
            />
            <Toggle
              checked={normalizeBarChart}
              onChange={() => setNormalizeBarChart((p) => !p)}
              label="Normalize Bar"
            />
          </>
        )}
        {chartType === "area" && (
          <Toggle
            checked={normalizeArea}
            onChange={() => setNormalizeArea((p) => !p)}
            label="Normalize Area"
          />
        )}
        {chartType === "line" && (
          <Select
            label="Emotion"
            value={selectedEmotion}
            onChange={(e) => setSelectedEmotion(e.target.value)}
            options={uniqueEmotions.map((e) => ({ value: e, label: e }))}
          />
        )}
      </div>

      {loading ? (
        <Spinner />
      ) : (
        <div className="h-[400px]">
          {chartType === "line" && selectedEmotion && (
            <ResponsiveContainer>
              <LineChart data={selectedEmotionData}>
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line dataKey="intensity" stroke="#8884d8" dot={<CustomDot />} />
              </LineChart>
            </ResponsiveContainer>
          )}

          {chartType === "bar" && (
            <ResponsiveContainer>
              <BarChart data={mergedBarData} barGap={4} barCategoryGap={stackedBars ? 0 : 16}>
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip content={<CustomBarTooltip />} />
                <CustomLegend />
                {uniqueEmotions.map((emotion) => {
                  const tone = toneByEmotion[emotion];
                  const color =
                    tone === "positive" ? "#2ecc71" : tone === "negative" ? "#e74c3c" : "#f1c40f";

                  return (
                    <Bar
                      key={emotion}
                      dataKey={emotion}
                      name={emotion} // ← THIS IS CRITICAL
                      stackId={stackedBars ? "a" : undefined}
                      fill={stackedBars ? color : "rgba(0,0,0,0.01)"}
                      stroke={color}
                      strokeWidth={stackedBars ? 0 : 2}
                      radius={[4, 4, 0, 0]}
                    >
                      <LabelList
                        dataKey={emotion}
                        position="top"
                        formatter={(val: number, entry: any) => {
                          if (!val || isNaN(val) || !entry) return "";
                          const total = Object.entries(entry)
                            .filter(([k, v]) => typeof v === "number")
                            .reduce((sum, [, v]) => sum + (v as number), 0);
                          const percent = total > 0 ? ((val / total) * 100).toFixed(1) : "";
                          return `${val.toFixed(2)} (${percent}%)`;
                        }}
                        style={{ fontSize: "10px", fill: "#111" }}
                      />
                    </Bar>
                  );
                })}
              </BarChart>
            </ResponsiveContainer>
          )}

          {chartType === "area" && (
            <ResponsiveContainer>
              <AreaChart data={mergedAreaData}>
                <XAxis dataKey="date" />
                <YAxis domain={[0, normalizeArea ? 100 : "auto"]} />
                <Tooltip />
                <CustomLegend />
                {Array.from(uniqueTones).map((tone) => (
                  <Area
                    key={tone}
                    type="monotone"
                    dataKey={tone}
                    name={tone.charAt(0).toUpperCase() + tone.slice(1)}
                    stroke={
                      tone === "positive" ? "#2ecc71" : tone === "negative" ? "#e74c3c" : "#f1c40f"
                    }
                    fill={
                      tone === "positive" ? "#2ecc71" : tone === "negative" ? "#e74c3c" : "#f1c40f"
                    }
                    fillOpacity={0.3}
                    stackId="1"
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      )}
    </div>
  );
}

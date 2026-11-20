import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { StatsSample } from "@/engine";
import { useI18n } from "@/i18n";
import type { TranslationKey } from "@/i18n";
import type { ReactNode } from "react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { formatCompact } from "./format";

export interface SeriesDef {
  key: string;
  labelKey?: TranslationKey;
  label?: string;
  /** Chart token index: 1 herbivore, 2 predator, 3 plant, 4 energy, 5 diversity. */
  tone: ChartTone;
  value: (s: StatsSample) => number;
}

export type ChartTone = 1 | 2 | 3 | 4 | 5;

const TONE_SWATCH: Record<ChartTone, string> = {
  1: "bg-chart-1",
  2: "bg-chart-2",
  3: "bg-chart-3",
  4: "bg-chart-4",
  5: "bg-chart-5",
};

interface Props {
  titleKey: TranslationKey;
  data: StatsSample[];
  series: SeriesDef[];
  ocid: string;
  digits?: number;
  controls?: ReactNode;
}

/** Hairline-sectioned line chart over the sampled statistics history. */
export function StatsLineChart({
  titleKey,
  data,
  series,
  ocid,
  digits = 0,
  controls,
}: Props) {
  const { t } = useI18n();
  const config: ChartConfig = {};
  for (const s of series)
    config[s.key] = {
      label: s.label ?? (s.labelKey ? t(s.labelKey) : s.key),
      color: `oklch(var(--chart-${s.tone}))`,
    };

  const rows = data.map((d) => {
    const row: Record<string, number | null> = { cycle: d.cycle };
    for (const s of series) {
      const v = s.value(d);
      row[s.key] = Number.isFinite(v) ? Number(v.toFixed(digits + 2)) : null;
    }
    return row;
  });

  return (
    <section
      className="border-b border-border px-4 py-3"
      aria-label={t(titleKey)}
      data-ocid={`${ocid}.section`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="section-label">{t(titleKey)}</h3>
        <ul className="flex flex-wrap items-center gap-3">
          {series.map((s) => (
            <li
              key={s.key}
              className="flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground"
            >
              <span
                className={`h-0.5 w-3 rounded-full ${TONE_SWATCH[s.tone]}`}
                aria-hidden="true"
              />
              {config[s.key].label}
            </li>
          ))}
        </ul>
      </div>
      {controls}
      <ChartContainer
        config={config}
        className="mt-2 aspect-auto h-36 w-full"
        data-ocid={`${ocid}.chart_point`}
      >
        <LineChart
          data={rows}
          margin={{ top: 4, right: 4, bottom: 0, left: -8 }}
        >
          <CartesianGrid vertical={false} strokeDasharray="2 4" />
          <XAxis
            dataKey="cycle"
            type="number"
            domain={["dataMin", "dataMax"]}
            tickLine={false}
            axisLine={false}
            tickMargin={6}
            minTickGap={32}
            tickFormatter={(v: number) => formatCompact(v)}
            fontSize={10}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={40}
            tickFormatter={(v: number) => formatCompact(v)}
            fontSize={10}
          />
          <ChartTooltip
            cursor={{ strokeDasharray: "2 2" }}
            content={
              <ChartTooltipContent
                indicator="line"
                labelFormatter={(_, payload) =>
                  t("timeline.cycleAt", {
                    cycle: String(payload?.[0]?.payload?.cycle ?? ""),
                  })
                }
              />
            }
          />
          {series.map((s) => (
            <Line
              key={s.key}
              dataKey={s.key}
              type="monotone"
              stroke={`var(--color-${s.key})`}
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 3 }}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ChartContainer>
    </section>
  );
}

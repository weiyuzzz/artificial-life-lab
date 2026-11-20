import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { OverlayRow } from "./compareData";

export interface OverlaySeries {
  dataKey: string;
  label: string;
  color: string;
  /** Experiment B is drawn dashed so both runs stay distinguishable. */
  dashed: boolean;
}

export const SERIES_COLORS = {
  herbivore: "oklch(var(--chart-1))",
  predator: "oklch(var(--chart-2))",
  plants: "oklch(var(--chart-3))",
} as const;

const AXIS_TICK = { fill: "oklch(var(--muted-foreground))", fontSize: 11 };

function formatTick(value: number) {
  return Math.abs(value) >= 1000
    ? `${(value / 1000).toFixed(1)}k`
    : `${Math.round(value * 100) / 100}`;
}

export function OverlayChart({
  title,
  rows,
  series,
  ocid,
  controls,
}: {
  title: string;
  rows: OverlayRow[];
  series: OverlaySeries[];
  ocid: string;
  controls?: React.ReactNode;
}) {
  return (
    <section
      className="rounded-lg border border-border bg-card p-4"
      data-ocid={ocid}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="section-label">{title}</h2>
        {controls}
      </div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={rows}
            margin={{ top: 4, right: 12, bottom: 0, left: -8 }}
          >
            <CartesianGrid
              stroke="oklch(var(--border))"
              strokeDasharray="2 4"
              vertical={false}
            />
            <XAxis
              dataKey="cycle"
              type="number"
              domain={["dataMin", "dataMax"]}
              tick={AXIS_TICK}
              tickFormatter={formatTick}
              stroke="oklch(var(--border))"
            />
            <YAxis
              tick={AXIS_TICK}
              tickFormatter={formatTick}
              stroke="oklch(var(--border))"
              width={48}
            />
            <Tooltip
              contentStyle={{
                background: "oklch(var(--popover))",
                border: "1px solid oklch(var(--border))",
                borderRadius: 6,
                fontSize: 12,
              }}
              labelStyle={{ color: "oklch(var(--muted-foreground))" }}
              labelFormatter={(cycle) => `C${cycle}`}
              formatter={(value: number) =>
                Math.round(Number(value) * 1000) / 1000
              }
            />
            <Legend
              wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
              iconType="plainline"
            />
            {series.map((s) => (
              <Line
                key={s.dataKey}
                dataKey={s.dataKey}
                name={s.label}
                stroke={s.color}
                strokeWidth={s.dashed ? 1.75 : 2}
                strokeDasharray={s.dashed ? "6 4" : undefined}
                strokeOpacity={s.dashed ? 0.85 : 1}
                dot={false}
                connectNulls
                isAnimationActive={false}
                type="monotone"
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

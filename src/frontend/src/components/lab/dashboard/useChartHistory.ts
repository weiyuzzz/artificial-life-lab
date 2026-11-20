import type { StatsSample } from "@/engine";
import { useSimStore } from "@/store/useSimStore";
import { useRef } from "react";

/** Maximum points rendered per chart line, regardless of history length. */
export const MAX_CHART_POINTS = 160;

function downsample(history: StatsSample[], max: number): StatsSample[] {
  if (history.length <= max) return history;
  const step = (history.length - 1) / (max - 1);
  const out: StatsSample[] = [];
  for (let i = 0; i < max - 1; i++) out.push(history[Math.round(i * step)]);
  out.push(history[history.length - 1]);
  return out;
}

/**
 * Bounded, downsampled view of statsHistory. The store re-slices the history on
 * every UI sync; this only produces a new array when a new sample arrives, so
 * charts update at the sampling interval rather than every frame.
 */
export function useChartHistory(): StatsSample[] {
  const history = useSimStore((s) => s.statsHistory);
  const cache = useRef<{ key: string; data: StatsSample[] }>({
    key: "",
    data: [],
  });
  const last = history[history.length - 1];
  const key = `${history.length}:${history[0]?.cycle ?? -1}:${last?.cycle ?? -1}`;
  if (cache.current.key !== key) {
    cache.current = { key, data: downsample(history, MAX_CHART_POINTS) };
  }
  return cache.current.data;
}

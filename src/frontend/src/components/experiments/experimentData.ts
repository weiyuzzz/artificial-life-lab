import type { StatChunk, Timestamp } from "@/backend";
import {
  type ExperimentData,
  SNAPSHOT_VERSION,
  type SimParams,
  type SimSnapshot,
  type StatsSample,
  type TimelineEntry,
} from "@/engine";
import type { Language } from "@/lib/types";

/** Snapshot as persisted: the engine snapshot plus the evolution timeline. */
export type StoredSnapshot = SimSnapshot & { timeline?: TimelineEntry[] };

export const SNAPSHOT_PART_BYTES = 900_000;
export const SAMPLES_PER_CHUNK = 400;
const MAX_HISTORY = 3000;

export interface RunSummary {
  h: number;
  p: number;
  pl: number;
  g: number;
}

export function encodeSummary(sample: StatsSample | null): string {
  if (!sample) return "";
  const summary: RunSummary = {
    h: sample.herbivore.count,
    p: sample.predator.count,
    pl: sample.plants,
    g: sample.maxGeneration,
  };
  return JSON.stringify(summary);
}

export function decodeSummary(text: string): RunSummary | null {
  try {
    const v = JSON.parse(text) as Partial<RunSummary> | null;
    if (v && typeof v.h === "number" && typeof v.p === "number")
      return { h: v.h, p: v.p, pl: v.pl ?? 0, g: v.g ?? 0 };
  } catch {
    // free-text summary
  }
  return null;
}

export function initialPopulation(params: SimParams) {
  return {
    herbivores: params.initialHerbivores,
    predators: params.initialPredators,
    plants: params.initialPlants,
  };
}

export function parseParams(json: string): Partial<SimParams> {
  try {
    const v = JSON.parse(json) as Partial<SimParams> | null;
    return v && typeof v === "object" ? v : {};
  } catch {
    return {};
  }
}

/** Merge chunks into one history: later chunks win per cycle, cut at `maxCycle`. */
export function rebuildHistory(
  chunks: StatChunk[],
  maxCycle: number,
): StatsSample[] {
  const byCycle = new Map<number, StatsSample>();
  for (const chunk of chunks) {
    try {
      const samples = JSON.parse(chunk.data) as StatsSample[];
      if (!Array.isArray(samples)) continue;
      for (const s of samples)
        if (s && typeof s.cycle === "number" && s.cycle <= maxCycle)
          byCycle.set(s.cycle, s);
    } catch {
      // skip a corrupt chunk; the rest of the series still loads
    }
  }
  return [...byCycle.values()]
    .sort((a, b) => a.cycle - b.cycle)
    .slice(-MAX_HISTORY);
}

export function nextChunkIndex(chunks: StatChunk[]): number {
  return chunks.reduce((m, c) => Math.max(m, Number(c.chunkIndex) + 1), 0);
}

export function toExperimentData(
  name: string,
  snapshot: StoredSnapshot,
  history: StatsSample[],
): ExperimentData {
  return {
    format: "alife-experiment",
    version: SNAPSHOT_VERSION,
    name,
    params: snapshot.params,
    seed: snapshot.params.seed,
    initialPopulation: initialPopulation(snapshot.params),
    statsHistory: history,
    timeline: (snapshot.timeline ?? []).filter(
      (e) => e.cycle <= snapshot.cycle,
    ),
    snapshot,
  };
}

export function chunkSamples(samples: StatsSample[]): StatsSample[][] {
  const out: StatsSample[][] = [];
  for (let i = 0; i < samples.length; i += SAMPLES_PER_CHUNK)
    out.push(samples.slice(i, i + SAMPLES_PER_CHUNK));
  return out;
}

export function formatTimestamp(ts: Timestamp, language: Language): string {
  const date = new Date(Number(ts / 1_000_000n));
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(language === "zh" ? "zh-CN" : "en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function fileSlug(name: string | null | undefined): string {
  const slug = (name ?? "")
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return slug || "alife-experiment";
}

export function downloadText(filename: string, text: string, mime: string) {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

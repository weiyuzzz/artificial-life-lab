import type { StatChunk } from "@/backend";
import type { GeneKey, StatsSample } from "@/engine";

/** Maximum plotted points per experiment; longer runs are evenly thinned. */
const MAX_POINTS = 600;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSample(value: unknown): value is StatsSample {
  return (
    isRecord(value) &&
    typeof value.cycle === "number" &&
    isRecord(value.herbivore) &&
    isRecord(value.predator)
  );
}

/** Parses a JSON object string; returns null for anything else. */
export function parseJsonObject(text: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(text);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** Extracts StatsSample rows from every chunk, deduplicated by cycle and sorted. */
export function parseStatChunks(chunks: StatChunk[]): StatsSample[] {
  const byCycle = new Map<number, StatsSample>();
  for (const chunk of chunks) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(chunk.data);
    } catch {
      continue;
    }
    let rows: unknown[] = [];
    if (Array.isArray(parsed)) rows = parsed;
    else if (isRecord(parsed)) {
      if (Array.isArray(parsed.stats)) rows = parsed.stats;
      else if (Array.isArray(parsed.statsHistory)) rows = parsed.statsHistory;
    }
    for (const row of rows) {
      if (isSample(row)) byCycle.set(row.cycle, row);
    }
  }
  return [...byCycle.values()].sort((a, b) => a.cycle - b.cycle);
}

function thin(samples: StatsSample[]): StatsSample[] {
  if (samples.length <= MAX_POINTS) return samples;
  const step = samples.length / MAX_POINTS;
  const out: StatsSample[] = [];
  for (let i = 0; i < MAX_POINTS; i++) out.push(samples[Math.floor(i * step)]);
  const last = samples[samples.length - 1];
  if (out[out.length - 1] !== last) out.push(last);
  return out;
}

export type OverlayRow = { cycle: number } & Record<string, number | null>;
export type FieldPick = Record<string, (s: StatsSample) => number>;

/** Merges both experiments on a shared cycle axis; keys are `a_<field>` / `b_<field>`. */
export function overlay(
  a: StatsSample[],
  b: StatsSample[],
  fields: FieldPick,
): OverlayRow[] {
  const rows = new Map<number, OverlayRow>();
  const add = (prefix: "a" | "b", samples: StatsSample[]) => {
    for (const s of thin(samples)) {
      const row = rows.get(s.cycle) ?? ({ cycle: s.cycle } as OverlayRow);
      for (const [field, get] of Object.entries(fields)) {
        const v = get(s);
        row[`${prefix}_${field}`] = Number.isFinite(v) ? v : null;
      }
      rows.set(s.cycle, row);
    }
  };
  add("a", a);
  add("b", b);
  return [...rows.values()].sort((x, y) => x.cycle - y.cycle);
}

export const POPULATION_FIELDS: FieldPick = {
  herbivore: (s) => s.herbivore.count,
  predator: (s) => s.predator.count,
};

export const PLANT_FIELDS: FieldPick = { plants: (s) => s.plants };

export function geneFields(gene: GeneKey): FieldPick {
  return {
    herbivore: (s) => s.herbivore.genes?.[gene] ?? Number.NaN,
    predator: (s) => s.predator.genes?.[gene] ?? Number.NaN,
  };
}

export function peak(samples: StatsSample[], get: (s: StatsSample) => number) {
  return samples.length ? Math.max(...samples.map(get)) : null;
}

export function last(samples: StatsSample[], get: (s: StatsSample) => number) {
  return samples.length ? get(samples[samples.length - 1]) : null;
}

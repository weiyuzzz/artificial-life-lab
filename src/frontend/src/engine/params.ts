import type { EdgeMode } from "./types";

export interface SimParams {
  temperature: number;
  plantGrowthRate: number;
  foodAmount: number;
  resourceRegenRate: number;
  initialHerbivores: number;
  initialPredators: number;
  initialPlants: number;
  mutationProbability: number;
  reproductionEnergy: number;
  basalMetabolism: number;
  worldWidth: number;
  worldHeight: number;
  edgeMode: EdgeMode;
  seed: number;
  maxPopulation: number;
  maxPlants: number;
}

export type ParamKey = keyof SimParams;
export type NumericParamKey = Exclude<ParamKey, "edgeMode">;

export const DEFAULT_PARAMS: SimParams = {
  temperature: 20,
  plantGrowthRate: 1,
  foodAmount: 30,
  resourceRegenRate: 1,
  initialHerbivores: 400,
  initialPredators: 50,
  initialPlants: 1000,
  mutationProbability: 0.08,
  reproductionEnergy: 60,
  basalMetabolism: 1,
  worldWidth: 1000,
  worldHeight: 700,
  edgeMode: "bounce",
  seed: 20260101,
  maxPopulation: 1600,
  maxPlants: 2500,
};

export interface ParamMeta {
  key: ParamKey;
  kind: "number" | "integer" | "edgeMode" | "seed";
  min: number;
  max: number;
  step: number;
  /** True when a change only takes effect after reset. */
  requiresReset: boolean;
}

export const PARAM_META: readonly ParamMeta[] = [
  {
    key: "temperature",
    kind: "number",
    min: -10,
    max: 45,
    step: 0.5,
    requiresReset: false,
  },
  {
    key: "plantGrowthRate",
    kind: "number",
    min: 0,
    max: 3,
    step: 0.05,
    requiresReset: false,
  },
  {
    key: "foodAmount",
    kind: "number",
    min: 5,
    max: 100,
    step: 1,
    requiresReset: false,
  },
  {
    key: "resourceRegenRate",
    kind: "number",
    min: 0,
    max: 3,
    step: 0.05,
    requiresReset: false,
  },
  {
    key: "initialHerbivores",
    kind: "integer",
    min: 0,
    max: 1500,
    step: 10,
    requiresReset: true,
  },
  {
    key: "initialPredators",
    kind: "integer",
    min: 0,
    max: 400,
    step: 5,
    requiresReset: true,
  },
  {
    key: "initialPlants",
    kind: "integer",
    min: 0,
    max: 3000,
    step: 50,
    requiresReset: true,
  },
  {
    key: "mutationProbability",
    kind: "number",
    min: 0,
    max: 0.5,
    step: 0.01,
    requiresReset: false,
  },
  {
    key: "reproductionEnergy",
    kind: "number",
    min: 20,
    max: 150,
    step: 1,
    requiresReset: false,
  },
  {
    key: "basalMetabolism",
    kind: "number",
    min: 0.2,
    max: 3,
    step: 0.05,
    requiresReset: false,
  },
  {
    key: "worldWidth",
    kind: "integer",
    min: 400,
    max: 3000,
    step: 50,
    requiresReset: true,
  },
  {
    key: "worldHeight",
    kind: "integer",
    min: 300,
    max: 2000,
    step: 50,
    requiresReset: true,
  },
  {
    key: "edgeMode",
    kind: "edgeMode",
    min: 0,
    max: 1,
    step: 1,
    requiresReset: false,
  },
  {
    key: "seed",
    kind: "seed",
    min: 0,
    max: 4294967295,
    step: 1,
    requiresReset: true,
  },
  {
    key: "maxPopulation",
    kind: "integer",
    min: 100,
    max: 4000,
    step: 50,
    requiresReset: false,
  },
  {
    key: "maxPlants",
    kind: "integer",
    min: 100,
    max: 6000,
    step: 100,
    requiresReset: false,
  },
];

export const RESET_REQUIRED_PARAMS: readonly ParamKey[] = PARAM_META.filter(
  (m) => m.requiresReset,
).map((m) => m.key);

export function paramRequiresReset(key: ParamKey): boolean {
  return RESET_REQUIRED_PARAMS.includes(key);
}

export function getParamMeta(key: ParamKey): ParamMeta {
  const meta = PARAM_META.find((m) => m.key === key);
  if (!meta) throw new Error(`Unknown param ${key}`);
  return meta;
}

/** Clamp and sanitize a full params object (used on reset and import). */
export function sanitizeParams(input: Partial<SimParams>): SimParams {
  const out: SimParams = { ...DEFAULT_PARAMS };
  for (const meta of PARAM_META) {
    const raw = input[meta.key];
    if (raw === undefined) continue;
    if (meta.kind === "edgeMode") {
      out.edgeMode = raw === "wrap" ? "wrap" : "bounce";
      continue;
    }
    const n = Number(raw);
    if (!Number.isFinite(n)) continue;
    let v = Math.min(meta.max, Math.max(meta.min, n));
    if (meta.kind !== "number") v = Math.round(v);
    if (meta.kind === "seed") v = v >>> 0;
    (out as unknown as Record<string, number>)[meta.key] = v;
  }
  return out;
}

/** Simulation speed multipliers available to the UI. */
export const SPEED_OPTIONS = [1, 2, 5, 10, 25] as const;
export type SpeedOption = (typeof SPEED_OPTIONS)[number];

/** Cycles simulated per real second at speed 1. */
export const BASE_CYCLES_PER_SECOND = 30;
/** Cycles between statistics samples. */
export const STATS_INTERVAL = 10;
/** Maximum retained statistics samples. */
export const MAX_STATS_HISTORY = 3000;
/** Maximum retained timeline entries. */
export const MAX_TIMELINE = 500;
/** Maximum lineage records retained before pruning dead ancestors. */
export const MAX_LINEAGE = 20000;
/** Trail ring buffer capacity in points. */
export const TRAIL_POINTS = 24;
/** Cycles between trail samples. */
export const TRAIL_INTERVAL = 3;

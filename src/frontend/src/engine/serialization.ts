import type { SimulationEngine } from "./engine";
import { createOrganism } from "./organisms";
import { type SimParams, sanitizeParams } from "./params";
import type { RngState } from "./rng";
import type { CollectorState } from "./statistics";
import type {
  ActiveEvent,
  BehaviorKey,
  Corpse,
  Genome,
  LineageRecord,
  Organism,
  Species,
  StatsSample,
  Terrain,
  TimelineEntry,
  WorldCounters,
} from "./types";
import { GENE_KEYS, ZONE_KEYS } from "./types";

/** Serialization: JSON-safe snapshots, chunking, experiment files, CSV. */

export const SNAPSHOT_VERSION = 1;

export interface SerializedOrganism {
  id: number;
  species: Species;
  x: number;
  y: number;
  vx: number;
  vy: number;
  heading: number;
  energy: number;
  health: number;
  age: number;
  generation: number;
  parentIds: [number, number] | null;
  genome: Genome;
  behavior: BehaviorKey;
  targetId: number;
  reproCooldown: number;
  attackCooldown: number;
  childrenCount: number;
  kills: number;
}

/** [id, x, y, amount, zoneIndex] */
export type SerializedPlant = [number, number, number, number, number];

export interface SimSnapshot {
  format: "alife-snapshot";
  version: number;
  params: SimParams;
  rngState: RngState;
  cycle: number;
  counters: WorldCounters;
  organisms: SerializedOrganism[];
  plants: SerializedPlant[];
  corpses: Corpse[];
  terrain: Terrain;
  lineage: LineageRecord[];
  activeEvents: ActiveEvent[];
  collector: CollectorState;
  currentGeneration: number;
}

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

function serializeOrganism(o: Organism): SerializedOrganism {
  return {
    id: o.id,
    species: o.species,
    x: o.x,
    y: o.y,
    vx: o.vx,
    vy: o.vy,
    heading: o.heading,
    energy: o.energy,
    health: o.health,
    age: o.age,
    generation: o.generation,
    parentIds: o.parentIds ? [o.parentIds[0], o.parentIds[1]] : null,
    genome: { genes: { ...o.genome.genes }, weights: o.genome.weights.slice() },
    behavior: o.behavior,
    targetId: o.targetId,
    reproCooldown: o.reproCooldown,
    attackCooldown: o.attackCooldown,
    childrenCount: o.childrenCount,
    kills: o.kills,
  };
}

function deserializeOrganism(s: SerializedOrganism): Organism {
  const genome: Genome = {
    genes: { ...s.genome.genes },
    weights: s.genome.weights.slice(),
  };
  for (const k of GENE_KEYS)
    if (typeof genome.genes[k] !== "number")
      throw new Error(`Missing gene ${k}`);
  const o = createOrganism({
    id: s.id,
    species: s.species,
    genome,
    x: s.x,
    y: s.y,
    heading: s.heading,
    generation: s.generation,
    parentIds: s.parentIds ? [s.parentIds[0], s.parentIds[1]] : null,
    energyFraction: 0,
    age: s.age,
  });
  o.vx = s.vx;
  o.vy = s.vy;
  o.energy = s.energy;
  o.health = s.health;
  o.behavior = s.behavior;
  o.targetId = s.targetId;
  o.reproCooldown = s.reproCooldown;
  o.attackCooldown = s.attackCooldown;
  o.childrenCount = s.childrenCount;
  o.kills = s.kills;
  return o;
}

/** Full JSON-safe world snapshot. Restoring it reproduces identical continuation. */
export function exportState(engine: SimulationEngine): SimSnapshot {
  return {
    format: "alife-snapshot",
    version: SNAPSHOT_VERSION,
    params: { ...engine.params },
    rngState: engine.rng.getState(),
    cycle: engine.cycle,
    counters: clone(engine.counters),
    organisms: engine.organisms.filter((o) => o.alive).map(serializeOrganism),
    plants: engine.plants.map((p) => [
      p.id,
      p.x,
      p.y,
      p.amount,
      ZONE_KEYS.indexOf(p.zone),
    ]),
    corpses: engine.corpses.map((c) => ({ ...c })),
    terrain: {
      cellSize: engine.terrain.cellSize,
      cols: engine.terrain.cols,
      rows: engine.terrain.rows,
      zones: engine.terrain.zones.slice(),
      soil: engine.terrain.soil.slice(),
    },
    lineage: engine.lineage.toArray(),
    activeEvents: engine.activeEvents.map((e) => ({ ...e })),
    collector: clone(engine.stats.state),
    currentGeneration: engine.stats.currentGeneration,
  };
}

export function isSnapshot(v: unknown): v is SimSnapshot {
  const s = v as SimSnapshot | null;
  return (
    !!s &&
    s.format === "alife-snapshot" &&
    Array.isArray(s.organisms) &&
    Array.isArray(s.rngState)
  );
}

/** Restore a snapshot into an engine. Stats history and timeline are kept unless provided. */
export function importState(
  engine: SimulationEngine,
  input: SimSnapshot,
  extra?: { history?: StatsSample[]; timeline?: TimelineEntry[] },
): void {
  if (!isSnapshot(input)) throw new Error("Invalid snapshot");
  const snap = clone(input);
  engine.params = sanitizeParams(snap.params);
  engine.rng.setState(snap.rngState);
  engine.cycle = snap.cycle;
  engine.counters = snap.counters;
  engine.organisms = snap.organisms.map(deserializeOrganism);
  engine.plants = snap.plants.map(([id, x, y, amount, z]) => ({
    id,
    x,
    y,
    amount,
    zone: ZONE_KEYS[z] ?? "grassland",
  }));
  engine.corpses = snap.corpses;
  engine.terrain = snap.terrain;
  engine.lineage.load(snap.lineage);
  engine.activeEvents = snap.activeEvents;
  engine.stats.state = snap.collector;
  engine.stats.currentGeneration = snap.currentGeneration;
  engine.stats.history = extra?.history ? clone(extra.history) : [];
  engine.stats.timeline = extra?.timeline ? clone(extra.timeline) : [];
  engine.afterLoad();
}

/** UTF-8 byte length of a string. */
export function byteLength(s: string): number {
  let n = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c < 0x80) n += 1;
    else if (c < 0x800) n += 2;
    else if (c >= 0xd800 && c <= 0xdbff) {
      n += 4;
      i++;
    } else n += 3;
  }
  return n;
}

/** Split a serialized string into parts each at most `maxBytes` UTF-8 bytes. */
export function splitSerialized(
  serialized: string,
  maxBytes: number,
): string[] {
  if (maxBytes < 4) throw new Error("maxBytes too small");
  const parts: string[] = [];
  let start = 0;
  let bytes = 0;
  for (let i = 0; i < serialized.length; i++) {
    const c = serialized.charCodeAt(i);
    const pair = c >= 0xd800 && c <= 0xdbff;
    const size = c < 0x80 ? 1 : c < 0x800 ? 2 : pair ? 4 : 3;
    if (bytes + size > maxBytes) {
      parts.push(serialized.slice(start, i));
      start = i;
      bytes = 0;
    }
    bytes += size;
    if (pair) i++;
  }
  if (start < serialized.length || parts.length === 0)
    parts.push(serialized.slice(start));
  return parts;
}

export function joinSerialized(parts: string[]): string {
  return parts.join("");
}

/** Convenience: snapshot → JSON parts. */
export function splitSnapshot(
  snapshot: SimSnapshot,
  maxBytes: number,
): string[] {
  return splitSerialized(JSON.stringify(snapshot), maxBytes);
}

export function joinSnapshot(parts: string[]): SimSnapshot {
  const parsed: unknown = JSON.parse(joinSerialized(parts));
  if (!isSnapshot(parsed)) throw new Error("Invalid snapshot");
  return parsed;
}

export interface ExperimentData {
  format: "alife-experiment";
  version: number;
  name: string | null;
  params: SimParams;
  seed: number;
  initialPopulation: { herbivores: number; predators: number; plants: number };
  statsHistory: StatsSample[];
  timeline: TimelineEntry[];
  snapshot: SimSnapshot;
}

export function buildExperiment(
  engine: SimulationEngine,
  name: string | null = null,
): ExperimentData {
  const p = engine.params;
  return {
    format: "alife-experiment",
    version: SNAPSHOT_VERSION,
    name,
    params: { ...p },
    seed: p.seed,
    initialPopulation: {
      herbivores: p.initialHerbivores,
      predators: p.initialPredators,
      plants: p.initialPlants,
    },
    statsHistory: engine.stats.history.slice(),
    timeline: engine.stats.timeline.slice(),
    snapshot: exportState(engine),
  };
}

export function exportExperimentJSON(
  engine: SimulationEngine,
  name: string | null = null,
): string {
  return JSON.stringify(buildExperiment(engine, name));
}

export function importExperimentJSON(json: string): ExperimentData {
  const data = JSON.parse(json) as ExperimentData;
  if (
    !data ||
    data.format !== "alife-experiment" ||
    !isSnapshot(data.snapshot)
  ) {
    throw new Error("Invalid experiment file");
  }
  data.params = sanitizeParams(data.params);
  data.statsHistory = Array.isArray(data.statsHistory) ? data.statsHistory : [];
  data.timeline = Array.isArray(data.timeline) ? data.timeline : [];
  return data;
}

/** Load a parsed experiment (snapshot + history + timeline) into the engine. */
export function loadExperiment(
  engine: SimulationEngine,
  data: ExperimentData,
): void {
  importState(engine, data.snapshot, {
    history: data.statsHistory,
    timeline: data.timeline,
  });
}

/** Statistics time series as CSV (one row per sample). */
export function statsToCSV(history: StatsSample[]): string {
  const speciesCols = (sp: Species) => [
    `${sp}_count`,
    `${sp}_births`,
    `${sp}_deaths`,
    `${sp}_avg_age`,
    `${sp}_avg_energy`,
    `${sp}_avg_reproduction_rate`,
    `${sp}_avg_lifespan`,
    `${sp}_max_generation`,
    ...GENE_KEYS.map((g) => `${sp}_gene_${g}`),
  ];
  const header = [
    "cycle",
    "temperature",
    "plants",
    "corpses",
    "births",
    "deaths",
    "total_births",
    "total_deaths",
    "deaths_starvation",
    "deaths_old_age",
    "deaths_predation",
    "deaths_injury",
    "energy_organisms",
    "energy_plants",
    "energy_corpses",
    "energy_total",
    "max_generation",
    ...speciesCols("herbivore"),
    ...speciesCols("predator"),
  ];
  const f = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(4));
  const rows = history.map((s) => {
    const spVals = (sp: Species) => {
      const x = s[sp];
      return [
        x.count,
        x.births,
        x.deaths,
        x.avgAge,
        x.avgEnergy,
        x.avgReproductionRate,
        x.avgLifespan,
        x.maxGeneration,
        ...GENE_KEYS.map((g) => x.genes[g]),
      ];
    };
    return [
      s.cycle,
      s.temperature,
      s.plants,
      s.corpses,
      s.births,
      s.deaths,
      s.totalBirths,
      s.totalDeaths,
      s.deathCauses.starvation,
      s.deathCauses.oldAge,
      s.deathCauses.predation,
      s.deathCauses.injury,
      s.energyOrganisms,
      s.energyPlants,
      s.energyCorpses,
      s.totalEnergy,
      s.maxGeneration,
      ...spVals("herbivore"),
      ...spVals("predator"),
    ]
      .map(f)
      .join(",");
  });
  return [header.join(","), ...rows].join("\n");
}

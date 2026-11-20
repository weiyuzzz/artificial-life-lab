// Core entity and data types for the artificial life engine.
// Pure TypeScript — no UI imports. All display text is produced by the UI
// from the keys and parameters defined here.

import type { Traits } from "./genetics";

export type Species = "herbivore" | "predator";
export const SPECIES: readonly Species[] = ["herbivore", "predator"];

export type GeneKey =
  | "speed"
  | "vision"
  | "metabolism"
  | "size"
  | "aggression"
  | "reproduction"
  | "efficiency";
export const GENE_KEYS: readonly GeneKey[] = [
  "speed",
  "vision",
  "metabolism",
  "size",
  "aggression",
  "reproduction",
  "efficiency",
];

export type Genes = Record<GeneKey, number>;

export interface Genome {
  genes: Genes;
  /** Flat neural network weights (see neuralNetwork.ts for layout). */
  weights: number[];
}

export type BehaviorKey =
  | "explore"
  | "searchFood"
  | "chase"
  | "escape"
  | "eat"
  | "reproduce"
  | "rest";
export const BEHAVIOR_KEYS: readonly BehaviorKey[] = [
  "explore",
  "searchFood",
  "chase",
  "escape",
  "eat",
  "reproduce",
  "rest",
];

export type ZoneKey = "grassland" | "arid" | "waterside";
export const ZONE_KEYS: readonly ZoneKey[] = ["grassland", "arid", "waterside"];

export type EdgeMode = "bounce" | "wrap";

export type DeathCause = "starvation" | "oldAge" | "predation" | "injury";
export const DEATH_CAUSES: readonly DeathCause[] = [
  "starvation",
  "oldAge",
  "predation",
  "injury",
];

export interface Activations {
  inputs: number[];
  hidden: number[];
  outputs: number[];
}

export interface Organism {
  id: number;
  species: Species;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Heading in radians. */
  heading: number;
  energy: number;
  maxEnergy: number;
  health: number;
  maxHealth: number;
  age: number;
  maxAge: number;
  /** Derived capabilities (from genes). */
  speed: number;
  vision: number;
  metabolism: number;
  reproductionRate: number;
  radius: number;
  generation: number;
  parentIds: [number, number] | null;
  genome: Genome;
  /** Full derived capability set (cached from genes). */
  traits: Traits;
  behavior: BehaviorKey;
  /** Target entity of current behavior, or -1. */
  targetId: number;
  /** Cycles until able to reproduce again. */
  reproCooldown: number;
  /** Cycles until able to attack again. */
  attackCooldown: number;
  childrenCount: number;
  kills: number;
  /** Trail ring buffer: [x0,y0,x1,y1,...]; trailHead = next write slot. */
  trail: number[];
  trailHead: number;
  trailLength: number;
  activations: Activations;
  alive: boolean;
}

export interface Plant {
  id: number;
  x: number;
  y: number;
  amount: number;
  zone: ZoneKey;
}

export interface Corpse {
  id: number;
  x: number;
  y: number;
  energy: number;
  initialEnergy: number;
  species: Species;
  age: number;
}

export interface Terrain {
  cellSize: number;
  cols: number;
  rows: number;
  /** Zone index per cell (index into ZONE_KEYS). */
  zones: number[];
  /** Soil nutrients per cell, boosted by decaying corpses. */
  soil: number[];
}

export interface LineageRecord {
  id: number;
  species: Species;
  generation: number;
  parents: [number, number] | null;
  children: number[];
  birthCycle: number;
  deathCycle: number | null;
  deathCause: DeathCause | null;
}

export type EventKey =
  | "drought"
  | "foodAbundance"
  | "predatorIntroduction"
  | "temperatureChange"
  | "mutationBoost";
export const EVENT_KEYS: readonly EventKey[] = [
  "drought",
  "foodAbundance",
  "predatorIntroduction",
  "temperatureChange",
  "mutationBoost",
];

export interface ActiveEvent {
  id: number;
  key: EventKey;
  startCycle: number;
  duration: number;
  remaining: number;
  /** Event strength: growth multiplier, spawn count, temperature delta or mutation multiplier. */
  magnitude: number;
}

export interface TriggerEventOptions {
  duration?: number;
  magnitude?: number;
}

export type TimelineType =
  | "simulationStart"
  | "generationMilestone"
  | "geneShift"
  | "populationBoom"
  | "populationCrash"
  | "extinction"
  | "eventStarted"
  | "eventEnded";
export const TIMELINE_TYPES: readonly TimelineType[] = [
  "simulationStart",
  "generationMilestone",
  "geneShift",
  "populationBoom",
  "populationCrash",
  "extinction",
  "eventStarted",
  "eventEnded",
];

export interface TimelineEntry {
  id: number;
  cycle: number;
  /** Highest generation alive (any species) at the time of the entry. */
  generation: number;
  type: TimelineType;
  params: Record<string, number | string>;
}

export interface SpeciesStats {
  count: number;
  births: number;
  deaths: number;
  avgAge: number;
  avgEnergy: number;
  avgReproductionRate: number;
  avgLifespan: number;
  maxGeneration: number;
  genes: Genes;
}

export interface StatsSample {
  cycle: number;
  temperature: number;
  herbivore: SpeciesStats;
  predator: SpeciesStats;
  plants: number;
  corpses: number;
  /** Births and deaths during the sample interval (both species). */
  births: number;
  deaths: number;
  totalBirths: number;
  totalDeaths: number;
  deathCauses: Record<DeathCause, number>;
  energyOrganisms: number;
  energyPlants: number;
  energyCorpses: number;
  totalEnergy: number;
  maxGeneration: number;
}

export interface WorldCounters {
  nextOrganismId: number;
  nextPlantId: number;
  nextCorpseId: number;
  nextEventId: number;
  totalBirths: number;
  totalDeaths: number;
  births: Record<Species, number>;
  deaths: Record<Species, number>;
  deathCauses: Record<DeathCause, number>;
  lifespanSum: Record<Species, number>;
  lifespanCount: Record<Species, number>;
}

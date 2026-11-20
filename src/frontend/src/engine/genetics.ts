import {
  createInitialWeights,
  crossoverWeights,
  mutateWeights,
} from "./neuralNetwork";
import type { Rng } from "./rng";
import type { GeneKey, Genes, Genome, Species } from "./types";
import { GENE_KEYS } from "./types";

export interface GeneRange {
  min: number;
  max: number;
}

/** Absolute allowed ranges for every gene. */
export const GENE_RANGES: Record<GeneKey, GeneRange> = {
  speed: { min: 0.4, max: 3.2 },
  vision: { min: 25, max: 180 },
  metabolism: { min: 0.5, max: 1.6 },
  size: { min: 0.5, max: 2.2 },
  aggression: { min: 0, max: 1 },
  reproduction: { min: 0, max: 1 },
  efficiency: { min: 0.3, max: 1 },
};

/** Initial random ranges per species (subset of GENE_RANGES). */
const INITIAL_RANGES: Record<Species, Record<GeneKey, GeneRange>> = {
  herbivore: {
    speed: { min: 1.1, max: 1.8 },
    vision: { min: 50, max: 90 },
    metabolism: { min: 0.8, max: 1.2 },
    size: { min: 0.8, max: 1.2 },
    aggression: { min: 0, max: 0.35 },
    reproduction: { min: 0.35, max: 0.65 },
    efficiency: { min: 0.6, max: 0.85 },
  },
  predator: {
    speed: { min: 1.2, max: 1.8 },
    vision: { min: 70, max: 120 },
    metabolism: { min: 0.8, max: 1.2 },
    size: { min: 1, max: 1.5 },
    aggression: { min: 0.45, max: 0.85 },
    reproduction: { min: 0.3, max: 0.6 },
    efficiency: { min: 0.6, max: 0.85 },
  },
};

export function clampGene(key: GeneKey, value: number): number {
  const r = GENE_RANGES[key];
  return value < r.min ? r.min : value > r.max ? r.max : value;
}

export function randomGenes(species: Species, rng: Rng): Genes {
  const ranges = INITIAL_RANGES[species];
  const genes = {} as Genes;
  for (const key of GENE_KEYS)
    genes[key] = rng.range(ranges[key].min, ranges[key].max);
  return genes;
}

export function randomGenome(species: Species, rng: Rng): Genome {
  return {
    genes: randomGenes(species, rng),
    weights: createInitialWeights(species, rng),
  };
}

/**
 * Child genome: blend both parents' genes (random weighted average), then
 * point-mutate each gene with probability `mutationProb` — mostly small
 * Gaussian changes (5% of range), occasionally large ones (25% of range).
 */
export function inheritGenome(
  a: Genome,
  b: Genome,
  mutationProb: number,
  rng: Rng,
): Genome {
  const genes = {} as Genes;
  for (const key of GENE_KEYS) {
    const t = rng.range(0.25, 0.75);
    let v = a.genes[key] * t + b.genes[key] * (1 - t);
    if (rng.chance(mutationProb)) {
      const span = GENE_RANGES[key].max - GENE_RANGES[key].min;
      const scale = rng.chance(0.1) ? 0.25 : 0.05;
      v += rng.gaussian() * span * scale;
    }
    genes[key] = clampGene(key, v);
  }
  const weights = crossoverWeights(a.weights, b.weights, rng);
  mutateWeights(weights, mutationProb, rng);
  return { genes, weights };
}

export function cloneGenome(g: Genome): Genome {
  return { genes: { ...g.genes }, weights: g.weights.slice() };
}

/** Derived capabilities from genes and species. */
export interface Traits {
  maxSpeed: number;
  vision: number;
  radius: number;
  maxEnergy: number;
  maxHealth: number;
  maxAge: number;
  /** Basal energy burn multiplier (before temperature and global param). */
  metabolism: number;
  /** Energy needed (fraction of global reproduction energy) to reproduce. */
  reproThresholdFactor: number;
  litterSize: number;
  attackDamage: number;
  attackCost: number;
  efficiency: number;
  /** 0..1 reproduction rate indicator for stats. */
  reproductionRate: number;
}

export function deriveTraits(species: Species, genes: Genes): Traits {
  const pred = species === "predator";
  const size = genes.size;
  const sizeSpeedFactor = 1.15 - 0.18 * (size - 1);
  const repro = genes.reproduction;
  return {
    // Faster metabolism powers faster movement; efficiency and vision cost upkeep.
    maxSpeed: genes.speed * sizeSpeedFactor * (0.8 + 0.2 * genes.metabolism),
    vision: genes.vision,
    radius: (pred ? 4.6 : 3.6) * (0.7 + 0.3 * size),
    maxEnergy: (pred ? 160 : 110) * (0.6 + 0.4 * size),
    maxHealth: 100 * (0.6 + 0.4 * size),
    maxAge: (pred ? 2600 : 2200) * (0.85 + 0.15 * size) * (1.15 - 0.3 * repro),
    metabolism:
      genes.metabolism *
      (0.55 + 0.45 * size) *
      (0.8 + 0.3 * genes.efficiency) *
      (0.85 + genes.vision / 600),
    reproThresholdFactor: 1.35 - 0.7 * repro,
    litterSize: pred
      ? repro > 0.55
        ? 2
        : 1
      : repro > 0.8
        ? 3
        : repro > 0.45
          ? 2
          : 1,
    attackDamage: 8 * size * (0.5 + genes.aggression),
    attackCost: 0.8 * size,
    efficiency: genes.efficiency,
    reproductionRate: repro,
  };
}

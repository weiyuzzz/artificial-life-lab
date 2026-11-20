import { maturityAge } from "./organisms";
import type { SimParams } from "./params";
import type { Rng } from "./rng";
import type { Organism } from "./types";

/** Reproduction: readiness, mating cost, litter creation inputs. */

export function reproductionThreshold(
  org: Organism,
  params: SimParams,
): number {
  const speciesFactor = org.species === "predator" ? 1.4 : 1.15;
  const t =
    params.reproductionEnergy *
    org.traits.reproThresholdFactor *
    speciesFactor *
    (0.7 + 0.3 * org.genome.genes.size);
  return Math.min(t, org.maxEnergy * 0.92);
}

export function isReadyToMate(org: Organism, params: SimParams): boolean {
  return (
    org.alive &&
    org.reproCooldown <= 0 &&
    org.age >= maturityAge(org) &&
    org.energy >= reproductionThreshold(org, params)
  );
}

export interface LitterPlan {
  count: number;
  /** Energy each child starts with. */
  childEnergy: number;
  /** Energy cost paid by each parent. */
  parentCost: number;
}

export function planLitter(a: Organism, b: Organism, rng: Rng): LitterPlan {
  const avg = (a.traits.litterSize + b.traits.litterSize) / 2;
  let count = Math.floor(avg);
  if (rng.chance(avg - count)) count++;
  count = Math.max(1, count);
  const sizeAvg = (a.genome.genes.size + b.genome.genes.size) / 2;
  const childEnergy =
    (a.species === "predator" ? 45 : 28) * (0.6 + 0.4 * sizeAvg);
  const parentCost = (count * childEnergy) / 2 + 4 * sizeAvg;
  return { count, childEnergy, parentCost };
}

export function reproductionCooldown(org: Organism): number {
  const base = org.species === "predator" ? 360 : 300;
  return Math.round(base * (1.4 - 0.8 * org.genome.genes.reproduction));
}

import type { Organism, Species } from "./types";

/** Energy system: metabolic costs, temperature stress, food conversion. */

export const OPTIMAL_TEMPERATURE: Record<Species, number> = {
  herbivore: 18,
  predator: 24,
};

const BASAL_COST = 0.05;
const MOVE_COST = 0.011;

/**
 * Temperature stress multiplier (>= 1). Cold hurts small bodies more
 * (heat loss), heat hurts large bodies more (overheating).
 */
export function temperatureStress(
  species: Species,
  size: number,
  temp: number,
): number {
  const dev = (temp - OPTIMAL_TEMPERATURE[species]) / 10;
  const sens = dev < 0 ? 1 / size : size;
  return 1 + 0.35 * dev * dev * sens;
}

/** Basal metabolic burn for one cycle. */
export function basalCost(
  org: Organism,
  basalParam: number,
  temp: number,
): number {
  return (
    BASAL_COST *
    (org.species === "predator" ? 0.8 : 1) *
    basalParam *
    org.traits.metabolism *
    temperatureStress(org.species, org.genome.genes.size, temp) *
    (org.behavior === "rest" ? 0.7 : 1)
  );
}

/** Movement cost scales with speed squared and body size. */
export function movementCost(org: Organism): number {
  const v2 = org.vx * org.vx + org.vy * org.vy;
  return MOVE_COST * v2 * org.genome.genes.size;
}

/** Spend energy; returns true if the organism ran out. */
export function spend(org: Organism, amount: number): boolean {
  org.energy -= amount;
  return org.energy <= 0;
}

export function gain(org: Organism, amount: number): void {
  org.energy = Math.min(
    org.maxEnergy,
    org.energy + amount * org.traits.efficiency,
  );
}

/** Aging and heat stress wear down health; resting heals slowly. */
export function updateHealth(org: Organism, temp: number): void {
  const ageRatio = org.age / org.maxAge;
  if (ageRatio > 0.75)
    org.health -= (ageRatio - 0.75) * 0.6 * (org.maxHealth / 100);
  const stress = temperatureStress(org.species, org.genome.genes.size, temp);
  if (stress > 2) org.health -= (stress - 2) * 0.05;
  if (
    org.health < org.maxHealth &&
    org.energy > org.maxEnergy * 0.4 &&
    ageRatio < 0.75
  ) {
    const heal =
      (org.behavior === "rest" ? 0.12 : 0.04) * org.genome.genes.metabolism;
    org.health = Math.min(org.maxHealth, org.health + heal);
    org.energy -= heal * 0.2;
  }
}

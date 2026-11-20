import type { LineageRegistry } from "./lineage";
import { fertilize } from "./plants";
import type {
  Corpse,
  DeathCause,
  Organism,
  Terrain,
  WorldCounters,
} from "./types";

/**
 * Natural selection: applies death conditions (starvation, old age,
 * injury, predation), turns the dead into corpses and decays carrion
 * back into soil nutrients.
 */

export interface SelectionContext {
  cycle: number;
  counters: WorldCounters;
  lineage: LineageRegistry;
  corpses: Corpse[];
  terrain: Terrain;
}

const CORPSE_BODY_ENERGY = 45;
const CORPSE_MAX_AGE = 1500;

export function kill(
  org: Organism,
  cause: DeathCause,
  ctx: SelectionContext,
): Corpse {
  org.alive = false;
  const c = ctx.counters;
  c.totalDeaths++;
  c.deaths[org.species]++;
  c.deathCauses[cause]++;
  c.lifespanSum[org.species] += org.age;
  c.lifespanCount[org.species]++;
  ctx.lineage.recordDeath(org.id, ctx.cycle, cause);
  const energy =
    Math.max(0, org.energy) * 0.5 + CORPSE_BODY_ENERGY * org.genome.genes.size;
  const corpse: Corpse = {
    id: c.nextCorpseId++,
    x: org.x,
    y: org.y,
    energy,
    initialEnergy: energy,
    species: org.species,
    age: 0,
  };
  ctx.corpses.push(corpse);
  return corpse;
}

/** Check end-of-life conditions; returns the cause if the organism must die. */
export function deathCause(org: Organism): DeathCause | null {
  if (org.energy <= 0) return "starvation";
  if (org.age >= org.maxAge * 1.15) return "oldAge";
  if (org.health <= 0) return org.age > org.maxAge * 0.75 ? "oldAge" : "injury";
  return null;
}

/** Decay corpses, returning lost energy to the soil. */
export function decayCorpses(corpses: Corpse[], terrain: Terrain): void {
  let write = 0;
  for (const c of corpses) {
    c.age++;
    const loss = Math.min(c.energy, 0.12 + c.energy * 0.003);
    c.energy -= loss;
    fertilize(terrain, c.x, c.y, loss);
    if (c.energy < 0.5 || c.age > CORPSE_MAX_AGE) {
      if (c.energy > 0) fertilize(terrain, c.x, c.y, c.energy);
      continue;
    }
    corpses[write++] = c;
  }
  corpses.length = write;
}

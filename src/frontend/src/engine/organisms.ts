import { deriveTraits, randomGenome } from "./genetics";
import { createActivations } from "./neuralNetwork";
import { TRAIL_POINTS } from "./params";
import type { Rng } from "./rng";
import type { Genome, Organism, Species } from "./types";

/** Organism manager: construction, trail ring buffer, read-only views. */

export interface SpawnOptions {
  id: number;
  species: Species;
  genome: Genome;
  x: number;
  y: number;
  heading: number;
  generation: number;
  parentIds: [number, number] | null;
  /** Starting energy as a fraction of max energy. */
  energyFraction: number;
  /** Initial age (randomized for the founding population). */
  age: number;
}

export function createOrganism(o: SpawnOptions): Organism {
  const traits = deriveTraits(o.species, o.genome.genes);
  return {
    id: o.id,
    species: o.species,
    x: o.x,
    y: o.y,
    vx: 0,
    vy: 0,
    heading: o.heading,
    energy: traits.maxEnergy * o.energyFraction,
    maxEnergy: traits.maxEnergy,
    health: traits.maxHealth,
    maxHealth: traits.maxHealth,
    age: o.age,
    maxAge: traits.maxAge,
    speed: traits.maxSpeed,
    vision: traits.vision,
    metabolism: traits.metabolism,
    reproductionRate: traits.reproductionRate,
    radius: traits.radius,
    generation: o.generation,
    parentIds: o.parentIds,
    genome: o.genome,
    traits,
    behavior: "explore",
    targetId: -1,
    reproCooldown: o.parentIds ? 120 : 0,
    attackCooldown: 0,
    childrenCount: 0,
    kills: 0,
    trail: new Array<number>(TRAIL_POINTS * 2).fill(0),
    trailHead: 0,
    trailLength: 0,
    activations: createActivations(),
    alive: true,
  };
}

export function createFounder(
  id: number,
  species: Species,
  rng: Rng,
  width: number,
  height: number,
): Organism {
  const genome = randomGenome(species, rng);
  const x = rng.range(10, width - 10);
  const y = rng.range(10, height - 10);
  const heading = rng.angle() - Math.PI;
  const org = createOrganism({
    id,
    species,
    genome,
    x,
    y,
    heading,
    generation: 0,
    parentIds: null,
    energyFraction: rng.range(0.55, 0.8),
    age: 0,
  });
  org.age = Math.floor(rng.range(0, 0.4) * org.maxAge);
  org.reproCooldown = rng.int(0, 200);
  return org;
}

export function pushTrail(org: Organism): void {
  const i = org.trailHead * 2;
  org.trail[i] = org.x;
  org.trail[i + 1] = org.y;
  org.trailHead = (org.trailHead + 1) % TRAIL_POINTS;
  if (org.trailLength < TRAIL_POINTS) org.trailLength++;
}

/** Trail points from oldest to newest as [x, y] pairs. */
export function readTrail(org: Organism): [number, number][] {
  const out: [number, number][] = [];
  const start = (org.trailHead - org.trailLength + TRAIL_POINTS) % TRAIL_POINTS;
  for (let k = 0; k < org.trailLength; k++) {
    const i = ((start + k) % TRAIL_POINTS) * 2;
    out.push([org.trail[i], org.trail[i + 1]]);
  }
  return out;
}

export function maturityAge(org: Organism): number {
  return org.maxAge * (org.species === "predator" ? 0.14 : 0.1);
}

/** Plain, copy-safe view of an organism for UI inspectors. */
export interface OrganismView {
  id: number;
  species: Species;
  x: number;
  y: number;
  vx: number;
  vy: number;
  energy: number;
  maxEnergy: number;
  health: number;
  maxHealth: number;
  age: number;
  maxAge: number;
  speed: number;
  vision: number;
  metabolism: number;
  reproductionRate: number;
  generation: number;
  parentIds: [number, number] | null;
  genes: Organism["genome"]["genes"];
  behavior: Organism["behavior"];
  childrenCount: number;
  kills: number;
  activations: { inputs: number[]; hidden: number[]; outputs: number[] };
  weights: number[];
}

export function toOrganismView(o: Organism): OrganismView {
  return {
    id: o.id,
    species: o.species,
    x: o.x,
    y: o.y,
    vx: o.vx,
    vy: o.vy,
    energy: o.energy,
    maxEnergy: o.maxEnergy,
    health: o.health,
    maxHealth: o.maxHealth,
    age: o.age,
    maxAge: o.maxAge,
    speed: o.speed,
    vision: o.vision,
    metabolism: o.metabolism,
    reproductionRate: o.reproductionRate,
    generation: o.generation,
    parentIds: o.parentIds,
    genes: { ...o.genome.genes },
    behavior: o.behavior,
    childrenCount: o.childrenCount,
    kills: o.kills,
    activations: {
      inputs: o.activations.inputs.slice(),
      hidden: o.activations.hidden.slice(),
      outputs: o.activations.outputs.slice(),
    },
    weights: o.genome.weights.slice(),
  };
}

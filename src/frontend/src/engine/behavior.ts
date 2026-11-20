import {
  OUT_EAT,
  OUT_EXPLORE,
  OUT_FLEE,
  OUT_MOVE_X,
  OUT_MOVE_Y,
  OUT_REPRODUCE,
  forward,
} from "./neuralNetwork";
import type { SimParams } from "./params";
import { steer } from "./physics";
import { isReadyToMate } from "./reproduction";
import type { Rng } from "./rng";
import type { SpatialHash } from "./spatialHash";
import type { BehaviorKey, Corpse, Organism, Plant } from "./types";
import { axisDelta } from "./world";

/** Behavior controller: perception → neural network → behavior + steering. */

export interface PerceptionContext {
  organisms: Organism[];
  plants: Plant[];
  corpses: Corpse[];
  orgGrid: SpatialHash;
  plantGrid: SpatialHash;
  corpseGrid: SpatialHash;
  width: number;
  height: number;
  wrap: boolean;
  params: SimParams;
  rng: Rng;
}

export interface Perception {
  /** Food = plant index (herbivore) or corpse index (predator); -1 if none. */
  food: number;
  foodDist: number;
  foodDx: number;
  foodDy: number;
  predator: number;
  predatorDist: number;
  predatorDx: number;
  predatorDy: number;
  prey: number;
  preyDist: number;
  preyDx: number;
  preyDy: number;
  mate: number;
  mateDist: number;
  mateDx: number;
  mateDy: number;
  kin: number;
  danger: number;
}

export function createPerception(): Perception {
  return {
    food: -1,
    foodDist: 0,
    foodDx: 0,
    foodDy: 0,
    predator: -1,
    predatorDist: 0,
    predatorDx: 0,
    predatorDy: 0,
    prey: -1,
    preyDist: 0,
    preyDx: 0,
    preyDy: 0,
    mate: -1,
    mateDist: 0,
    mateDx: 0,
    mateDy: 0,
    kin: 0,
    danger: 0,
  };
}

const buf: number[] = [];
const KIN_RADIUS = 50;
const MATE_SENSE = 2.5;
const HERD_CROWDING = 12;

export function perceive(
  org: Organism,
  ctx: PerceptionContext,
  p: Perception,
): void {
  const { width, height, wrap } = ctx;
  const vr = org.vision;
  const vr2 = vr * vr;
  p.food = p.predator = p.prey = p.mate = -1;
  p.foodDist =
    p.predatorDist =
    p.preyDist =
    p.mateDist =
      Number.POSITIVE_INFINITY;
  p.kin = 0;
  p.danger = 0;
  const pred = org.species === "predator";
  // food
  if (!pred) {
    ctx.plantGrid.query(org.x, org.y, vr, wrap, buf);
    for (const i of buf) {
      const pl = ctx.plants[i];
      if (pl.amount < 0.5) continue;
      const dx = axisDelta(pl.x - org.x, width, wrap);
      const dy = axisDelta(pl.y - org.y, height, wrap);
      const d2 = dx * dx + dy * dy;
      if (d2 < vr2 && d2 < p.foodDist) {
        p.foodDist = d2;
        p.food = i;
        p.foodDx = dx;
        p.foodDy = dy;
      }
    }
  } else {
    ctx.corpseGrid.query(org.x, org.y, vr, wrap, buf);
    for (const i of buf) {
      const c = ctx.corpses[i];
      if (c.energy < 1) continue;
      const dx = axisDelta(c.x - org.x, width, wrap);
      const dy = axisDelta(c.y - org.y, height, wrap);
      const d2 = dx * dx + dy * dy;
      if (d2 < vr2 && d2 < p.foodDist) {
        p.foodDist = d2;
        p.food = i;
        p.foodDx = dx;
        p.foodDy = dy;
      }
    }
  }
  // organisms
  const ready = isReadyToMate(org, ctx.params);
  ctx.orgGrid.query(org.x, org.y, vr, wrap, buf);
  for (const i of buf) {
    const o = ctx.organisms[i];
    if (o === org || !o.alive) continue;
    const dx = axisDelta(o.x - org.x, width, wrap);
    const dy = axisDelta(o.y - org.y, height, wrap);
    const d2 = dx * dx + dy * dy;
    if (d2 >= vr2) continue;
    if (o.species === org.species) {
      if (d2 < KIN_RADIUS * KIN_RADIUS) p.kin++;
      if (ready && d2 < p.mateDist && isReadyToMate(o, ctx.params)) {
        p.mateDist = d2;
        p.mate = i;
        p.mateDx = dx;
        p.mateDy = dy;
      }
    } else if (pred) {
      if (d2 < p.preyDist) {
        p.preyDist = d2;
        p.prey = i;
        p.preyDx = dx;
        p.preyDy = dy;
      }
    } else {
      p.danger += (1 - Math.sqrt(d2) / vr) * o.genome.genes.size;
      if (d2 < p.predatorDist) {
        p.predatorDist = d2;
        p.predator = i;
        p.predatorDx = dx;
        p.predatorDy = dy;
      }
    }
  }
  // Mates are sensed at long range (scent / calls) when none is in sight.
  if (ready && p.mate < 0) {
    const mr = vr * MATE_SENSE;
    ctx.orgGrid.query(org.x, org.y, mr, wrap, buf);
    for (const i of buf) {
      const o = ctx.organisms[i];
      if (o === org || !o.alive || o.species !== org.species) continue;
      const dx = axisDelta(o.x - org.x, width, wrap);
      const dy = axisDelta(o.y - org.y, height, wrap);
      const d2 = dx * dx + dy * dy;
      if (d2 < mr * mr && d2 < p.mateDist && isReadyToMate(o, ctx.params)) {
        p.mateDist = d2;
        p.mate = i;
        p.mateDx = dx;
        p.mateDy = dy;
      }
    }
  }
  p.foodDist = Math.sqrt(p.foodDist);
  p.predatorDist = Math.sqrt(p.predatorDist);
  p.preyDist = Math.sqrt(p.preyDist);
  p.mateDist = Math.sqrt(p.mateDist);
  p.danger = pred ? 1 - org.health / org.maxHealth : Math.min(1, p.danger);
}

function relAngle(org: Organism, dx: number, dy: number): number {
  let a = Math.atan2(dy, dx) - org.heading;
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a / Math.PI;
}

function closeness(d: number, vr: number): number {
  return Number.isFinite(d) ? Math.max(0, 1 - d / vr) : 0;
}

/** Fill NN inputs from perception, run the network, choose behavior and steer. */
export function decide(
  org: Organism,
  p: Perception,
  ctx: PerceptionContext,
): void {
  const inp = org.activations.inputs;
  const vr = org.vision;
  inp[0] = org.energy / org.maxEnergy;
  inp[1] = Math.min(1, org.age / org.maxAge);
  inp[2] = closeness(p.foodDist, vr);
  inp[3] = p.food >= 0 ? relAngle(org, p.foodDx, p.foodDy) : 0;
  inp[4] = closeness(p.predatorDist, vr);
  inp[5] = p.predator >= 0 ? relAngle(org, p.predatorDx, p.predatorDy) : 0;
  inp[6] = closeness(p.preyDist, vr);
  inp[7] = p.prey >= 0 ? relAngle(org, p.preyDx, p.preyDy) : 0;
  inp[8] = p.danger;
  inp[9] = Math.min(1, p.kin / 5);
  forward(org.genome.weights, org.activations);
  const out = org.activations.outputs;
  const sExplore = (out[OUT_EXPLORE] + 1) / 2;
  const sEat = (out[OUT_EAT] + 1) / 2;
  const sFlee = (out[OUT_FLEE] + 1) / 2;
  const sRepro = (out[OUT_REPRODUCE] + 1) / 2;
  const hunger = 1 - inp[0];
  const pred = org.species === "predator";
  const contact = org.radius + 5;

  let best = "rest" as BehaviorKey;
  let bestScore = 0.18 * (1 - sExplore) + (inp[0] > 0.5 ? 0.08 : 0);
  const consider = (b: BehaviorKey, s: number) => {
    const score = b === org.behavior ? s + 0.05 : s;
    if (score > bestScore) {
      bestScore = score;
      best = b;
    }
  };
  consider("explore", 0.1 + sExplore * 0.6);
  if (p.food >= 0) {
    if (p.foodDist <= contact && inp[0] < 0.97) consider("eat", 0.4 + sEat);
    else consider("searchFood", sEat * (0.4 + hunger));
  }
  // Satiated predators do not hunt (keeps prey from being over-harvested).
  if (pred && p.prey >= 0 && inp[0] < 0.72)
    consider(
      "chase",
      sEat * (0.5 + org.genome.genes.aggression) * (0.3 + hunger),
    );
  if (!pred && p.predator >= 0)
    consider("escape", sFlee * (0.5 + p.danger) * 1.2);
  // Crowding stress suppresses breeding in dense herds (density dependence).
  if (p.mate >= 0 && (pred || p.kin < HERD_CROWDING))
    consider("reproduce", sRepro * 1.2);
  org.behavior = best;

  const moveX = out[OUT_MOVE_X];
  const moveY = out[OUT_MOVE_Y];
  const nnTurn = Math.atan2(moveY, Math.max(0.1, moveX + 1));
  switch (best) {
    case "explore":
      org.targetId = -1;
      steer(
        org,
        org.heading + nnTurn * 0.6 + ctx.rng.gaussian() * 0.25,
        0.35 + 0.35 * Math.abs(moveX),
      );
      break;
    case "searchFood":
      org.targetId = pred ? ctx.corpses[p.food].id : ctx.plants[p.food].id;
      steer(org, Math.atan2(p.foodDy, p.foodDx) + nnTurn * 0.15, 0.75);
      break;
    case "eat":
      org.targetId = pred ? ctx.corpses[p.food].id : ctx.plants[p.food].id;
      steer(org, Math.atan2(p.foodDy, p.foodDx), 0.05);
      break;
    case "chase":
      org.targetId = ctx.organisms[p.prey].id;
      steer(org, Math.atan2(p.preyDy, p.preyDx), 1);
      break;
    case "escape":
      org.targetId = ctx.organisms[p.predator].id;
      steer(org, Math.atan2(-p.predatorDy, -p.predatorDx) + nnTurn * 0.3, 1);
      break;
    case "reproduce":
      org.targetId = ctx.organisms[p.mate].id;
      steer(org, Math.atan2(p.mateDy, p.mateDx), 0.6);
      break;
    default:
      org.targetId = -1;
      steer(org, org.heading, 0.05);
  }
}

import type { SimParams } from "./params";
import type { Rng } from "./rng";
import type { Plant, Terrain } from "./types";
import { ZONE_KEYS } from "./types";
import { ZONE_PROPS, plantTemperatureFactor, terrainCellIndex } from "./world";

/** Plant manager: sprouting, zone/temperature driven regrowth, consumption. */

export const PLANT_ENERGY_PER_UNIT = 1.5;
const BASE_REGROWTH = 0.04;
const BASE_SPROUTS = 2;
const SOIL_MAX = 3;

export interface PlantContext {
  params: SimParams;
  terrain: Terrain;
  rng: Rng;
  temperature: number;
  growthMultiplier: number;
  nextId: () => number;
}

export function plantCapacity(ctx: PlantContext, plant: Plant): number {
  return ctx.params.foodAmount * ZONE_PROPS[plant.zone].capacity;
}

/** Max plants per terrain cell at growth 1; each zone scales by its growth rate. */
const CELL_PLANT_CAP = 2.5;

/** Count plants in each terrain cell (used for per-cell density caps). */
export function countPlantsPerCell(
  terrain: Terrain,
  plants: Plant[],
): Uint16Array {
  const counts = new Uint16Array(terrain.cols * terrain.rows);
  for (const p of plants) counts[terrainCellIndex(terrain, p.x, p.y)]++;
  return counts;
}

/** Try to place a sprout, preferring fertile zones and plant patches. */
export function sproutPlant(
  ctx: PlantContext,
  plants: Plant[],
  initialFraction: number,
  counts?: Uint16Array,
): Plant | null {
  const { params, terrain, rng } = ctx;
  const w = params.worldWidth;
  const h = params.worldHeight;
  const cellCounts = counts ?? countPlantsPerCell(terrain, plants);
  for (let attempt = 0; attempt < 6; attempt++) {
    let x: number;
    let y: number;
    if (plants.length > 0 && rng.chance(0.5)) {
      const parent = plants[rng.int(0, plants.length)];
      x = parent.x + rng.gaussian() * 22;
      y = parent.y + rng.gaussian() * 22;
    } else {
      x = rng.next() * w;
      y = rng.next() * h;
    }
    if (x < 2 || y < 2 || x > w - 2 || y > h - 2) continue;
    const cell = terrainCellIndex(terrain, x, y);
    const zone = ZONE_KEYS[terrain.zones[cell]];
    // per-cell density cap keeps every zone's share proportional to its growth rate
    if (cellCounts[cell] >= CELL_PLANT_CAP * ZONE_PROPS[zone].growth) continue;
    const accept = Math.min(
      1,
      (ZONE_PROPS[zone].growth / 1.5) * (1 + terrain.soil[cell]),
    );
    if (!rng.chance(accept)) continue;
    const cap = params.foodAmount * ZONE_PROPS[zone].capacity;
    cellCounts[cell]++;
    return { id: ctx.nextId(), x, y, amount: cap * initialFraction, zone };
  }
  return null;
}

export function seedPlants(
  ctx: PlantContext,
  plants: Plant[],
  count: number,
  fraction: number,
): number {
  let added = 0;
  const limit = ctx.params.maxPlants;
  const counts = countPlantsPerCell(ctx.terrain, plants);
  for (
    let i = 0;
    i < count * 3 && added < count && plants.length < limit;
    i++
  ) {
    const p = sproutPlant(ctx, plants, fraction, counts);
    if (p) {
      plants.push(p);
      added++;
    }
  }
  return added;
}

/** One cycle of plant regrowth and sprouting. Removes depleted plants. */
export function updatePlants(ctx: PlantContext, plants: Plant[]): Plant[] {
  const { params, terrain, rng } = ctx;
  const tempBase = ctx.temperature;
  const growth = params.plantGrowthRate * ctx.growthMultiplier;
  const regen = BASE_REGROWTH * params.resourceRegenRate * growth;
  const soil = terrain.soil;
  let write = 0;
  for (let i = 0; i < plants.length; i++) {
    const p = plants[i];
    if (p.amount <= 0.05) continue;
    const zp = ZONE_PROPS[p.zone];
    const cap = params.foodAmount * zp.capacity;
    if (p.amount < cap) {
      const cell = terrainCellIndex(terrain, p.x, p.y);
      const s = soil[cell];
      const g =
        regen *
        zp.growth *
        plantTemperatureFactor(tempBase + zp.tempOffset) *
        (1 + s * 0.6);
      p.amount = Math.min(cap, p.amount + g);
      if (s > 0) soil[cell] = Math.max(0, s - g * 0.01);
    }
    plants[write++] = p;
  }
  plants.length = write;
  // sprouting
  const area = (params.worldWidth * params.worldHeight) / 700000;
  const expected =
    BASE_SPROUTS * growth * area * plantTemperatureFactor(tempBase);
  let n = Math.floor(expected);
  if (rng.chance(expected - n)) n++;
  const counts = n > 0 ? countPlantsPerCell(terrain, plants) : undefined;
  for (let k = 0; k < n && plants.length < params.maxPlants; k++) {
    const p = sproutPlant(ctx, plants, 0.3, counts);
    if (p) plants.push(p);
  }
  return plants;
}

/** Add decayed nutrients to the soil, boosting local regrowth. */
export function fertilize(
  terrain: Terrain,
  x: number,
  y: number,
  energy: number,
): void {
  const cell = terrainCellIndex(terrain, x, y);
  terrain.soil[cell] = Math.min(SOIL_MAX, terrain.soil[cell] + energy * 0.02);
}

/** Slow natural soil depletion. */
export function decaySoil(terrain: Terrain): void {
  const soil = terrain.soil;
  for (let i = 0; i < soil.length; i++) {
    if (soil[i] > 0) soil[i] = Math.max(0, soil[i] - 0.0004);
  }
}

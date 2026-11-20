import type { Rng } from "./rng";
import type { EdgeMode, Terrain, ZoneKey } from "./types";
import { ZONE_KEYS } from "./types";

/** World manager: geometry helpers, terrain zones and local climate. */

export const TERRAIN_CELL = 25;

export interface ZoneProps {
  growth: number;
  capacity: number;
  tempOffset: number;
}

export const ZONE_PROPS: Record<ZoneKey, ZoneProps> = {
  grassland: { growth: 1, capacity: 1, tempOffset: 0 },
  arid: { growth: 0.3, capacity: 0.6, tempOffset: 5 },
  waterside: { growth: 1.5, capacity: 1.25, tempOffset: -3 },
};

export interface WorldGeometry {
  width: number;
  height: number;
  edgeMode: EdgeMode;
}

/** Shortest signed delta along an axis (wrap aware). */
export function axisDelta(d: number, size: number, wrap: boolean): number {
  if (!wrap) return d;
  if (d > size / 2) return d - size;
  if (d < -size / 2) return d + size;
  return d;
}

function smooth(t: number) {
  return t * t * (3 - 2 * t);
}

/** Seeded value noise sampled on a lattice with given spacing. */
function makeNoise(rng: Rng, width: number, height: number, spacing: number) {
  const lw = Math.ceil(width / spacing) + 2;
  const lh = Math.ceil(height / spacing) + 2;
  const lattice: number[] = [];
  for (let i = 0; i < lw * lh; i++) lattice.push(rng.next());
  return (x: number, y: number) => {
    const gx = x / spacing;
    const gy = y / spacing;
    const ix = Math.floor(gx);
    const iy = Math.floor(gy);
    const tx = smooth(gx - ix);
    const ty = smooth(gy - iy);
    const v00 = lattice[iy * lw + ix];
    const v10 = lattice[iy * lw + ix + 1];
    const v01 = lattice[(iy + 1) * lw + ix];
    const v11 = lattice[(iy + 1) * lw + ix + 1];
    const a = v00 + (v10 - v00) * tx;
    const b = v01 + (v11 - v01) * tx;
    return a + (b - a) * ty;
  };
}

export function generateTerrain(
  rng: Rng,
  width: number,
  height: number,
): Terrain {
  const cols = Math.ceil(width / TERRAIN_CELL);
  const rows = Math.ceil(height / TERRAIN_CELL);
  const coarse = makeNoise(rng, width, height, 220);
  const fine = makeNoise(rng, width, height, 70);
  const lakeCount = 2 + rng.int(0, 3);
  const lakes: { x: number; y: number; r: number }[] = [];
  for (let i = 0; i < lakeCount; i++) {
    lakes.push({
      x: rng.range(0.1, 0.9) * width,
      y: rng.range(0.1, 0.9) * height,
      r: rng.range(45, 100) * Math.sqrt((width * height) / 700000),
    });
  }
  const zones: number[] = new Array(cols * rows);
  const soil: number[] = new Array(cols * rows).fill(0);
  for (let cy = 0; cy < rows; cy++) {
    for (let cx = 0; cx < cols; cx++) {
      const x = (cx + 0.5) * TERRAIN_CELL;
      const y = (cy + 0.5) * TERRAIN_CELL;
      const moisture = coarse(x, y) * 0.7 + fine(x, y) * 0.3;
      let lakeInfluence = 0;
      for (const l of lakes) {
        const d = Math.hypot(x - l.x, y - l.y) / l.r;
        if (1.4 - d > lakeInfluence) lakeInfluence = 1.4 - d;
      }
      let zone: ZoneKey;
      if (lakeInfluence + fine(x, y) * 0.25 > 0.55) zone = "waterside";
      else if (moisture > 0.42) zone = "grassland";
      else zone = "arid";
      zones[cy * cols + cx] = ZONE_KEYS.indexOf(zone);
    }
  }
  return { cellSize: TERRAIN_CELL, cols, rows, zones, soil };
}

export function terrainCellIndex(t: Terrain, x: number, y: number): number {
  let cx = Math.floor(x / t.cellSize);
  let cy = Math.floor(y / t.cellSize);
  if (cx < 0) cx = 0;
  else if (cx >= t.cols) cx = t.cols - 1;
  if (cy < 0) cy = 0;
  else if (cy >= t.rows) cy = t.rows - 1;
  return cy * t.cols + cx;
}

export function zoneAt(t: Terrain, x: number, y: number): ZoneKey {
  return ZONE_KEYS[t.zones[terrainCellIndex(t, x, y)]];
}

/** Plant growth multiplier from temperature (peaks near 22°C). */
export function plantTemperatureFactor(temp: number): number {
  const d = (temp - 22) / 14;
  return Math.max(0.05, Math.exp(-d * d));
}

/** Fraction of each zone, useful for UI legends. */
export function zoneShares(t: Terrain): Record<ZoneKey, number> {
  const counts = [0, 0, 0];
  for (const z of t.zones) counts[z]++;
  const total = t.zones.length || 1;
  return {
    grassland: counts[0] / total,
    arid: counts[1] / total,
    waterside: counts[2] / total,
  };
}

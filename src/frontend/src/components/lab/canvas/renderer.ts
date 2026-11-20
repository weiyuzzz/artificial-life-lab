import {
  type BehaviorKey,
  type Organism,
  type SimulationEngine,
  type Terrain,
  ZONE_KEYS,
  type ZoneKey,
  readTrail,
} from "@/engine";
import type { OverlayKey } from "@/store/useSimStore";
import type { View } from "./camera";

export interface Palette {
  bg: string;
  grid: string;
  border: string;
  herbivore: string;
  predator: string;
  plant: string;
  corpse: string;
  foreground: string;
  primary: string;
  zones: Record<ZoneKey, string>;
  behavior: Record<BehaviorKey, string>;
  mono: string;
}

const ZONE_TOKEN: Record<ZoneKey, string> = {
  grassland: "--zone-fertile",
  arid: "--zone-arid",
  waterside: "--zone-water",
};

export const BEHAVIOR_TOKEN: Record<BehaviorKey, string> = {
  explore: "--muted-foreground",
  searchFood: "--species-plant",
  chase: "--species-predator",
  escape: "--warning",
  eat: "--success",
  reproduce: "--chart-5",
  rest: "--chart-4",
};

/** Resolve design tokens (OKLCH triplets) into canvas color strings. */
export function readPalette(): Palette {
  const css = getComputedStyle(document.documentElement);
  const c = (name: string) => `oklch(${css.getPropertyValue(name).trim()})`;
  const behavior = {} as Record<BehaviorKey, string>;
  for (const key of Object.keys(BEHAVIOR_TOKEN) as BehaviorKey[]) {
    behavior[key] = c(BEHAVIOR_TOKEN[key]);
  }
  const zones = {} as Record<ZoneKey, string>;
  for (const key of ZONE_KEYS) zones[key] = c(ZONE_TOKEN[key]);
  return {
    bg: c("--world-bg"),
    grid: c("--world-grid"),
    border: c("--border"),
    herbivore: c("--species-herbivore"),
    predator: c("--species-predator"),
    plant: c("--species-plant"),
    corpse: c("--species-corpse"),
    foreground: c("--foreground"),
    primary: c("--primary"),
    zones,
    behavior,
    mono: css.getPropertyValue("--font-mono").trim() || "monospace",
  };
}

const terrainCache = new WeakMap<Terrain, HTMLCanvasElement>();

/** One pixel per terrain cell; upscaled with smoothing for soft zone borders. */
function terrainImage(terrain: Terrain, palette: Palette): HTMLCanvasElement {
  const cached = terrainCache.get(terrain);
  if (cached) return cached;
  const img = document.createElement("canvas");
  img.width = terrain.cols;
  img.height = terrain.rows;
  const g = img.getContext("2d");
  if (g) {
    for (let r = 0; r < terrain.rows; r++) {
      for (let col = 0; col < terrain.cols; col++) {
        const zone = ZONE_KEYS[terrain.zones[r * terrain.cols + col]];
        g.fillStyle = palette.zones[zone ?? "grassland"];
        g.fillRect(col, r, 1, 1);
      }
    }
  }
  terrainCache.set(terrain, img);
  return img;
}

export interface DrawState {
  selectedId: number | null;
  hoveredId: number | null;
  overlays: Record<OverlayKey, boolean>;
  selectedLabel: string;
}

function organismPath(ctx: CanvasRenderingContext2D, o: Organism) {
  const r = o.radius;
  const cos = Math.cos(o.heading);
  const sin = Math.sin(o.heading);
  const pt = (lx: number, ly: number): [number, number] => [
    o.x + lx * cos - ly * sin,
    o.y + lx * sin + ly * cos,
  ];
  const shape: [number, number][] =
    o.species === "predator"
      ? [pt(r * 1.9, 0), pt(-r, r * 1.25), pt(-r * 0.25, 0), pt(-r, -r * 1.25)]
      : [pt(r * 1.5, 0), pt(-r, r * 0.95), pt(-r, -r * 0.95)];
  ctx.moveTo(shape[0][0], shape[0][1]);
  for (let i = 1; i < shape.length; i++) ctx.lineTo(shape[i][0], shape[i][1]);
  ctx.closePath();
}

export function drawWorld(
  ctx: CanvasRenderingContext2D,
  engine: SimulationEngine,
  view: View,
  dpr: number,
  palette: Palette,
  state: DrawState,
): void {
  const { scale, offsetX, offsetY, worldWidth: ww, worldHeight: wh } = view;
  const px = 1 / scale;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.globalAlpha = 1;
  ctx.fillStyle = palette.bg;
  ctx.fillRect(0, 0, view.width, view.height);

  ctx.setTransform(
    dpr * scale,
    0,
    0,
    dpr * scale,
    dpr * offsetX,
    dpr * offsetY,
  );

  // Terrain zones
  const terrain = engine.terrain;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, ww, wh);
  ctx.clip();
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(
    terrainImage(terrain, palette),
    0,
    0,
    terrain.cols * terrain.cellSize,
    terrain.rows * terrain.cellSize,
  );

  // Measurement grid
  ctx.strokeStyle = palette.grid;
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = px;
  ctx.beginPath();
  for (let x = 100; x < ww; x += 100) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, wh);
  }
  for (let y = 100; y < wh; y += 100) {
    ctx.moveTo(0, y);
    ctx.lineTo(ww, y);
  }
  ctx.stroke();

  // Plants, bucketed by amount for batched fills
  const food = Math.max(1, engine.params.foodAmount);
  ctx.fillStyle = palette.plant;
  for (let bucket = 1; bucket <= 4; bucket++) {
    ctx.globalAlpha = 0.25 + bucket * 0.18;
    ctx.beginPath();
    for (const p of engine.plants) {
      if (p.amount <= 0.05) continue;
      const level = Math.min(1, p.amount / food);
      if (Math.min(4, Math.ceil(level * 4)) !== bucket) continue;
      const r = 0.9 + level * 1.6;
      ctx.moveTo(p.x + r, p.y);
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    }
    ctx.fill();
  }

  // Corpses fade as they decay
  ctx.strokeStyle = palette.corpse;
  ctx.lineWidth = Math.max(0.6, 1.2 * px);
  for (const c of engine.corpses) {
    const left = c.initialEnergy > 0 ? c.energy / c.initialEnergy : 0;
    ctx.globalAlpha = Math.max(0.06, Math.min(1, left)) * 0.85;
    const s = 2.2 + left * 1.6;
    ctx.beginPath();
    ctx.moveTo(c.x - s, c.y - s);
    ctx.lineTo(c.x + s, c.y + s);
    ctx.moveTo(c.x + s, c.y - s);
    ctx.lineTo(c.x - s, c.y + s);
    ctx.stroke();
  }

  const alive = engine.organisms.filter((o) => o.alive);
  const color = (o: Organism) =>
    o.species === "predator" ? palette.predator : palette.herbivore;

  // Trails
  if (state.overlays.trails) {
    ctx.lineWidth = 1.2 * px;
    ctx.globalAlpha = 0.32;
    for (const o of alive) {
      const pts = readTrail(o);
      if (pts.length < 2) continue;
      ctx.strokeStyle = color(o);
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) {
        const [x, y] = pts[i];
        const [lx, ly] = pts[i - 1];
        if (Math.abs(x - lx) > ww / 2 || Math.abs(y - ly) > wh / 2)
          ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.lineTo(o.x, o.y);
      ctx.stroke();
    }
  }

  // Vision ranges
  if (state.overlays.vision) {
    ctx.lineWidth = px;
    ctx.globalAlpha = 0.16;
    for (const o of alive) {
      ctx.strokeStyle = color(o);
      ctx.beginPath();
      ctx.arc(o.x, o.y, o.vision, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // Organisms
  for (const o of alive) {
    const vigor = o.maxEnergy > 0 ? Math.min(1, o.energy / o.maxEnergy) : 0;
    ctx.globalAlpha = 0.5 + vigor * 0.5;
    ctx.fillStyle = color(o);
    ctx.beginPath();
    organismPath(ctx, o);
    ctx.fill();
    // Heading indicator
    ctx.globalAlpha = 0.7;
    ctx.strokeStyle = palette.foreground;
    ctx.lineWidth = Math.max(0.4, px);
    const tip = o.radius * (o.species === "predator" ? 1.9 : 1.5);
    const reach = tip + Math.max(3, 6 * px);
    const cos = Math.cos(o.heading);
    const sin = Math.sin(o.heading);
    ctx.beginPath();
    ctx.moveTo(o.x + cos * tip, o.y + sin * tip);
    ctx.lineTo(o.x + cos * reach, o.y + sin * reach);
    ctx.stroke();
  }

  // Behavior state markers
  if (state.overlays.behavior) {
    ctx.globalAlpha = 0.95;
    const m = Math.max(1.1, 2.4 * px);
    for (const o of alive) {
      ctx.fillStyle = palette.behavior[o.behavior];
      ctx.fillRect(o.x - m, o.y - o.radius * 1.4 - m * 3, m * 2, m * 2);
    }
  }
  ctx.restore();

  // World border
  ctx.globalAlpha = 0.9;
  ctx.strokeStyle = palette.border;
  ctx.lineWidth = px;
  ctx.strokeRect(0, 0, ww, wh);

  // Hover + selection (screen space for constant-size reticles)
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const toScreen = (o: Organism) => [
    o.x * scale + offsetX,
    o.y * scale + offsetY,
  ];
  if (state.hoveredId !== null && state.hoveredId !== state.selectedId) {
    const h = engine.getOrganism(state.hoveredId);
    if (h?.alive) {
      const [sx, sy] = toScreen(h);
      ctx.globalAlpha = 0.8;
      ctx.strokeStyle = palette.foreground;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(sx, sy, Math.max(8, h.radius * scale * 2.2), 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  const sel =
    state.selectedId !== null ? engine.getOrganism(state.selectedId) : null;
  if (sel?.alive) {
    const [sx, sy] = toScreen(sel);
    const vr = sel.vision * scale;
    ctx.globalAlpha = 0.7;
    ctx.strokeStyle = palette.foreground;
    ctx.setLineDash([4, 5]);
    ctx.beginPath();
    ctx.arc(sx, sy, vr, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    const b = Math.max(12, sel.radius * scale * 2.6);
    const arm = b * 0.45;
    ctx.globalAlpha = 1;
    ctx.strokeStyle = palette.primary;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (const [dx, dy] of [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ]) {
      const cx = sx + dx * b;
      const cy = sy + dy * b;
      ctx.moveTo(cx - dx * arm, cy);
      ctx.lineTo(cx, cy);
      ctx.lineTo(cx, cy - dy * arm);
    }
    ctx.stroke();
    ctx.font = `500 11px ${palette.mono}`;
    const label = state.selectedLabel;
    const tw = ctx.measureText(label).width;
    const lx = Math.min(view.width - tw - 18, Math.max(6, sx + b + 8));
    const ly = Math.max(14, sy - b - 6);
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = palette.bg;
    ctx.fillRect(lx - 6, ly - 12, tw + 12, 18);
    ctx.globalAlpha = 1;
    ctx.fillStyle = palette.primary;
    ctx.fillText(label, lx, ly + 1);
  }
  ctx.globalAlpha = 1;
}

import type { EdgeMode, Organism } from "./types";

/** Physics: steering integration, friction and world edges (bounce or wrap). */

const ACCEL = 0.25;
const TURN_RATE = 0.35;

/**
 * Steer toward heading angle `dir` at a fraction `throttle` (0..1) of max speed.
 */
export function steer(org: Organism, dir: number, throttle: number): void {
  let diff = dir - org.heading;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  const maxTurn = TURN_RATE * (1.2 - 0.2 * org.genome.genes.size);
  if (diff > maxTurn) diff = maxTurn;
  else if (diff < -maxTurn) diff = -maxTurn;
  org.heading += diff;
  if (org.heading > Math.PI) org.heading -= Math.PI * 2;
  else if (org.heading < -Math.PI) org.heading += Math.PI * 2;
  const target = org.speed * Math.max(0, Math.min(1, throttle));
  const tvx = Math.cos(org.heading) * target;
  const tvy = Math.sin(org.heading) * target;
  org.vx += (tvx - org.vx) * ACCEL;
  org.vy += (tvy - org.vy) * ACCEL;
}

export function integrate(
  org: Organism,
  width: number,
  height: number,
  edge: EdgeMode,
): void {
  org.x += org.vx;
  org.y += org.vy;
  const r = org.radius;
  if (edge === "wrap") {
    if (org.x < 0) org.x += width;
    else if (org.x >= width) org.x -= width;
    if (org.y < 0) org.y += height;
    else if (org.y >= height) org.y -= height;
    return;
  }
  if (org.x < r) {
    org.x = r;
    org.vx = Math.abs(org.vx);
    org.heading = Math.PI - org.heading;
  } else if (org.x > width - r) {
    org.x = width - r;
    org.vx = -Math.abs(org.vx);
    org.heading = Math.PI - org.heading;
  }
  if (org.y < r) {
    org.y = r;
    org.vy = Math.abs(org.vy);
    org.heading = -org.heading;
  } else if (org.y > height - r) {
    org.y = height - r;
    org.vy = -Math.abs(org.vy);
    org.heading = -org.heading;
  }
  if (org.heading > Math.PI) org.heading -= Math.PI * 2;
  else if (org.heading < -Math.PI) org.heading += Math.PI * 2;
}

/** Clamp a position into the world (used when spawning). */
export function clampPosition(
  x: number,
  y: number,
  width: number,
  height: number,
  edge: EdgeMode,
): [number, number] {
  if (edge === "wrap") {
    return [((x % width) + width) % width, ((y % height) + height) % height];
  }
  return [
    Math.min(width - 4, Math.max(4, x)),
    Math.min(height - 4, Math.max(4, y)),
  ];
}

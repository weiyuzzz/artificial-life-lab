import {
  type Perception,
  type PerceptionContext,
  createPerception,
  decide,
  perceive,
} from "./behavior";
import { basalCost, gain, movementCost, spend, updateHealth } from "./energy";
import {
  type EventEffects,
  FOOD_ABUNDANCE_PLANTS,
  advanceEvents,
  computeEffects,
  createEvent,
} from "./events";
import { inheritGenome } from "./genetics";
import { LineageRegistry } from "./lineage";
import {
  type OrganismView,
  createFounder,
  createOrganism,
  pushTrail,
  toOrganismView,
} from "./organisms";
import {
  BASE_CYCLES_PER_SECOND,
  DEFAULT_PARAMS,
  type ParamKey,
  STATS_INTERVAL,
  type SimParams,
  TRAIL_INTERVAL,
  paramRequiresReset,
  sanitizeParams,
} from "./params";
import { integrate } from "./physics";
import {
  PLANT_ENERGY_PER_UNIT,
  type PlantContext,
  decaySoil,
  seedPlants,
  updatePlants,
} from "./plants";
import {
  isReadyToMate,
  planLitter,
  reproductionCooldown,
} from "./reproduction";
import { Rng } from "./rng";
import {
  type SelectionContext,
  deathCause,
  decayCorpses,
  kill,
} from "./selection";
import { SpatialHash } from "./spatialHash";
import { StatisticsCollector } from "./statistics";
import type {
  ActiveEvent,
  Corpse,
  EventKey,
  Organism,
  Plant,
  Species,
  Terrain,
  TriggerEventOptions,
  WorldCounters,
} from "./types";
import { axisDelta, generateTerrain } from "./world";

export function createCounters(): WorldCounters {
  return {
    nextOrganismId: 1,
    nextPlantId: 1,
    nextCorpseId: 1,
    nextEventId: 1,
    totalBirths: 0,
    totalDeaths: 0,
    births: { herbivore: 0, predator: 0 },
    deaths: { herbivore: 0, predator: 0 },
    deathCauses: { starvation: 0, oldAge: 0, predation: 0, injury: 0 },
    lifespanSum: { herbivore: 0, predator: 0 },
    lifespanCount: { herbivore: 0, predator: 0 },
  };
}

export interface FastForwardOptions {
  onProgress?: (done: number, total: number) => void;
  /** Return true to stop early. */
  shouldCancel?: () => boolean;
  /** Milliseconds of work per slice before yielding. */
  sliceMs?: number;
}

export interface FastForwardResult {
  completed: boolean;
  cyclesRun: number;
}

export const MAX_STEPS_PER_FRAME = 40;
const FRAME_BUDGET_MS = 12;

const now = () =>
  typeof performance !== "undefined" ? performance.now() : Date.now();
const yieldToBrowser = () =>
  new Promise<void>((resolve) => setTimeout(resolve, 0));

/** The simulation world: owns all state and advances it in fixed cycles. */
export class SimulationEngine {
  params: SimParams;
  rng: Rng;
  cycle = 0;
  organisms: Organism[] = [];
  plants: Plant[] = [];
  corpses: Corpse[] = [];
  terrain!: Terrain;
  counters: WorldCounters = createCounters();
  lineage = new LineageRegistry();
  activeEvents: ActiveEvent[] = [];
  stats = new StatisticsCollector();
  effects: EventEffects = {
    growthMultiplier: 1,
    temperatureDelta: 0,
    mutationMultiplier: 1,
  };
  /** Incremented on every state change; renderers can use it to skip redraws. */
  version = 0;

  private byId = new Map<number, Organism>();
  orgGrid!: SpatialHash;
  plantGrid!: SpatialHash;
  corpseGrid!: SpatialHash;
  private accumulator = 0;
  private perception: Perception = createPerception();

  constructor(params: Partial<SimParams> = DEFAULT_PARAMS) {
    this.params = sanitizeParams(params);
    this.rng = new Rng(this.params.seed);
    this.reset();
  }

  /** Effective temperature including active events. */
  get temperature(): number {
    return this.params.temperature + this.effects.temperatureDelta;
  }

  get mutationProbability(): number {
    return Math.min(
      1,
      this.params.mutationProbability * this.effects.mutationMultiplier,
    );
  }

  /** Rebuild the world from params (optionally overriding some, e.g. seed). */
  reset(overrides?: Partial<SimParams>): void {
    if (overrides)
      this.params = sanitizeParams({ ...this.params, ...overrides });
    const p = this.params;
    this.rng = new Rng(p.seed);
    this.cycle = 0;
    this.counters = createCounters();
    this.lineage.clear();
    this.activeEvents = [];
    this.effects = computeEffects(this.activeEvents);
    this.stats.reset();
    this.accumulator = 0;
    this.terrain = generateTerrain(this.rng, p.worldWidth, p.worldHeight);
    this.createGrids();
    this.organisms = [];
    this.plants = [];
    this.corpses = [];
    seedPlants(this.plantContext(), this.plants, p.initialPlants, 0.8);
    for (let i = 0; i < p.initialHerbivores; i++) this.addFounder("herbivore");
    for (let i = 0; i < p.initialPredators; i++) this.addFounder("predator");
    this.rebuildIndex();
    this.stats.addEntry(0, "simulationStart", {
      herbivores: p.initialHerbivores,
      predators: p.initialPredators,
      plants: p.initialPlants,
      seed: p.seed,
    });
    this.sampleStats();
    this.version++;
  }

  /** Recreate spatial grids for the current world size. */
  createGrids(): void {
    const { worldWidth: w, worldHeight: h } = this.params;
    this.orgGrid = new SpatialHash(w, h, 60);
    this.plantGrid = new SpatialHash(w, h, 40);
    this.corpseGrid = new SpatialHash(w, h, 60);
  }

  rebuildIndex(): void {
    this.byId = new Map();
    for (const o of this.organisms) this.byId.set(o.id, o);
  }

  private addFounder(species: Species): Organism {
    const o = createFounder(
      this.counters.nextOrganismId++,
      species,
      this.rng,
      this.params.worldWidth,
      this.params.worldHeight,
    );
    this.organisms.push(o);
    this.byId.set(o.id, o);
    this.lineage.register(o, this.cycle);
    return o;
  }

  private plantContext(): PlantContext {
    return {
      params: this.params,
      terrain: this.terrain,
      rng: this.rng,
      temperature: this.temperature,
      growthMultiplier: this.effects.growthMultiplier,
      nextId: () => this.counters.nextPlantId++,
    };
  }

  private selectionContext(): SelectionContext {
    return {
      cycle: this.cycle,
      counters: this.counters,
      lineage: this.lineage,
      corpses: this.corpses,
      terrain: this.terrain,
    };
  }

  /** Advance exactly one simulation cycle. */
  step(): void {
    this.cycle++;
    const p = this.params;
    this.effects = computeEffects(this.activeEvents);
    const temp = this.temperature;
    const wrap = p.edgeMode === "wrap";
    this.orgGrid.build(this.organisms);
    this.plantGrid.build(this.plants);
    this.corpseGrid.build(this.corpses);
    const pctx: PerceptionContext = {
      organisms: this.organisms,
      plants: this.plants,
      corpses: this.corpses,
      orgGrid: this.orgGrid,
      plantGrid: this.plantGrid,
      corpseGrid: this.corpseGrid,
      width: p.worldWidth,
      height: p.worldHeight,
      wrap,
      params: p,
      rng: this.rng,
    };
    const sctx = this.selectionContext();
    const per = this.perception;
    const births: Organism[] = [];
    const count = this.organisms.length;
    for (let i = 0; i < count; i++) {
      const org = this.organisms[i];
      if (!org.alive) continue;
      org.age++;
      if (org.reproCooldown > 0) org.reproCooldown--;
      if (org.attackCooldown > 0) org.attackCooldown--;
      perceive(org, pctx, per);
      decide(org, per, pctx);
      integrate(org, p.worldWidth, p.worldHeight, p.edgeMode);
      spend(org, basalCost(org, p.basalMetabolism, temp) + movementCost(org));
      this.interact(org, per, births, sctx);
      if (!org.alive) continue;
      updateHealth(org, temp);
      const cause = deathCause(org);
      if (cause) kill(org, cause, sctx);
      else if (this.cycle % TRAIL_INTERVAL === 0) pushTrail(org);
    }
    for (const b of births) {
      this.organisms.push(b);
      this.byId.set(b.id, b);
    }
    updatePlants(this.plantContext(), this.plants);
    decayCorpses(this.corpses, this.terrain);
    decaySoil(this.terrain);
    for (const e of advanceEvents(this.activeEvents)) {
      this.stats.addEntry(this.cycle, "eventEnded", { event: e.key });
    }
    this.removeDead();
    if (this.cycle % 500 === 0) this.lineage.prune();
    if (this.cycle % STATS_INTERVAL === 0) this.sampleStats();
    this.version++;
  }

  private interact(
    org: Organism,
    per: Perception,
    births: Organism[],
    sctx: SelectionContext,
  ): void {
    const p = this.params;
    const wrap = p.edgeMode === "wrap";
    const contact = (o: { x: number; y: number }, r: number) => {
      const dx = axisDelta(o.x - org.x, p.worldWidth, wrap);
      const dy = axisDelta(o.y - org.y, p.worldHeight, wrap);
      return dx * dx + dy * dy <= r * r;
    };
    const size = org.genome.genes.size;
    if (org.behavior === "eat" && per.food >= 0) {
      if (org.species === "herbivore") {
        const plant = this.plants[per.food];
        if (plant.amount > 0 && contact(plant, org.radius + 6)) {
          const bite = Math.min(plant.amount, 1.1 * size);
          plant.amount -= bite;
          gain(org, bite * PLANT_ENERGY_PER_UNIT);
        }
      } else {
        const corpse = this.corpses[per.food];
        if (corpse.energy > 0 && contact(corpse, org.radius + 6)) {
          const bite = Math.min(corpse.energy, 2.6 * size);
          corpse.energy -= bite;
          gain(org, bite);
        }
      }
    } else if (
      org.behavior === "chase" &&
      per.prey >= 0 &&
      org.attackCooldown <= 0
    ) {
      const prey = this.organisms[per.prey];
      if (prey.alive && contact(prey, org.radius + prey.radius + 3)) {
        const preySize = prey.genome.genes.size;
        org.attackCooldown = 10;
        spend(org, org.traits.attackCost);
        prey.health -= org.traits.attackDamage * Math.sqrt(size / preySize);
        org.health -= 8 * preySize * prey.genome.genes.aggression;
        if (prey.health <= 0) {
          kill(prey, "predation", sctx);
          org.kills++;
        }
      }
    } else if (org.behavior === "reproduce" && per.mate >= 0) {
      const mate = this.organisms[per.mate];
      if (
        isReadyToMate(org, p) &&
        isReadyToMate(mate, p) &&
        contact(mate, org.radius + mate.radius + 8) &&
        this.organisms.length + births.length < p.maxPopulation
      ) {
        this.mate(org, mate, births);
      }
    }
  }

  private mate(a: Organism, b: Organism, births: Organism[]): void {
    const plan = planLitter(a, b, this.rng);
    a.energy -= plan.parentCost;
    b.energy -= plan.parentCost;
    a.reproCooldown = reproductionCooldown(a);
    b.reproCooldown = reproductionCooldown(b);
    const generation = Math.max(a.generation, b.generation) + 1;
    for (let k = 0; k < plan.count; k++) {
      const genome = inheritGenome(
        a.genome,
        b.genome,
        this.mutationProbability,
        this.rng,
      );
      const child = createOrganism({
        id: this.counters.nextOrganismId++,
        species: a.species,
        genome,
        x: a.x + this.rng.gaussian() * 4,
        y: a.y + this.rng.gaussian() * 4,
        heading: this.rng.angle() - Math.PI,
        generation,
        parentIds: [a.id, b.id],
        energyFraction: 0,
        age: 0,
      });
      child.energy = Math.min(child.maxEnergy, plan.childEnergy);
      this.clampIntoWorld(child);
      a.childrenCount++;
      b.childrenCount++;
      this.counters.totalBirths++;
      this.counters.births[a.species]++;
      this.lineage.register(child, this.cycle);
      births.push(child);
    }
  }

  private clampIntoWorld(o: Organism): void {
    const { worldWidth: w, worldHeight: h, edgeMode } = this.params;
    if (edgeMode === "wrap") {
      o.x = ((o.x % w) + w) % w;
      o.y = ((o.y % h) + h) % h;
    } else {
      o.x = Math.min(w - o.radius, Math.max(o.radius, o.x));
      o.y = Math.min(h - o.radius, Math.max(o.radius, o.y));
    }
  }

  private removeDead(): void {
    let write = 0;
    for (const o of this.organisms) {
      if (o.alive) this.organisms[write++] = o;
      else this.byId.delete(o.id);
    }
    this.organisms.length = write;
  }

  sampleStats(): void {
    this.stats.sample({
      cycle: this.cycle,
      temperature: this.temperature,
      organisms: this.organisms,
      plants: this.plants,
      corpses: this.corpses,
      counters: this.counters,
    });
  }

  /**
   * Real-time driver: accumulate wall time × speed and run fixed steps,
   * capped per frame by step count and a time budget. Returns steps run.
   */
  tick(realDeltaMs: number, speed: number): number {
    const stepMs = 1000 / BASE_CYCLES_PER_SECOND;
    this.accumulator += Math.min(realDeltaMs, 250) * speed;
    const start = now();
    let steps = 0;
    while (this.accumulator >= stepMs && steps < MAX_STEPS_PER_FRAME) {
      this.step();
      this.accumulator -= stepMs;
      steps++;
      if (now() - start > FRAME_BUDGET_MS) break;
    }
    // Drop backlog we could not afford so high speeds never spiral.
    if (this.accumulator > stepMs * 2) this.accumulator = stepMs;
    return steps;
  }

  /** Run `n` cycles in time-sliced chunks, yielding to the browser between slices. */
  async fastForward(
    n: number,
    opts: FastForwardOptions = {},
  ): Promise<FastForwardResult> {
    const total = Math.max(0, Math.floor(n));
    const slice = opts.sliceMs ?? 14;
    let done = 0;
    while (done < total) {
      if (opts.shouldCancel?.()) return { completed: false, cyclesRun: done };
      const start = now();
      while (done < total && now() - start < slice) {
        this.step();
        done++;
      }
      opts.onProgress?.(done, total);
      await yieldToBrowser();
    }
    return { completed: true, cyclesRun: done };
  }

  /** Apply a parameter. Reset-required params are stored but only take effect on reset. */
  setParam<K extends ParamKey>(
    key: K,
    value: SimParams[K],
  ): { applied: boolean; requiresReset: boolean } {
    if (paramRequiresReset(key)) return { applied: false, requiresReset: true };
    this.params = sanitizeParams({ ...this.params, [key]: value });
    this.version++;
    return { applied: true, requiresReset: false };
  }

  triggerEvent(key: EventKey, options?: TriggerEventOptions): ActiveEvent {
    const e = createEvent(
      this.counters.nextEventId++,
      key,
      this.cycle,
      options,
    );
    this.activeEvents.push(e);
    if (key === "foodAbundance") {
      seedPlants(this.plantContext(), this.plants, FOOD_ABUNDANCE_PLANTS, 0.9);
    } else if (key === "predatorIntroduction") {
      const room = Math.max(
        0,
        this.params.maxPopulation - this.organisms.length,
      );
      const n = Math.min(Math.round(e.magnitude), room);
      for (let i = 0; i < n; i++) {
        const o = this.addFounder("predator");
        o.age = 0;
        o.energy = o.maxEnergy * 0.8;
      }
    }
    this.effects = computeEffects(this.activeEvents);
    this.stats.addEntry(this.cycle, "eventStarted", {
      event: key,
      duration: e.duration,
      magnitude: e.magnitude,
    });
    this.version++;
    return e;
  }

  getOrganism(id: number): Organism | undefined {
    return this.byId.get(id);
  }

  getOrganismView(id: number): OrganismView | null {
    const o = this.byId.get(id);
    return o ? toOrganismView(o) : null;
  }

  /** Nearest living organism within `radius` of a world point, or null. */
  findOrganismAt(x: number, y: number, radius = 10): Organism | null {
    let best: Organism | null = null;
    let bestD = Number.POSITIVE_INFINITY;
    const wrap = this.params.edgeMode === "wrap";
    for (const o of this.organisms) {
      const dx = axisDelta(o.x - x, this.params.worldWidth, wrap);
      const dy = axisDelta(o.y - y, this.params.worldHeight, wrap);
      const d = Math.hypot(dx, dy) - o.radius;
      if (d < radius && d < bestD) {
        bestD = d;
        best = o;
      }
    }
    return best;
  }

  /** Recompute everything derived after loading state. */
  afterLoad(): void {
    this.createGrids();
    this.rebuildIndex();
    this.effects = computeEffects(this.activeEvents);
    this.accumulator = 0;
    this.version++;
  }
}

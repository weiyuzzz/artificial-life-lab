import type { ActiveEvent, EventKey, TriggerEventOptions } from "./types";

/** Environmental events that change simulation rules for a number of cycles. */

export interface EventDefinition {
  key: EventKey;
  defaultDuration: number;
  /** Meaning per event: growth multiplier, spawn count, °C delta, mutation multiplier. */
  defaultMagnitude: number;
  minMagnitude: number;
  maxMagnitude: number;
}

export const EVENT_DEFINITIONS: Record<EventKey, EventDefinition> = {
  drought: {
    key: "drought",
    defaultDuration: 600,
    defaultMagnitude: 0.25,
    minMagnitude: 0,
    maxMagnitude: 0.9,
  },
  foodAbundance: {
    key: "foodAbundance",
    defaultDuration: 400,
    defaultMagnitude: 2,
    minMagnitude: 1.1,
    maxMagnitude: 5,
  },
  predatorIntroduction: {
    key: "predatorIntroduction",
    defaultDuration: 200,
    defaultMagnitude: 15,
    minMagnitude: 1,
    maxMagnitude: 100,
  },
  temperatureChange: {
    key: "temperatureChange",
    defaultDuration: 800,
    defaultMagnitude: 8,
    minMagnitude: -25,
    maxMagnitude: 25,
  },
  mutationBoost: {
    key: "mutationBoost",
    defaultDuration: 500,
    defaultMagnitude: 5,
    minMagnitude: 1.5,
    maxMagnitude: 20,
  },
};

/** Plants added at the start of a Food Abundance event. */
export const FOOD_ABUNDANCE_PLANTS = 300;

export interface EventEffects {
  growthMultiplier: number;
  temperatureDelta: number;
  mutationMultiplier: number;
}

export function createEvent(
  id: number,
  key: EventKey,
  cycle: number,
  options: TriggerEventOptions = {},
): ActiveEvent {
  const def = EVENT_DEFINITIONS[key];
  const duration = Math.max(
    1,
    Math.round(options.duration ?? def.defaultDuration),
  );
  const raw = options.magnitude ?? def.defaultMagnitude;
  const magnitude = Math.min(def.maxMagnitude, Math.max(def.minMagnitude, raw));
  return {
    id,
    key,
    startCycle: cycle,
    duration,
    remaining: duration,
    magnitude,
  };
}

export function computeEffects(events: ActiveEvent[]): EventEffects {
  const fx: EventEffects = {
    growthMultiplier: 1,
    temperatureDelta: 0,
    mutationMultiplier: 1,
  };
  for (const e of events) {
    if (e.key === "drought") fx.growthMultiplier *= e.magnitude;
    else if (e.key === "foodAbundance") fx.growthMultiplier *= e.magnitude;
    else if (e.key === "temperatureChange") fx.temperatureDelta += e.magnitude;
    else if (e.key === "mutationBoost") fx.mutationMultiplier *= e.magnitude;
  }
  return fx;
}

/** Decrement remaining cycles; returns events that ended this cycle. */
export function advanceEvents(events: ActiveEvent[]): ActiveEvent[] {
  const ended: ActiveEvent[] = [];
  let write = 0;
  for (const e of events) {
    e.remaining--;
    if (e.remaining <= 0) ended.push(e);
    else events[write++] = e;
  }
  events.length = write;
  return ended;
}

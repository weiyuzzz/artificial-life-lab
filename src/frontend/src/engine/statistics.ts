import { GENE_RANGES } from "./genetics";
import { MAX_STATS_HISTORY, MAX_TIMELINE } from "./params";
import { PLANT_ENERGY_PER_UNIT } from "./plants";
import type {
  Corpse,
  Genes,
  Organism,
  Plant,
  Species,
  SpeciesStats,
  StatsSample,
  TimelineEntry,
  TimelineType,
  WorldCounters,
} from "./types";
import { GENE_KEYS, SPECIES } from "./types";

/** Statistics collector and auto-generated evolution timeline. */

const POP_WINDOW = 20; // samples compared for boom/crash detection
const POP_COOLDOWN = 400; // cycles between boom/crash entries per species
const GENE_SHIFT = 0.12; // fraction of gene range considered significant
const MILESTONE_STEP = 5;

export interface CollectorState {
  lastBirths: Record<Species, number>;
  lastDeaths: Record<Species, number>;
  lastTotalBirths: number;
  lastTotalDeaths: number;
  recentCounts: Record<Species, number[]>;
  lastPopEntryCycle: Record<Species, number>;
  geneBaseline: Record<Species, Genes | null>;
  milestone: Record<Species, number>;
  alive: Record<Species, boolean>;
  nextEntryId: number;
}

function emptyGenes(): Genes {
  const g = {} as Genes;
  for (const k of GENE_KEYS) g[k] = 0;
  return g;
}

export function createCollectorState(): CollectorState {
  return {
    lastBirths: { herbivore: 0, predator: 0 },
    lastDeaths: { herbivore: 0, predator: 0 },
    lastTotalBirths: 0,
    lastTotalDeaths: 0,
    recentCounts: { herbivore: [], predator: [] },
    lastPopEntryCycle: { herbivore: -1e9, predator: -1e9 },
    geneBaseline: { herbivore: null, predator: null },
    milestone: { herbivore: 0, predator: 0 },
    alive: { herbivore: false, predator: false },
    nextEntryId: 1,
  };
}

export interface SampleInput {
  cycle: number;
  temperature: number;
  organisms: Organism[];
  plants: Plant[];
  corpses: Corpse[];
  counters: WorldCounters;
}

export class StatisticsCollector {
  state: CollectorState = createCollectorState();
  history: StatsSample[] = [];
  timeline: TimelineEntry[] = [];
  /** Highest generation seen in the latest sample. */
  currentGeneration = 0;

  reset(): void {
    this.state = createCollectorState();
    this.history = [];
    this.timeline = [];
    this.currentGeneration = 0;
  }

  get latest(): StatsSample | null {
    return this.history.length ? this.history[this.history.length - 1] : null;
  }

  addEntry(
    cycle: number,
    type: TimelineType,
    params: Record<string, number | string>,
  ): TimelineEntry {
    const entry: TimelineEntry = {
      id: this.state.nextEntryId++,
      cycle,
      generation: this.currentGeneration,
      type,
      params,
    };
    this.timeline.push(entry);
    if (this.timeline.length > MAX_TIMELINE)
      this.timeline.splice(0, this.timeline.length - MAX_TIMELINE);
    return entry;
  }

  sample(input: SampleInput): StatsSample {
    const { counters } = input;
    const acc = {
      herbivore: {
        n: 0,
        age: 0,
        energy: 0,
        repro: 0,
        gen: 0,
        genes: emptyGenes(),
      },
      predator: {
        n: 0,
        age: 0,
        energy: 0,
        repro: 0,
        gen: 0,
        genes: emptyGenes(),
      },
    };
    let energyOrganisms = 0;
    for (const o of input.organisms) {
      if (!o.alive) continue;
      const a = acc[o.species];
      a.n++;
      a.age += o.age;
      a.energy += o.energy;
      a.repro += o.reproductionRate;
      if (o.generation > a.gen) a.gen = o.generation;
      for (const k of GENE_KEYS) a.genes[k] += o.genome.genes[k];
      energyOrganisms += Math.max(0, o.energy);
    }
    let energyPlants = 0;
    for (const p of input.plants)
      energyPlants += p.amount * PLANT_ENERGY_PER_UNIT;
    let energyCorpses = 0;
    for (const c of input.corpses) energyCorpses += c.energy;
    const st = this.state;
    const species = {} as Record<Species, SpeciesStats>;
    for (const sp of SPECIES) {
      const a = acc[sp];
      const n = a.n || 1;
      const genes = emptyGenes();
      for (const k of GENE_KEYS) genes[k] = a.n ? a.genes[k] / n : 0;
      species[sp] = {
        count: a.n,
        births: counters.births[sp] - st.lastBirths[sp],
        deaths: counters.deaths[sp] - st.lastDeaths[sp],
        avgAge: a.n ? a.age / n : 0,
        avgEnergy: a.n ? a.energy / n : 0,
        avgReproductionRate: a.n ? a.repro / n : 0,
        avgLifespan: counters.lifespanCount[sp]
          ? counters.lifespanSum[sp] / counters.lifespanCount[sp]
          : 0,
        maxGeneration: a.gen,
        genes,
      };
      st.lastBirths[sp] = counters.births[sp];
      st.lastDeaths[sp] = counters.deaths[sp];
    }
    const sample: StatsSample = {
      cycle: input.cycle,
      temperature: input.temperature,
      herbivore: species.herbivore,
      predator: species.predator,
      plants: input.plants.length,
      corpses: input.corpses.length,
      births: counters.totalBirths - st.lastTotalBirths,
      deaths: counters.totalDeaths - st.lastTotalDeaths,
      totalBirths: counters.totalBirths,
      totalDeaths: counters.totalDeaths,
      deathCauses: { ...counters.deathCauses },
      energyOrganisms,
      energyPlants,
      energyCorpses,
      totalEnergy: energyOrganisms + energyPlants + energyCorpses,
      maxGeneration: Math.max(
        species.herbivore.maxGeneration,
        species.predator.maxGeneration,
      ),
    };
    st.lastTotalBirths = counters.totalBirths;
    st.lastTotalDeaths = counters.totalDeaths;
    this.currentGeneration = sample.maxGeneration;
    this.history.push(sample);
    if (this.history.length > MAX_STATS_HISTORY)
      this.history.splice(0, this.history.length - MAX_STATS_HISTORY);
    this.detect(sample);
    return sample;
  }

  private detect(s: StatsSample): void {
    const st = this.state;
    for (const sp of SPECIES) {
      const ss = s[sp];
      // extinction
      if (st.alive[sp] && ss.count === 0)
        this.addEntry(s.cycle, "extinction", { species: sp });
      st.alive[sp] = ss.count > 0;
      // generation milestones
      while (ss.maxGeneration >= st.milestone[sp] + MILESTONE_STEP) {
        st.milestone[sp] += MILESTONE_STEP;
        this.addEntry(s.cycle, "generationMilestone", {
          species: sp,
          generation: st.milestone[sp],
        });
      }
      // population boom / crash
      const recent = st.recentCounts[sp];
      recent.push(ss.count);
      if (recent.length > POP_WINDOW + 1) recent.shift();
      if (
        recent.length > POP_WINDOW &&
        s.cycle - st.lastPopEntryCycle[sp] >= POP_COOLDOWN
      ) {
        const from = recent[0];
        const to = ss.count;
        if (to >= from * 1.5 && to - from >= 15) {
          this.addEntry(s.cycle, "populationBoom", {
            species: sp,
            from,
            to,
            percent: Math.round(((to - from) / Math.max(1, from)) * 100),
          });
          st.lastPopEntryCycle[sp] = s.cycle;
        } else if (to <= from * 0.6 && from - to >= 15) {
          this.addEntry(s.cycle, "populationCrash", {
            species: sp,
            from,
            to,
            percent: Math.round(((from - to) / Math.max(1, from)) * 100),
          });
          st.lastPopEntryCycle[sp] = s.cycle;
        }
      }
      // gene shifts
      if (ss.count < 10) continue;
      const base = st.geneBaseline[sp];
      if (!base) {
        st.geneBaseline[sp] = { ...ss.genes };
        continue;
      }
      for (const k of GENE_KEYS) {
        const span = GENE_RANGES[k].max - GENE_RANGES[k].min;
        const diff = ss.genes[k] - base[k];
        if (Math.abs(diff) >= span * GENE_SHIFT) {
          this.addEntry(s.cycle, "geneShift", {
            species: sp,
            gene: k,
            from: round(base[k]),
            to: round(ss.genes[k]),
            direction: diff > 0 ? "up" : "down",
          });
          base[k] = ss.genes[k];
        }
      }
    }
  }
}

function round(v: number): number {
  return Math.round(v * 1000) / 1000;
}

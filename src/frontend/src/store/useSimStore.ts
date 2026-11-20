import { create } from "zustand";
import {
  type ActiveEvent,
  DEFAULT_PARAMS,
  type EventKey,
  type ExperimentData,
  type OrganismView,
  type ParamKey,
  type SimParams,
  type SimSnapshot,
  SimulationEngine,
  type SpeedOption,
  type StatsSample,
  type TimelineEntry,
  type TriggerEventOptions,
  buildExperiment,
  exportState,
  importState,
  loadExperiment,
  paramRequiresReset,
  sanitizeParams,
} from "../engine";

export type OverlayKey = "trails" | "vision" | "behavior";

export interface Camera {
  zoom: number;
  panX: number;
  panY: number;
}

export interface FastForwardProgress {
  done: number;
  total: number;
}

export interface ExperimentContext {
  id: string;
  name: string;
}

export interface SimState {
  running: boolean;
  speed: SpeedOption;
  cycle: number;
  latestStats: StatsSample | null;
  statsHistory: StatsSample[];
  timeline: TimelineEntry[];
  activeEvents: ActiveEvent[];
  selectedId: number | null;
  hoveredId: number | null;
  selectedOrganism: OrganismView | null;
  overlays: Record<OverlayKey, boolean>;
  camera: Camera;
  fastForward: FastForwardProgress | null;
  params: SimParams;
  pendingReset: boolean;
  experiment: ExperimentContext | null;
  start: () => void;
  pause: () => void;
  toggleRunning: () => void;
  step: () => void;
  setSpeed: (speed: SpeedOption) => void;
  reset: (opts?: { params?: Partial<SimParams>; seed?: number }) => void;
  fastForwardBy: (n: number) => Promise<boolean>;
  cancelFastForward: () => void;
  setParam: <K extends ParamKey>(key: K, value: SimParams[K]) => void;
  triggerEvent: (key: EventKey, options?: TriggerEventOptions) => void;
  select: (id: number | null) => void;
  hover: (id: number | null) => void;
  toggleOverlay: (key: OverlayKey) => void;
  setCamera: (camera: Partial<Camera>) => void;
  getEngine: () => SimulationEngine;
  exportSnapshot: () => SimSnapshot;
  exportExperiment: () => ExperimentData;
  loadSnapshot: (snapshot: SimSnapshot) => void;
  loadExperimentData: (data: ExperimentData) => void;
  setExperimentContext: (ctx: ExperimentContext | null) => void;
  sync: () => void;
}

const engine = new SimulationEngine(DEFAULT_PARAMS);
let cancelFlag = false;
const UI_SYNC_MS = 125;

export const useSimStore = create<SimState>((set, get) => ({
  running: true,
  speed: 1,
  cycle: engine.cycle,
  latestStats: engine.stats.latest,
  statsHistory: engine.stats.history.slice(),
  timeline: engine.stats.timeline.slice(),
  activeEvents: [],
  selectedId: null,
  hoveredId: null,
  selectedOrganism: null,
  overlays: { trails: true, vision: false, behavior: true },
  camera: { zoom: 1, panX: 0, panY: 0 },
  fastForward: null,
  params: { ...engine.params },
  pendingReset: false,
  experiment: null,

  sync: () => {
    const { selectedId } = get();
    set({
      cycle: engine.cycle,
      latestStats: engine.stats.latest,
      statsHistory: engine.stats.history.slice(),
      timeline: engine.stats.timeline.slice(),
      activeEvents: engine.activeEvents.map((e) => ({ ...e })),
      selectedOrganism:
        selectedId === null ? null : engine.getOrganismView(selectedId),
    });
  },
  start: () => set({ running: true }),
  pause: () => set({ running: false }),
  toggleRunning: () => set((s) => ({ running: !s.running })),
  step: () => {
    set({ running: false });
    engine.step();
    get().sync();
  },
  setSpeed: (speed) => set({ speed }),
  reset: (opts) => {
    const next = sanitizeParams({
      ...get().params,
      ...(opts?.params ?? {}),
      ...(opts?.seed !== undefined ? { seed: opts.seed } : {}),
    });
    engine.params = next;
    engine.reset();
    set({
      params: { ...engine.params },
      pendingReset: false,
      selectedId: null,
      hoveredId: null,
    });
    get().sync();
  },
  fastForwardBy: async (n) => {
    if (get().fastForward) return false;
    cancelFlag = false;
    const wasRunning = get().running;
    set({ running: false, fastForward: { done: 0, total: n } });
    const result = await engine.fastForward(n, {
      shouldCancel: () => cancelFlag,
      onProgress: (done, total) => set({ fastForward: { done, total } }),
    });
    set({ fastForward: null, running: wasRunning });
    get().sync();
    return result.completed;
  },
  cancelFastForward: () => {
    cancelFlag = true;
  },
  setParam: (key, value) => {
    const params = sanitizeParams({ ...get().params, [key]: value });
    if (paramRequiresReset(key)) {
      set({ params, pendingReset: true });
      return;
    }
    engine.setParam(key, params[key]);
    set({ params });
  },
  triggerEvent: (key, options) => {
    engine.triggerEvent(key, options);
    get().sync();
  },
  select: (id) => {
    set({
      selectedId: id,
      selectedOrganism: id === null ? null : engine.getOrganismView(id),
    });
  },
  hover: (id) => {
    if (get().hoveredId !== id) set({ hoveredId: id });
  },
  toggleOverlay: (key) =>
    set((s) => ({ overlays: { ...s.overlays, [key]: !s.overlays[key] } })),
  setCamera: (camera) => set((s) => ({ camera: { ...s.camera, ...camera } })),
  getEngine: () => engine,
  exportSnapshot: () => exportState(engine),
  exportExperiment: () =>
    buildExperiment(engine, get().experiment?.name ?? null),
  loadSnapshot: (snapshot) => {
    importState(engine, snapshot, {
      history: engine.stats.history,
      timeline: engine.stats.timeline,
    });
    set({
      params: { ...engine.params },
      pendingReset: false,
      selectedId: null,
    });
    get().sync();
  },
  loadExperimentData: (data) => {
    loadExperiment(engine, data);
    set({
      params: { ...engine.params },
      pendingReset: false,
      selectedId: null,
    });
    get().sync();
  },
  setExperimentContext: (ctx) => set({ experiment: ctx }),
}));

/** requestAnimationFrame loop: ticks the engine every frame, syncs UI state ~8×/s. */
function startLoop(): void {
  let last = performance.now();
  let lastSync = 0;
  const frame = (t: number) => {
    const dt = t - last;
    last = t;
    const s = useSimStore.getState();
    if (s.running && !s.fastForward) engine.tick(dt, s.speed);
    if (t - lastSync >= UI_SYNC_MS && !s.fastForward) {
      lastSync = t;
      if (s.running) s.sync();
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

if (
  typeof window !== "undefined" &&
  typeof requestAnimationFrame !== "undefined"
)
  startLoop();

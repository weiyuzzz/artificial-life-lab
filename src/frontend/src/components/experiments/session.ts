import { type ExperimentContext, useSimStore } from "@/store/useSimStore";
import { create } from "zustand";

/** Persistence bookkeeping for the experiment currently loaded in the lab. */
export interface SaveSession {
  experimentId: string | null;
  /** Highest stats-sample cycle already stored as a chunk (-1 = none). */
  lastSavedCycle: number;
  /** Next free stat chunk index for this experiment. */
  nextChunkIndex: number;
  /** Cycle at which the last (auto or manual) snapshot was taken. */
  lastAutoCycle: number;
}

export interface UploadProgress {
  done: number;
  total: number;
}

interface SessionState extends SaveSession {
  saving: boolean;
  progress: UploadProgress | null;
  autoEnabled: boolean;
  autoEvery: number;
  autoKeep: number;
  patch: (next: Partial<SessionState>) => void;
}

const EMPTY: SaveSession = {
  experimentId: null,
  lastSavedCycle: -1,
  nextChunkIndex: 0,
  lastAutoCycle: 0,
};

export const AUTO_EVERY_OPTIONS = [250, 500, 1000, 2500, 5000] as const;
export const AUTO_KEEP_OPTIONS = [3, 5, 10] as const;

export const useExperimentSession = create<SessionState>((set) => ({
  ...EMPTY,
  saving: false,
  progress: null,
  autoEnabled: false,
  autoEvery: 1000,
  autoKeep: 5,
  patch: (next) => set(next),
}));

/** Points the lab at an experiment (or none) and resets save bookkeeping in one step. */
export function activateExperiment(
  ctx: ExperimentContext | null,
  session?: Partial<SaveSession>,
): void {
  useSimStore.getState().setExperimentContext(ctx);
  useExperimentSession.getState().patch({
    ...EMPTY,
    experimentId: ctx?.id ?? null,
    lastAutoCycle: useSimStore.getState().cycle,
    ...session,
    autoEnabled: ctx ? useExperimentSession.getState().autoEnabled : false,
  });
}

type AutoSaver = () => Promise<void>;
let autoSaver: AutoSaver | null = null;

/** Registered by the experiment panel; cleared when saving is not allowed. */
export function registerAutoSaver(fn: AutoSaver | null): void {
  autoSaver = fn;
}

// Threshold check on UI syncs (~8/s), never per frame; writes happen every N cycles only.
useSimStore.subscribe((sim) => {
  const s = useExperimentSession.getState();
  if (!s.autoEnabled || !sim.running || s.saving || !autoSaver) return;
  if (!sim.experiment || sim.experiment.id !== s.experimentId) return;
  if (sim.cycle < s.lastAutoCycle) {
    s.patch({ lastAutoCycle: sim.cycle });
    return;
  }
  if (sim.cycle - s.lastAutoCycle < s.autoEvery) return;
  void autoSaver();
});

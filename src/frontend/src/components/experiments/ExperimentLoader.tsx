import type { Experiment, SnapshotId } from "@/backend";
import { joinSnapshot } from "@/engine";
import { errorMessage } from "@/hooks/apiErrors";
import { useAllStatChunks } from "@/hooks/useExperiments";
import { useFetchSnapshotParts, useSnapshots } from "@/hooks/useSnapshots";
import { useI18n } from "@/i18n";
import { useSimStore } from "@/store/useSimStore";
import { useEffect, useRef } from "react";
import {
  type StoredSnapshot,
  nextChunkIndex,
  parseParams,
  rebuildHistory,
  toExperimentData,
} from "./experimentData";
import { activateExperiment } from "./session";

/**
 * Headless loader: waits for fresh snapshot metadata and stat chunks, then
 * restores the chosen (or latest complete) snapshot with its stats history.
 */
export function ExperimentLoader({
  experiment,
  snapshotId,
  onDone,
  onError,
}: {
  experiment: Experiment;
  snapshotId?: SnapshotId;
  onDone: () => void;
  onError: (message: string) => void;
}) {
  const { t } = useI18n();
  const snapshots = useSnapshots(experiment.id);
  const chunks = useAllStatChunks(experiment.id);
  const { mutateAsync: fetchParts } = useFetchSnapshotParts();
  const started = useRef(false);

  const snapError = snapshots.error ?? chunks.error;
  const ready =
    snapshots.isSuccess &&
    chunks.isSuccess &&
    !snapshots.isFetching &&
    !chunks.isFetching;

  useEffect(() => {
    if (started.current) return;
    if (snapError) {
      started.current = true;
      onError(errorMessage(snapError, t));
      return;
    }
    if (!ready || !snapshots.data || !chunks.data) return;
    started.current = true;
    const chunkList = chunks.data;
    const target = snapshots.data.find((s) =>
      snapshotId != null ? s.id === snapshotId : s.uploadedParts >= s.partCount,
    );
    const ctx = { id: experiment.id.toString(), name: experiment.name };
    const run = async () => {
      if (!target) {
        // No complete snapshot: start the experiment from its initial parameters.
        useSimStore.getState().reset({
          params: parseParams(experiment.envParams),
          seed: Number(experiment.seed),
        });
        activateExperiment(ctx, {
          lastSavedCycle: -1,
          nextChunkIndex: nextChunkIndex(chunkList),
          lastAutoCycle: 0,
        });
        return;
      }
      const parts = await fetchParts(target.id);
      const snapshot = joinSnapshot(parts.map((p) => p.data)) as StoredSnapshot;
      const history = rebuildHistory(chunkList, snapshot.cycle);
      useSimStore
        .getState()
        .loadExperimentData(
          toExperimentData(experiment.name, snapshot, history),
        );
      activateExperiment(ctx, {
        lastSavedCycle: snapshot.cycle,
        nextChunkIndex: nextChunkIndex(chunkList),
        lastAutoCycle: snapshot.cycle,
      });
    };
    run().then(onDone, (error: unknown) => onError(errorMessage(error, t)));
  }, [
    ready,
    snapError,
    snapshots.data,
    chunks.data,
    snapshotId,
    experiment,
    fetchParts,
    onDone,
    onError,
    t,
  ]);

  return null;
}

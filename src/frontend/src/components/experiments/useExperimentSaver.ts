import { splitSnapshot } from "@/engine";
import { errorMessage } from "@/hooks/apiErrors";
import {
  useAppendStatChunk,
  useUpdateExperimentProgress,
} from "@/hooks/useExperiments";
import {
  useCreateSnapshot,
  usePruneAutoSnapshots,
  usePutSnapshotPart,
} from "@/hooks/useSnapshots";
import { useI18n } from "@/i18n";
import { useSimStore } from "@/store/useSimStore";
import { useCallback } from "react";
import { toast } from "sonner";
import {
  SNAPSHOT_PART_BYTES,
  type StoredSnapshot,
  chunkSamples,
  encodeSummary,
} from "./experimentData";
import { useExperimentSession } from "./session";

/**
 * Save the current run: new stat chunks since the last save, a full snapshot in
 * ~1 MB parts, then progress. Auto saves also prune old auto snapshots.
 */
export function useExperimentSaver() {
  const { t } = useI18n();
  const { mutateAsync: appendChunk } = useAppendStatChunk();
  const { mutateAsync: createSnapshot } = useCreateSnapshot();
  const { mutateAsync: putPart } = usePutSnapshotPart();
  const { mutateAsync: updateProgress } = useUpdateExperimentProgress();
  const { mutateAsync: prune } = usePruneAutoSnapshots();

  return useCallback(
    async (auto: boolean, caption = ""): Promise<boolean> => {
      const sim = useSimStore.getState();
      const session = useExperimentSession.getState();
      const ctx = sim.experiment;
      if (!ctx || session.saving || session.experimentId !== ctx.id)
        return false;
      const id = BigInt(ctx.id);
      const engine = sim.getEngine();
      const snapshot = sim.exportSnapshot();
      const stored: StoredSnapshot = {
        ...snapshot,
        timeline: engine.stats.timeline.slice(),
      };
      const fresh = engine.stats.history.filter(
        (s) => s.cycle > session.lastSavedCycle,
      );
      const summary = encodeSummary(engine.stats.latest);
      session.patch({ saving: true, lastAutoCycle: snapshot.cycle });
      try {
        let index = session.nextChunkIndex;
        for (const group of chunkSamples(fresh)) {
          await appendChunk({
            experimentId: id,
            chunkIndex: BigInt(index),
            data: JSON.stringify(group),
          });
          index += 1;
          useExperimentSession.getState().patch({
            nextChunkIndex: index,
            lastSavedCycle: group[group.length - 1].cycle,
          });
        }
        const parts = splitSnapshot(stored, SNAPSHOT_PART_BYTES);
        const view = await createSnapshot({
          experimentId: id,
          input: {
            auto,
            cycle: BigInt(snapshot.cycle),
            caption: caption.trim().slice(0, 200),
            partCount: BigInt(parts.length),
          },
        });
        for (let i = 0; i < parts.length; i++) {
          useExperimentSession
            .getState()
            .patch({ progress: { done: i, total: parts.length } });
          await putPart({
            snapshotId: view.id,
            partIndex: BigInt(i),
            data: parts[i],
          });
        }
        await updateProgress({
          id,
          cycle: BigInt(snapshot.cycle),
          summary,
        });
        if (auto) {
          await prune({
            experimentId: id,
            keep: BigInt(useExperimentSession.getState().autoKeep),
          });
        } else {
          toast.success(t("exp.saved"));
        }
        return true;
      } catch (error) {
        toast.error(errorMessage(error, t));
        return false;
      } finally {
        useExperimentSession
          .getState()
          .patch({ saving: false, progress: null });
      }
    },
    [appendChunk, createSnapshot, putPart, updateProgress, prune, t],
  );
}

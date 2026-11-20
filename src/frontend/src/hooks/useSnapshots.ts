import type {
  ExperimentId,
  SnapshotId,
  SnapshotInput,
  SnapshotPart,
} from "@/backend";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { backendNotReady, unwrap } from "./apiErrors";
import { useSignedInActor } from "./useApproval";

const PART_PAGE_SIZE = 20n;

export function useSnapshots(experimentId: ExperimentId | null | undefined) {
  const { actor, principal, ready } = useSignedInActor();
  return useQuery({
    queryKey: ["snapshots", experimentId?.toString(), principal],
    queryFn: async () => {
      if (!actor || experimentId == null) return [];
      const list = unwrap(await actor.listSnapshots(experimentId));
      return [...list].sort((a, b) => (a.cycle > b.cycle ? -1 : 1));
    },
    enabled: ready && experimentId != null,
  });
}

export function useCreateSnapshot() {
  const { actor } = useSignedInActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      experimentId,
      input,
    }: { experimentId: ExperimentId; input: SnapshotInput }) => {
      if (!actor) backendNotReady();
      return unwrap(await actor.createSnapshot(experimentId, input));
    },
    onSuccess: (_view, { experimentId }) => {
      void queryClient.invalidateQueries({
        queryKey: ["snapshots", experimentId.toString()],
      });
    },
  });
}

export function usePutSnapshotPart() {
  const { actor } = useSignedInActor();
  return useMutation({
    mutationFn: async ({
      snapshotId,
      partIndex,
      data,
    }: { snapshotId: SnapshotId; partIndex: bigint; data: string }) => {
      if (!actor) backendNotReady();
      unwrap(await actor.putSnapshotPart(snapshotId, partIndex, data));
    },
  });
}

/** Imperative fetch of every part of a snapshot, ordered by partIndex. */
export function useFetchSnapshotParts() {
  const { actor } = useSignedInActor();
  return useMutation({
    mutationFn: async (snapshotId: SnapshotId) => {
      if (!actor) backendNotReady();
      const parts: SnapshotPart[] = [];
      let offset = 0n;
      for (;;) {
        const page = unwrap(
          await actor.getSnapshotParts(snapshotId, offset, PART_PAGE_SIZE),
        );
        parts.push(...page.parts);
        offset += BigInt(page.parts.length);
        if (page.parts.length === 0 || offset >= page.total) break;
      }
      return parts.sort((a, b) => (a.partIndex < b.partIndex ? -1 : 1));
    },
  });
}

export function useDeleteSnapshot() {
  const { actor } = useSignedInActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (snapshotId: SnapshotId) => {
      if (!actor) backendNotReady();
      unwrap(await actor.deleteSnapshot(snapshotId));
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["snapshots"] });
    },
  });
}

export function usePruneAutoSnapshots() {
  const { actor } = useSignedInActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      experimentId,
      keep,
    }: { experimentId: ExperimentId; keep: bigint }) => {
      if (!actor) backendNotReady();
      return unwrap(await actor.pruneAutoSnapshots(experimentId, keep));
    },
    onSuccess: (_removed, { experimentId }) => {
      void queryClient.invalidateQueries({
        queryKey: ["snapshots", experimentId.toString()],
      });
    },
  });
}

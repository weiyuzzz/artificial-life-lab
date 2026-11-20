import type { ExperimentId, ExperimentInput, StatChunk } from "@/backend";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { backendNotReady, unwrap } from "./apiErrors";
import { useSignedInActor } from "./useApproval";

const STAT_PAGE_SIZE = 100n;

export function useMyExperiments() {
  const { actor, principal, ready } = useSignedInActor();
  return useQuery({
    queryKey: ["experiments", principal],
    queryFn: async () => {
      if (!actor) return [];
      const list = await actor.listMyExperiments();
      return [...list].sort((a, b) => (a.updatedAt > b.updatedAt ? -1 : 1));
    },
    enabled: ready,
  });
}

export function useExperiment(id: ExperimentId | null | undefined) {
  const { actor, principal, ready } = useSignedInActor();
  return useQuery({
    queryKey: ["experiment", principal, id?.toString()],
    queryFn: async () => (actor && id != null ? actor.getExperiment(id) : null),
    enabled: ready && id != null,
  });
}

export function useCreateExperiment() {
  const { actor } = useSignedInActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ExperimentInput) => {
      if (!actor) backendNotReady();
      return unwrap(await actor.createExperiment(input));
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["experiments"] });
    },
  });
}

export function useRenameExperiment() {
  const { actor } = useSignedInActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name }: { id: ExperimentId; name: string }) => {
      if (!actor) backendNotReady();
      return unwrap(await actor.renameExperiment(id, name));
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["experiments"] });
      void queryClient.invalidateQueries({ queryKey: ["experiment"] });
    },
  });
}

export function useUpdateExperimentProgress() {
  const { actor } = useSignedInActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      cycle,
      summary,
    }: { id: ExperimentId; cycle: bigint; summary: string }) => {
      if (!actor) backendNotReady();
      return unwrap(await actor.updateExperimentProgress(id, cycle, summary));
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["experiments"] });
      void queryClient.invalidateQueries({ queryKey: ["experiment"] });
    },
  });
}

export function useDeleteExperiment() {
  const { actor } = useSignedInActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: ExperimentId) => {
      if (!actor) backendNotReady();
      unwrap(await actor.deleteExperiment(id));
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["experiments"] });
      void queryClient.invalidateQueries({ queryKey: ["statChunks"] });
      void queryClient.invalidateQueries({ queryKey: ["snapshots"] });
    },
  });
}

export function useAppendStatChunk() {
  const { actor } = useSignedInActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      experimentId,
      chunkIndex,
      data,
    }: { experimentId: ExperimentId; chunkIndex: bigint; data: string }) => {
      if (!actor) backendNotReady();
      return unwrap(
        await actor.appendStatChunk(experimentId, chunkIndex, data),
      );
    },
    onSuccess: (_chunk, { experimentId }) => {
      void queryClient.invalidateQueries({
        queryKey: ["statChunks", experimentId.toString()],
      });
    },
  });
}

/** Every stat chunk of an experiment, paging through `total`, ordered by chunkIndex. */
export function useAllStatChunks(
  experimentId: ExperimentId | null | undefined,
) {
  const { actor, principal, ready } = useSignedInActor();
  return useQuery({
    queryKey: ["statChunks", experimentId?.toString(), principal],
    queryFn: async () => {
      if (!actor || experimentId == null) return [];
      const chunks: StatChunk[] = [];
      let offset = 0n;
      for (;;) {
        const page = unwrap(
          await actor.listStatChunks(experimentId, offset, STAT_PAGE_SIZE),
        );
        chunks.push(...page.chunks);
        offset += BigInt(page.chunks.length);
        if (page.chunks.length === 0 || offset >= page.total) break;
      }
      return chunks.sort((a, b) => (a.chunkIndex < b.chunkIndex ? -1 : 1));
    },
    enabled: ready && experimentId != null,
  });
}

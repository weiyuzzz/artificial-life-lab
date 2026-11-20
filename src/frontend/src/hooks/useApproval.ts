import { type ApprovalStatus, createActor } from "@/backend";
import type { ApprovalDisplayStatus } from "@/lib/types";
import { useActor } from "@caffeineai/core-infrastructure";
import type { Principal } from "@icp-sdk/core/principal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { backendNotReady } from "./apiErrors";
import { useAuth } from "./useAuth";

/** Shared readiness gate: actor ready and caller signed in. */
export function useSignedInActor() {
  const { actor, isFetching } = useActor(createActor);
  const { principal, isAuthenticated } = useAuth();
  return { actor, principal, ready: !!actor && !isFetching && isAuthenticated };
}

export function useIsAdmin() {
  const { actor, principal, ready } = useSignedInActor();
  return useQuery({
    queryKey: ["isAdmin", principal],
    queryFn: async () => (actor ? actor.isCallerAdmin() : false),
    enabled: ready,
    retry: false,
  });
}

export function useIsApproved() {
  const { actor, principal, ready } = useSignedInActor();
  return useQuery({
    queryKey: ["isApproved", principal],
    queryFn: async () => (actor ? actor.isCallerApproved() : false),
    enabled: ready,
    retry: false,
  });
}

/** Whether the caller already sent an access request during this session. */
export function useApprovalRequested() {
  const { principal } = useAuth();
  return useQuery({
    queryKey: ["approvalRequested", principal],
    queryFn: () => false,
    enabled: false,
    initialData: false,
  });
}

export function useRequestApproval() {
  const { actor, principal } = useSignedInActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!actor) backendNotReady();
      await actor.requestApproval();
    },
    onSuccess: () => {
      queryClient.setQueryData(["approvalRequested", principal], true);
      void queryClient.invalidateQueries({ queryKey: ["isApproved"] });
    },
  });
}

export function useListApprovals() {
  const { actor, principal, ready } = useSignedInActor();
  const { data: isAdmin } = useIsAdmin();
  return useQuery({
    queryKey: ["approvals", principal],
    queryFn: async () => (actor ? actor.listApprovals() : []),
    enabled: ready && isAdmin === true,
  });
}

export function useSetApproval() {
  const { actor } = useSignedInActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      user,
      status,
    }: { user: Principal; status: ApprovalStatus }) => {
      if (!actor) backendNotReady();
      await actor.setApproval(user, status);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["approvals"] });
    },
  });
}

export function useRemoveApproval() {
  const { actor } = useSignedInActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (user: Principal) => {
      if (!actor) backendNotReady();
      await actor.removeApproval(user);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["approvals"] });
    },
  });
}

/** Display state for the caller's saving access. */
export function useApprovalStatus(): ApprovalDisplayStatus {
  const { isAuthenticated, isInitializing } = useAuth();
  const admin = useIsAdmin();
  const approved = useIsApproved();
  const { data: requested } = useApprovalRequested();
  if (isInitializing) return "loading";
  if (!isAuthenticated) return "signedOut";
  if (admin.isLoading || approved.isLoading) return "loading";
  if (admin.data) return "admin";
  if (approved.data) return "approved";
  return requested ? "requested" : "notApproved";
}

/** True only for signed-in approved users or the admin. */
export function useCanSave(): boolean {
  const status = useApprovalStatus();
  return status === "admin" || status === "approved";
}

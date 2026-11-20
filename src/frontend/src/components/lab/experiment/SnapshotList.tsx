import type { Experiment, SnapshotView } from "@/backend";
import { ConfirmDialog } from "@/components/experiments/ConfirmDialog";
import { ExperimentLoader } from "@/components/experiments/ExperimentLoader";
import { SaveGate } from "@/components/experiments/SaveGate";
import { formatTimestamp } from "@/components/experiments/experimentData";
import { useExperimentSession } from "@/components/experiments/session";
import { dangerButton, ghostButton } from "@/components/experiments/styles";
import { Skeleton } from "@/components/ui/skeleton";
import { errorMessage } from "@/hooks/apiErrors";
import { useDeleteSnapshot, useSnapshots } from "@/hooks/useSnapshots";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";
import { History, Loader2, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

/** Snapshot list of the current experiment with restore and delete. */
export function SnapshotList({ experiment }: { experiment: Experiment }) {
  const { t, language } = useI18n();
  const snapshots = useSnapshots(experiment.id);
  const remove = useDeleteSnapshot();
  const saving = useExperimentSession((s) => s.saving);
  const [restoring, setRestoring] = useState<SnapshotView | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<SnapshotView | null>(null);

  const list = snapshots.data ?? [];

  return (
    <section
      className="border-t border-border px-4 py-3"
      data-ocid="exp.snapshots.section"
    >
      <div className="flex items-center justify-between">
        <h3 className="section-label">{t("exp.snapshots")}</h3>
        <span className="readout text-[11px] text-muted-foreground">
          {list.length}
        </span>
      </div>

      {snapshots.isLoading ? (
        <div
          className="mt-2 space-y-1.5"
          data-ocid="exp.snapshots.loading_state"
        >
          <Skeleton className="h-9 w-full rounded-sm" />
          <Skeleton className="h-9 w-full rounded-sm" />
        </div>
      ) : snapshots.isError ? (
        <p
          role="alert"
          className="mt-2 text-xs text-destructive"
          data-ocid="exp.snapshots.error_state"
        >
          {errorMessage(snapshots.error, t)}
        </p>
      ) : list.length === 0 ? (
        <p
          className="mt-2 text-xs text-muted-foreground"
          data-ocid="exp.snapshots.empty_state"
        >
          {t("exp.snapshotsEmpty")}
        </p>
      ) : (
        <ul
          className="mt-2 divide-y divide-border border-y border-border"
          data-ocid="exp.snapshots.list"
        >
          {list.map((snap, i) => {
            const complete = snap.uploadedParts >= snap.partCount;
            const busy = restoring?.id === snap.id;
            return (
              <li
                key={snap.id.toString()}
                className="flex items-center gap-2 py-1.5"
                data-ocid={`exp.snapshots.item.${i + 1}`}
              >
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 text-xs">
                    <span className="readout text-foreground">
                      {t("exp.snapshotAt", { cycle: snap.cycle.toString() })}
                    </span>
                    {snap.auto && (
                      <span className="rounded-sm bg-accent/15 px-1 font-mono text-[9px] uppercase tracking-wider text-accent">
                        {t("exp.autoBadge")}
                      </span>
                    )}
                    {!complete && (
                      <span className="readout text-[10px] text-warning">
                        {snap.uploadedParts.toString()}/
                        {snap.partCount.toString()}
                      </span>
                    )}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {snap.caption || formatTimestamp(snap.createdAt, language)}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={!complete || restoring !== null || saving}
                  onClick={() => setRestoring(snap)}
                  className={cn(ghostButton, "h-7")}
                  data-ocid={`exp.snapshots.restore_button.${i + 1}`}
                >
                  {busy ? (
                    <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                  ) : (
                    <History className="h-3 w-3" aria-hidden />
                  )}
                  {t("exp.snapshotRestore")}
                </button>
                <button
                  type="button"
                  aria-label={t("exp.snapshotDelete")}
                  disabled={remove.isPending || saving}
                  onClick={() => setConfirmDelete(snap)}
                  className={cn(dangerButton, "h-7 w-7 px-0")}
                  data-ocid={`exp.snapshots.delete_button.${i + 1}`}
                >
                  <Trash2 className="h-3 w-3" aria-hidden />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {restoring && (
        <ExperimentLoader
          experiment={experiment}
          snapshotId={restoring.id}
          onDone={() => {
            setRestoring(null);
            toast.success(t("exp.loaded"));
          }}
          onError={(message) => {
            setRestoring(null);
            toast.error(message);
          }}
        />
      )}

      <ConfirmDialog
        open={confirmDelete !== null}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
        title={t("exp.snapshotDelete")}
        description={t("exp.snapshotAt", {
          cycle: confirmDelete?.cycle.toString() ?? "",
        })}
        confirmLabel={t("exp.delete")}
        destructive
        scope="exp.snapshot_delete"
        onConfirm={() => {
          if (!confirmDelete) return;
          remove.mutate(confirmDelete.id, {
            onError: (error) => toast.error(errorMessage(error, t)),
          });
          setConfirmDelete(null);
        }}
      />
    </section>
  );
}

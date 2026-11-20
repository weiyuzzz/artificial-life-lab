import type { Experiment } from "@/backend";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { errorMessage } from "@/hooks/apiErrors";
import {
  useDeleteExperiment,
  useMyExperiments,
  useRenameExperiment,
} from "@/hooks/useExperiments";
import { useI18n } from "@/i18n";
import { useSimStore } from "@/store/useSimStore";
import { Link, useNavigate } from "@tanstack/react-router";
import { FlaskConical, Search } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "./ConfirmDialog";
import { ExperimentLoader } from "./ExperimentLoader";
import { ExperimentRow } from "./ExperimentRow";
import { NameDialog } from "./NameDialog";
import { activateExperiment } from "./session";
import { ctlButton, fieldInput, primaryButton } from "./styles";

const SKELETONS = Array.from({ length: 4 }, (_, i) => `exp-skeleton-${i}`);

/** Saved-experiment ledger: load into the lab, rename, delete. */
export function ExperimentList() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const experiments = useMyExperiments();
  const rename = useRenameExperiment();
  const remove = useDeleteExperiment();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState<Experiment | null>(null);
  const [renaming, setRenaming] = useState<Experiment | null>(null);
  const [renameError, setRenameError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Experiment | null>(null);

  const onLoaded = useCallback(() => {
    setLoading(null);
    toast.success(t("exp.loaded"));
    void navigate({ to: "/" });
  }, [navigate, t]);
  const onLoadError = useCallback((message: string) => {
    setLoading(null);
    toast.error(message);
  }, []);

  if (experiments.isLoading)
    return (
      <div className="space-y-px" data-ocid="experiments.loading_state">
        {SKELETONS.map((id) => (
          <Skeleton key={id} className="h-12 w-full rounded-none" />
        ))}
      </div>
    );

  if (experiments.isError)
    return (
      <div
        className="border-l-2 border-destructive bg-muted/30 px-4 py-3"
        data-ocid="experiments.error_state"
      >
        <p className="text-sm text-foreground">{t("state.error")}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {errorMessage(experiments.error, t)}
        </p>
        <button
          type="button"
          onClick={() => void experiments.refetch()}
          className={`${ctlButton} mt-3`}
          data-ocid="experiments.retry_button"
        >
          {t("state.retry")}
        </button>
      </div>
    );

  const all = experiments.data ?? [];
  if (all.length === 0)
    return (
      <div
        className="lab-grid flex flex-col items-center justify-center gap-3 border border-border px-6 py-16 text-center"
        data-ocid="experiments.empty_state"
      >
        <FlaskConical className="h-8 w-8 text-primary" aria-hidden />
        <p className="max-w-sm text-sm text-muted-foreground">
          {t("exp.listEmpty")}
        </p>
        <Link
          to="/"
          className={primaryButton}
          data-ocid="experiments.empty.go_to_lab.link"
        >
          {t("exp.goToLab")}
        </Link>
      </div>
    );

  const q = query.trim().toLowerCase();
  const rows = q ? all.filter((e) => e.name.toLowerCase().includes(q)) : all;

  return (
    <div>
      <div className="relative mb-3 max-w-xs">
        <Search
          className="pointer-events-none absolute left-2.5 top-2 h-4 w-4 text-muted-foreground"
          aria-hidden
        />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("exp.search")}
          aria-label={t("exp.search")}
          className={`${fieldInput} pl-8`}
          data-ocid="experiments.search_input"
        />
      </div>
      <div className="overflow-x-auto border border-border bg-card/40">
        <table
          className="w-full min-w-[560px] text-sm"
          data-ocid="experiments.table"
        >
          <thead className="sticky top-0 bg-card">
            <tr className="border-b border-border text-left">
              {[
                { k: t("exp.name"), c: "pl-3" },
                { k: t("exp.seed"), c: "text-right" },
                { k: t("exp.cycle"), c: "text-right" },
                { k: t("exp.updated"), c: "hidden md:table-cell" },
                { k: t("compare.summary"), c: "hidden lg:table-cell" },
              ].map(({ k, c }) => (
                <th
                  key={k}
                  className={`section-label py-2 pr-4 font-medium ${c}`}
                >
                  {k}
                </th>
              ))}
              <th className="py-2 pr-3">
                <span className="sr-only">{t("admin.actions")}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((exp, i) => (
              <ExperimentRow
                key={exp.id.toString()}
                experiment={exp}
                index={i + 1}
                loading={loading?.id === exp.id}
                busy={loading !== null}
                onLoad={() => setLoading(exp)}
                onRename={() => {
                  setRenameError(null);
                  setRenaming(exp);
                }}
                onDelete={() => setDeleting(exp)}
              />
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <p
            className="px-3 py-6 text-center text-xs text-muted-foreground"
            data-ocid="experiments.search.empty_state"
          >
            {t("state.empty")}
          </p>
        )}
      </div>

      {loading && (
        <ExperimentLoader
          experiment={loading}
          onDone={onLoaded}
          onError={onLoadError}
        />
      )}

      {renaming && (
        <NameDialog
          open
          onOpenChange={(open) => !open && setRenaming(null)}
          scope="experiments.rename"
          title={t("exp.rename")}
          submitLabel={t("exp.rename")}
          initialName={renaming.name}
          pending={rename.isPending}
          error={renameError}
          onSubmit={({ name }) =>
            rename.mutate(
              { id: renaming.id, name },
              {
                onSuccess: () => {
                  const ctx = useSimStore.getState().experiment;
                  if (ctx?.id === renaming.id.toString())
                    useSimStore
                      .getState()
                      .setExperimentContext({ ...ctx, name });
                  setRenaming(null);
                },
                onError: (error) => setRenameError(errorMessage(error, t)),
              },
            )
          }
        />
      )}

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={t("exp.delete")}
        description={t("exp.deleteConfirm", { name: deleting?.name ?? "" })}
        confirmLabel={t("exp.delete")}
        destructive
        scope="experiments.delete"
        onConfirm={() => {
          if (!deleting) return;
          const target = deleting;
          setDeleting(null);
          remove.mutate(target.id, {
            onSuccess: () => {
              if (
                useSimStore.getState().experiment?.id === target.id.toString()
              )
                activateExperiment(null);
              toast.success(t("exp.deleted"));
            },
            onError: (error) => toast.error(errorMessage(error, t)),
          });
        }}
      />
    </div>
  );
}

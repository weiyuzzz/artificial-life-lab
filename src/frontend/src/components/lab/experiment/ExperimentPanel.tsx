import { ConfirmDialog } from "@/components/experiments/ConfirmDialog";
import { NameDialog } from "@/components/experiments/NameDialog";
import { SaveGate } from "@/components/experiments/SaveGate";
import {
  initialPopulation,
  parseParams,
} from "@/components/experiments/experimentData";
import {
  activateExperiment,
  registerAutoSaver,
  useExperimentSession,
} from "@/components/experiments/session";
import {
  ctlButton,
  fieldInput,
  ghostButton,
  primaryButton,
} from "@/components/experiments/styles";
import { useExperimentSaver } from "@/components/experiments/useExperimentSaver";
import { Input } from "@/components/ui/input";
import { sanitizeParams } from "@/engine";
import { errorMessage } from "@/hooks/apiErrors";
import { useCanSave } from "@/hooks/useApproval";
import {
  useCreateExperiment,
  useExperiment,
  useRenameExperiment,
} from "@/hooks/useExperiments";
import { useI18n } from "@/i18n";
import { useSimStore } from "@/store/useSimStore";
import { Loader2, PencilLine, Plus, RotateCcw, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AutoSnapshotControl } from "./AutoSnapshotControl";
import { DataTransfer } from "./DataTransfer";
import { SnapshotList } from "./SnapshotList";

export function ExperimentPanel() {
  const { t } = useI18n();
  const canSave = useCanSave();
  const ctx = useSimStore((s) => s.experiment);
  const cycle = useSimStore((s) => s.cycle);
  const seed = useSimStore((s) => s.params.seed);
  const saving = useExperimentSession((s) => s.saving);
  const progress = useExperimentSession((s) => s.progress);
  const record = useExperiment(ctx ? BigInt(ctx.id) : null);
  const create = useCreateExperiment();
  const rename = useRenameExperiment();
  const save = useExperimentSaver();
  const [dialog, setDialog] = useState<"create" | "rename" | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [caption, setCaption] = useState("");

  useEffect(() => {
    registerAutoSaver(
      canSave
        ? async () => {
            await save(true);
          }
        : null,
    );
  }, [canSave, save]);

  const experiment = record.data ?? null;

  const openDialog = (kind: "create" | "rename") => {
    setDialogError(null);
    setDialog(kind);
  };

  const onCreate = ({
    name,
    seed: nextSeed,
  }: { name: string; seed: number }) => {
    const params = sanitizeParams({
      ...useSimStore.getState().params,
      seed: nextSeed,
    });
    create.mutate(
      {
        name,
        seed: BigInt(params.seed),
        envParams: JSON.stringify(params),
        populationConfig: JSON.stringify(initialPopulation(params)),
        summary: "",
      },
      {
        onSuccess: (exp) => {
          useSimStore.getState().reset({ params, seed: params.seed });
          activateExperiment({ id: exp.id.toString(), name: exp.name });
          setDialog(null);
          toast.success(t("exp.saved"));
        },
        onError: (error) => setDialogError(errorMessage(error, t)),
      },
    );
  };

  const onRename = ({ name }: { name: string }) => {
    if (!ctx) return;
    rename.mutate(
      { id: BigInt(ctx.id), name },
      {
        onSuccess: () => {
          useSimStore.getState().setExperimentContext({ ...ctx, name });
          setDialog(null);
        },
        onError: (error) => setDialogError(errorMessage(error, t)),
      },
    );
  };

  const onReset = () => {
    if (!experiment) return;
    useSimStore.getState().reset({
      params: parseParams(experiment.envParams),
      seed: Number(experiment.seed),
    });
    useExperimentSession
      .getState()
      .patch({ lastSavedCycle: -1, lastAutoCycle: 0 });
    setConfirmReset(false);
  };

  const onSave = () => {
    const captured = caption;
    setCaption("");
    void save(false, captured).then((ok) => {
      if (!ok) setCaption((cur) => (cur === "" ? captured : cur));
    });
  };

  return (
    <div className="pb-6" data-ocid="exp.panel">
      <section className="px-4 pt-3 pb-3">
        <h2 className="section-label">{t("exp.current")}</h2>
        <p
          className="mt-1.5 truncate font-display text-lg font-semibold tracking-tight"
          title={ctx?.name}
          data-ocid="exp.current.name"
        >
          {ctx ? (
            ctx.name
          ) : (
            <span className="text-muted-foreground">{t("exp.unsaved")}</span>
          )}
        </p>
        <dl className="mt-2 grid grid-cols-2 gap-px border border-border bg-border">
          {[
            { k: t("exp.seed"), v: seed },
            { k: t("exp.cycle"), v: cycle.toLocaleString() },
          ].map(({ k, v }) => (
            <div key={k} className="bg-sidebar px-2.5 py-1.5">
              <dt className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                {k}
              </dt>
              <dd className="readout text-sm text-foreground">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          <button
            type="button"
            disabled={!canSave}
            onClick={() => openDialog("create")}
            className={ctx ? ctlButton : primaryButton}
            title={canSave ? undefined : t("approval.saveLocked")}
            data-ocid="exp.new.open_modal_button"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
            {t("exp.new")}
          </button>
          {ctx && (
            <>
              <button
                type="button"
                disabled={!canSave}
                onClick={() => openDialog("rename")}
                className={ghostButton}
                data-ocid="exp.rename.open_modal_button"
              >
                <PencilLine className="h-3.5 w-3.5" aria-hidden />
                {t("exp.rename")}
              </button>
              <button
                type="button"
                disabled={!experiment || saving}
                onClick={() => setConfirmReset(true)}
                className={ghostButton}
                data-ocid="exp.reset.button"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                {t("exp.reset")}
              </button>
            </>
          )}
        </div>
      </section>

      {!canSave && <SaveGate scope="exp" className="mx-4 mb-3" />}

      {canSave && ctx && (
        <section
          className="border-t border-border px-4 py-3"
          data-ocid="exp.save.section"
        >
          <label htmlFor="exp-caption" className="section-label">
            {t("exp.snapshotCaption")}
          </label>
          <div className="mt-1.5 flex gap-1.5">
            <Input
              id="exp-caption"
              value={caption}
              maxLength={200}
              onChange={(e) => setCaption(e.target.value)}
              className={fieldInput}
              data-ocid="exp.caption.input"
            />
            <button
              type="button"
              disabled={saving}
              onClick={onSave}
              className={primaryButton}
              data-ocid="exp.save_button"
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : (
                <Save className="h-3.5 w-3.5" aria-hidden />
              )}
              {saving ? t("exp.saving") : t("exp.save")}
            </button>
          </div>
          {progress && (
            <p
              className="readout mt-1.5 text-[11px] text-primary"
              aria-live="polite"
              data-ocid="exp.save.loading_state"
            >
              {t("exp.snapshotUploading", {
                done: progress.done,
                total: progress.total,
              })}
            </p>
          )}
        </section>
      )}

      <AutoSnapshotControl disabled={!canSave || !ctx} />
      {canSave && experiment && <SnapshotList experiment={experiment} />}
      <DataTransfer />

      {dialog && (
        <NameDialog
          open
          onOpenChange={(open) => !open && setDialog(null)}
          scope={dialog === "create" ? "exp.create" : "exp.rename"}
          title={dialog === "create" ? t("exp.new") : t("exp.rename")}
          submitLabel={dialog === "create" ? t("exp.new") : t("exp.rename")}
          initialName={dialog === "rename" ? (ctx?.name ?? "") : ""}
          initialSeed={dialog === "create" ? seed : undefined}
          pending={create.isPending || rename.isPending}
          error={dialogError}
          onSubmit={dialog === "create" ? onCreate : onRename}
        />
      )}
      <ConfirmDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title={t("exp.reset")}
        description={t("time.resetConfirm")}
        scope="exp.reset"
        onConfirm={onReset}
      />
    </div>
  );
}

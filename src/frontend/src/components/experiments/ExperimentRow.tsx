import type { Experiment } from "@/backend";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";
import { useSimStore } from "@/store/useSimStore";
import { FlaskConical, Loader2, PencilLine, Trash2 } from "lucide-react";
import { decodeSummary, formatTimestamp } from "./experimentData";
import { dangerButton, ghostButton, primaryButton } from "./styles";

export function ExperimentSummary({ text }: { text: string }) {
  const { t } = useI18n();
  const s = decodeSummary(text);
  if (!s)
    return (
      <span className="truncate text-muted-foreground">{text || "—"}</span>
    );
  return (
    <span className="readout flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
      <span title={t("species.herbivore")} className="flex items-center gap-1">
        <span className="h-1.5 w-1.5 rounded-full bg-herbivore" aria-hidden />
        {s.h}
      </span>
      <span title={t("species.predator")} className="flex items-center gap-1">
        <span className="h-1.5 w-1.5 rounded-full bg-predator" aria-hidden />
        {s.p}
      </span>
      <span title={t("species.plant")} className="flex items-center gap-1">
        <span className="h-1.5 w-1.5 rounded-full bg-plant" aria-hidden />
        {s.pl}
      </span>
      <span
        title={t("dashboard.maxGeneration")}
        className="text-muted-foreground"
      >
        G{s.g}
      </span>
    </span>
  );
}

/** One dense ledger row of the saved-experiments table. */
export function ExperimentRow({
  experiment,
  index,
  loading,
  busy,
  onLoad,
  onRename,
  onDelete,
}: {
  experiment: Experiment;
  index: number;
  loading: boolean;
  busy: boolean;
  onLoad: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  const { t, language } = useI18n();
  const isCurrent = useSimStore(
    (s) => s.experiment?.id === experiment.id.toString(),
  );

  return (
    <tr
      className={cn(
        "group border-b border-border transition-smooth hover:bg-muted/30",
        isCurrent && "bg-primary/5",
      )}
      data-ocid={`experiments.item.${index}`}
    >
      <td className="max-w-[260px] py-3 pl-3 pr-4">
        <div className="flex min-w-0 items-center gap-2">
          {isCurrent && (
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary animate-pulse"
              aria-hidden
            />
          )}
          <span
            className="truncate font-medium text-foreground"
            title={experiment.name}
          >
            {experiment.name}
          </span>
        </div>
        <p className="mt-0.5 text-[11px] text-muted-foreground md:hidden">
          {formatTimestamp(experiment.updatedAt, language)}
        </p>
      </td>
      <td className="readout py-3 pr-4 text-right text-xs text-muted-foreground">
        {experiment.seed.toString()}
      </td>
      <td className="readout py-3 pr-4 text-right text-xs">
        {Number(experiment.cycle).toLocaleString()}
      </td>
      <td className="hidden py-3 pr-4 text-xs text-muted-foreground md:table-cell">
        {formatTimestamp(experiment.updatedAt, language)}
      </td>
      <td className="hidden py-3 pr-4 lg:table-cell">
        <ExperimentSummary text={experiment.summary} />
      </td>
      <td className="py-2 pr-3">
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={onLoad}
            disabled={busy}
            className={cn(primaryButton, "h-7")}
            data-ocid={`experiments.load_button.${index}`}
          >
            {loading ? (
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
            ) : (
              <FlaskConical className="h-3 w-3" aria-hidden />
            )}
            {loading ? t("exp.loading") : t("exp.openLab")}
          </button>
          <button
            type="button"
            aria-label={t("exp.rename")}
            onClick={onRename}
            disabled={busy}
            className={cn(ghostButton, "h-7 w-7 px-0")}
            data-ocid={`experiments.edit_button.${index}`}
          >
            <PencilLine className="h-3.5 w-3.5" aria-hidden />
          </button>
          <button
            type="button"
            aria-label={t("exp.delete")}
            onClick={onDelete}
            disabled={busy}
            className={cn(dangerButton, "h-7 w-7 px-0")}
            data-ocid={`experiments.delete_button.${index}`}
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      </td>
    </tr>
  );
}

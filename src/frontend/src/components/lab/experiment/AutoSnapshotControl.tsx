import {
  AUTO_EVERY_OPTIONS,
  AUTO_KEEP_OPTIONS,
  useExperimentSession,
} from "@/components/experiments/session";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useI18n } from "@/i18n";
import { useSimStore } from "@/store/useSimStore";

const triggerClass =
  "h-8 rounded-sm border-input bg-background/60 font-mono text-[11px]";

/** Auto snapshot toggle: snapshot every N cycles while running, keep the latest K. */
export function AutoSnapshotControl({ disabled }: { disabled: boolean }) {
  const { t } = useI18n();
  const enabled = useExperimentSession((s) => s.autoEnabled);
  const every = useExperimentSession((s) => s.autoEvery);
  const keep = useExperimentSession((s) => s.autoKeep);
  const patch = useExperimentSession((s) => s.patch);

  return (
    <section
      className="border-t border-border px-4 py-3"
      data-ocid="exp.auto.section"
    >
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor="exp-auto-switch" className="section-label">
          {t("exp.autoSnapshot")}
        </Label>
        <Switch
          id="exp-auto-switch"
          checked={enabled && !disabled}
          disabled={disabled}
          onCheckedChange={(checked) =>
            patch({
              autoEnabled: checked,
              lastAutoCycle: useSimStore.getState().cycle,
            })
          }
          data-ocid="exp.auto.switch"
        />
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <Select
          value={String(every)}
          disabled={disabled}
          onValueChange={(v) => patch({ autoEvery: Number(v) })}
        >
          <SelectTrigger
            className={triggerClass}
            aria-label={t("exp.autoSnapshot")}
            data-ocid="exp.auto.every.select"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {AUTO_EVERY_OPTIONS.map((n) => (
              <SelectItem key={n} value={String(n)} className="text-xs">
                {t("exp.autoSnapshotEvery", { cycles: n })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={String(keep)}
          disabled={disabled}
          onValueChange={(v) => patch({ autoKeep: Number(v) })}
        >
          <SelectTrigger
            className={triggerClass}
            aria-label={t("exp.autoSnapshot")}
            data-ocid="exp.auto.keep.select"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {AUTO_KEEP_OPTIONS.map((n) => (
              <SelectItem key={n} value={String(n)} className="text-xs">
                {t("exp.autoSnapshotKeep", { count: n })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </section>
  );
}

import type { Experiment } from "@/backend";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";

/** Selects one saved experiment; the other slot's choice is disabled. */
export function ExperimentPicker({
  tag,
  label,
  experiments,
  value,
  otherValue,
  onChange,
  dashed,
}: {
  tag: "a" | "b";
  label: string;
  experiments: Experiment[];
  value: string | undefined;
  otherValue: string | undefined;
  onChange: (id: string) => void;
  dashed: boolean;
}) {
  const { t } = useI18n();
  const id = `compare-pick-${tag}`;
  return (
    <div className="min-w-0 flex-1 space-y-1.5">
      <label htmlFor={id} className="flex items-center gap-2 section-label">
        <span
          aria-hidden="true"
          className={cn(
            "inline-block w-6 border-t-2 border-foreground",
            dashed && "border-dashed",
          )}
        />
        {label}
      </label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger
          id={id}
          className="h-10 bg-card"
          data-ocid={`compare.experiment_${tag}.select`}
        >
          <SelectValue placeholder={t("compare.select")} />
        </SelectTrigger>
        <SelectContent>
          {experiments.map((exp) => {
            const key = exp.id.toString();
            return (
              <SelectItem key={key} value={key} disabled={key === otherValue}>
                <span className="truncate">{exp.name}</span>
                <span className="ml-2 readout text-xs text-muted-foreground">
                  {t("timeline.cycleAt", { cycle: exp.cycle })}
                </span>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}

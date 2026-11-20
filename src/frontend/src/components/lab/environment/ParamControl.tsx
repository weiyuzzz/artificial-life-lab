import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import type { ParamMeta } from "@/engine";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";
import { RotateCcw } from "lucide-react";
import { useState } from "react";

export function decimalsFor(step: number): number {
  const s = String(step);
  return s.includes(".") ? (s.split(".")[1]?.length ?? 0) : 0;
}

export function formatValue(value: number, step: number): string {
  return value.toFixed(decimalsFor(step));
}

interface NumberFieldProps {
  id: string;
  value: number;
  min: number;
  max: number;
  step: number;
  ocid: string;
  ariaLabel: string;
  onCommit: (value: number) => void;
  className?: string;
}

/** Numeric text input that keeps a local draft while focused and commits on blur/Enter. */
export function NumberField({
  id,
  value,
  min,
  max,
  step,
  ocid,
  ariaLabel,
  onCommit,
  className,
}: NumberFieldProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const commit = () => {
    if (draft === null) return;
    const n = Number(draft);
    if (draft.trim() !== "" && Number.isFinite(n)) {
      onCommit(Math.min(max, Math.max(min, n)));
    }
    setDraft(null);
  };
  return (
    <Input
      id={id}
      type="number"
      inputMode="decimal"
      min={min}
      max={max}
      step={step}
      aria-label={ariaLabel}
      data-ocid={ocid}
      value={draft ?? formatValue(value, step)}
      onFocus={() => setDraft(formatValue(value, step))}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") {
          setDraft(null);
          e.currentTarget.blur();
        }
      }}
      className={cn(
        "readout h-7 w-24 rounded-sm border-input bg-background px-2 text-right text-xs transition-smooth focus-visible:ring-1",
        className,
      )}
    />
  );
}

interface ParamControlProps {
  meta: ParamMeta;
  label: string;
  value: number;
  pending: boolean;
  onChange: (value: number) => void;
}

/** One numeric parameter row: label, live/reset badge, slider and exact input. */
export function ParamControl({
  meta,
  label,
  value,
  pending,
  onChange,
}: ParamControlProps) {
  const { t } = useI18n();
  const id = `param-${meta.key}`;
  return (
    <div className="group py-2.5" data-ocid={`env.param.${meta.key}`}>
      <div className="flex items-center justify-between gap-3">
        <label
          htmlFor={id}
          className="min-w-0 truncate text-[13px] text-foreground"
        >
          {label}
        </label>
        <NumberField
          id={id}
          value={value}
          min={meta.min}
          max={meta.max}
          step={meta.step}
          ariaLabel={label}
          ocid={`env.${meta.key}.input`}
          onCommit={onChange}
          className={pending ? "border-warning/60 text-warning" : undefined}
        />
      </div>
      <div className="mt-2 flex items-center gap-3">
        <Slider
          value={[value]}
          min={meta.min}
          max={meta.max}
          step={meta.step}
          aria-label={label}
          data-ocid={`env.${meta.key}.slider`}
          onValueChange={(v) => {
            const next = v[0];
            if (next !== undefined) onChange(next);
          }}
          className="flex-1"
        />
        <ResetBadge requiresReset={meta.requiresReset} pending={pending} />
      </div>
      {meta.requiresReset && pending && (
        <p className="mt-1.5 flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-warning">
          <RotateCcw className="h-3 w-3" aria-hidden />
          {t("env.resetRequired")}
        </p>
      )}
    </div>
  );
}

export function ResetBadge({
  requiresReset,
  pending,
}: {
  requiresReset: boolean;
  pending: boolean;
}) {
  const { t } = useI18n();
  if (requiresReset) {
    return (
      <span
        title={t("env.resetRequired")}
        className={cn(
          "inline-flex h-5 shrink-0 items-center gap-1 rounded-sm border px-1.5 font-mono text-[9px] uppercase tracking-wider transition-smooth",
          pending
            ? "border-warning/60 bg-warning/10 text-warning"
            : "border-border text-muted-foreground",
        )}
      >
        <RotateCcw className="h-2.5 w-2.5" aria-hidden />
        <span className="sr-only">{t("env.resetRequired")}</span>
      </span>
    );
  }
  return (
    <span className="inline-flex h-5 shrink-0 items-center gap-1 rounded-sm border border-primary/30 px-1.5 font-mono text-[9px] uppercase tracking-wider text-primary">
      <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
      {t("env.live")}
    </span>
  );
}

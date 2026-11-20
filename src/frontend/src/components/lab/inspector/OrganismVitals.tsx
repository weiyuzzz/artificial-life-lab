import type { OrganismView } from "@/engine";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { fmt } from "./format";

function Meter({
  value,
  max,
  tone,
}: { value: number; max: number; tone: string }) {
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  return (
    <div className="mt-1 h-1 w-full bg-muted">
      <div
        className={cn("h-full origin-left transition-smooth", tone)}
        style={{ transform: `scaleX(${pct})` }}
      />
    </div>
  );
}

function Field({
  label,
  children,
  className,
}: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("min-w-0 border-b border-border/70 py-2", className)}>
      <dt className="section-label">{label}</dt>
      <dd className="readout mt-0.5 truncate text-sm text-foreground">
        {children}
      </dd>
    </div>
  );
}

export function OrganismVitals({ organism }: { organism: OrganismView }) {
  const { t } = useI18n();
  const o = organism;
  return (
    <dl className="grid grid-cols-2 gap-x-4" data-ocid="inspector.vitals.panel">
      <Field label={t("inspector.id")}>#{o.id}</Field>
      <Field label={t("inspector.species")}>
        <span className="flex items-center gap-1.5">
          <span
            aria-hidden
            className={cn(
              "size-2 rounded-full",
              o.species === "predator" ? "bg-predator" : "bg-herbivore",
            )}
          />
          <span
            className={
              o.species === "predator" ? "text-predator" : "text-herbivore"
            }
          >
            {t(`species.${o.species}`)}
          </span>
        </span>
      </Field>
      <Field label={t("inspector.age")}>
        {t("inspector.cycles", { value: Math.floor(o.age) })}
        <span className="text-muted-foreground"> / {Math.floor(o.maxAge)}</span>
        <Meter value={o.age} max={o.maxAge} tone="bg-chart-5" />
      </Field>
      <Field label={t("inspector.generation")}>G{o.generation}</Field>
      <Field label={t("inspector.energy")}>
        {fmt(o.energy, 1)}
        <span className="text-muted-foreground"> / {fmt(o.maxEnergy, 0)}</span>
        <Meter value={o.energy} max={o.maxEnergy} tone="bg-chart-4" />
      </Field>
      <Field label={t("inspector.health")}>
        {fmt(o.health, 1)}
        <span className="text-muted-foreground"> / {fmt(o.maxHealth, 0)}</span>
        <Meter value={o.health} max={o.maxHealth} tone="bg-chart-3" />
      </Field>
      <Field label={t("inspector.parents")}>
        {o.parentIds ? (
          `#${o.parentIds[0]} × #${o.parentIds[1]}`
        ) : (
          <span className="text-muted-foreground">
            {t("inspector.noParents")}
          </span>
        )}
      </Field>
      <Field label={t("inspector.behavior")}>
        <span
          className="inline-flex items-center gap-1.5"
          data-ocid="inspector.behavior.item"
        >
          <span
            aria-hidden
            className="size-1.5 animate-pulse rounded-full bg-primary"
          />
          {t(`behavior.${o.behavior}`)}
        </span>
      </Field>
    </dl>
  );
}

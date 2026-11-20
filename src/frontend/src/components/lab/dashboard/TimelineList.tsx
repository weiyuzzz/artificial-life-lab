import type { TimelineEntry, TimelineType } from "@/engine";
import { useI18n } from "@/i18n";
import type { TranslateFn } from "@/i18n";
import { cn } from "@/lib/utils";
import { useSimStore } from "@/store/useSimStore";
import { useMemo } from "react";
import {
  eventLabel,
  formatInt,
  geneLabel,
  paramNumber,
  speciesLabel,
} from "./format";

const TYPE_TONE: Record<TimelineType, string> = {
  simulationStart: "bg-primary",
  generationMilestone: "bg-chart-5",
  geneShift: "bg-chart-1",
  populationBoom: "bg-chart-3",
  populationCrash: "bg-chart-4",
  extinction: "bg-destructive",
  eventStarted: "bg-warning",
  eventEnded: "bg-muted-foreground",
};

function describe(t: TranslateFn, e: TimelineEntry): string {
  const p = e.params;
  switch (e.type) {
    case "simulationStart":
      return [
        `${t("dashboard.herbivores")} ${formatInt(paramNumber(p.herbivores))}`,
        `${t("dashboard.predators")} ${formatInt(paramNumber(p.predators))}`,
        `${t("dashboard.plants")} ${formatInt(paramNumber(p.plants))}`,
        `${t("env.seed")} ${p.seed ?? ""}`,
      ].join(" · ");
    case "generationMilestone":
      return t("timeline.generation", {
        species: speciesLabel(t, p.species),
        generation: paramNumber(p.generation),
      });
    case "geneShift":
      return t("timeline.geneShift", {
        species: speciesLabel(t, p.species),
        gene: geneLabel(t, p.gene),
        direction:
          p.direction === "up" ? t("timeline.geneUp") : t("timeline.geneDown"),
        value: paramNumber(p.to).toFixed(2),
      });
    case "populationBoom":
      return t("timeline.populationRise", {
        species: speciesLabel(t, p.species),
        count: formatInt(paramNumber(p.to)),
      });
    case "populationCrash":
      return t("timeline.populationCrash", {
        species: speciesLabel(t, p.species),
        count: formatInt(paramNumber(p.to)),
      });
    case "extinction":
      return t("timeline.extinction", { species: speciesLabel(t, p.species) });
    case "eventStarted":
      return t("timeline.event", { event: eventLabel(t, p.event) });
    case "eventEnded":
      return t("timeline.eventEnded", { event: eventLabel(t, p.event) });
  }
}

function ActiveEvents() {
  const { t } = useI18n();
  const events = useSimStore((s) => s.activeEvents);
  if (events.length === 0) return null;
  return (
    <div
      className="border-b border-border px-4 py-3"
      data-ocid="dashboard.active_events.list"
    >
      <h3 className="section-label">{t("env.active")}</h3>
      <ul className="mt-2 space-y-2">
        {events.map((e, i) => {
          const ratio = e.duration > 0 ? e.remaining / e.duration : 0;
          return (
            <li key={e.id} data-ocid={`dashboard.active_events.item.${i + 1}`}>
              <div className="flex items-baseline justify-between gap-2 text-xs">
                <span className="flex min-w-0 items-center gap-1.5 text-foreground">
                  <span className="size-1.5 shrink-0 animate-pulse rounded-full bg-warning" />
                  <span className="truncate">{eventLabel(t, e.key)}</span>
                </span>
                <span className="readout shrink-0 text-muted-foreground">
                  {t("env.remaining", { cycles: formatInt(e.remaining) })}
                </span>
              </div>
              <div className="mt-1.5 h-px w-full overflow-hidden bg-border">
                <div
                  className="h-full w-full origin-left bg-warning transition-transform duration-300"
                  style={{
                    transform: `scaleX(${Math.max(0, Math.min(1, ratio))})`,
                  }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Evolution timeline, newest entry first, plus currently active events. */
export function TimelineList() {
  const { t } = useI18n();
  const timeline = useSimStore((s) => s.timeline);
  const entries = useMemo(() => timeline.slice().reverse(), [timeline]);

  return (
    <section
      aria-label={t("dashboard.timeline")}
      data-ocid="dashboard.timeline.section"
    >
      <ActiveEvents />
      <div className="px-4 pt-3">
        <h3 className="section-label">{t("dashboard.timeline")}</h3>
      </div>
      {entries.length === 0 ? (
        <p
          className="px-4 py-4 text-sm text-muted-foreground"
          data-ocid="dashboard.timeline.empty_state"
        >
          {t("dashboard.timelineEmpty")}
        </p>
      ) : (
        <ol className="relative mt-2 pb-3" data-ocid="dashboard.timeline.list">
          <span
            className="absolute bottom-3 left-[1.3rem] top-1 w-px bg-border"
            aria-hidden="true"
          />
          {entries.map((e, i) => (
            <li
              key={e.id}
              className="relative flex gap-3 py-1.5 pl-4 pr-4"
              data-ocid={`dashboard.timeline.item.${i + 1}`}
            >
              <span
                className={cn(
                  "relative z-10 mt-1.5 size-2 shrink-0 rounded-full ring-2 ring-sidebar",
                  TYPE_TONE[e.type],
                )}
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <p className="break-words text-xs leading-snug text-foreground">
                  {describe(t, e)}
                </p>
                <p className="readout mt-0.5 text-[10px] text-muted-foreground">
                  {t("timeline.cycleAt", { cycle: formatInt(e.cycle) })}
                  <span className="mx-1.5 text-border">/</span>
                  {t("inspector.generation")} {formatInt(e.generation)}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

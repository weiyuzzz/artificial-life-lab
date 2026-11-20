import { Button } from "@/components/ui/button";
import type { OrganismView } from "@/engine";
import { useI18n } from "@/i18n";
import { useSimStore } from "@/store/useSimStore";
import { Crosshair, Skull, X } from "lucide-react";
import { type ReactNode, useRef } from "react";
import { GeneProfile } from "./GeneProfile";
import { type LineageEntry, LineageList } from "./LineageList";
import { NeuralNetDiagram } from "./NeuralNetDiagram";
import { OrganismVitals } from "./OrganismVitals";

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="border-t border-border px-4 py-3">
      <h3 className="section-label mb-2">{label}</h3>
      {children}
    </section>
  );
}

export function InspectorPanel() {
  const { t } = useI18n();
  const selectedId = useSimStore((s) => s.selectedId);
  const live = useSimStore((s) => s.selectedOrganism);
  const latestStats = useSimStore((s) => s.latestStats);
  useSimStore((s) => s.cycle); // re-render lineage on each throttled sync
  const select = useSimStore((s) => s.select);
  const getEngine = useSimStore((s) => s.getEngine);

  // Keep the last observed state so a deceased organism stays inspectable.
  const lastSeen = useRef<OrganismView | null>(null);
  if (live) lastSeen.current = live;
  else if (lastSeen.current?.id !== selectedId) lastSeen.current = null;
  const organism = live ?? lastSeen.current;

  if (selectedId === null || !organism) {
    return (
      <section
        className="px-4 py-10 text-center"
        data-ocid="inspector.empty_state"
      >
        <div className="mx-auto flex size-12 items-center justify-center rounded-full border border-dashed border-border">
          <Crosshair className="size-5 text-muted-foreground" aria-hidden />
        </div>
        <h2 className="section-label mt-4">{t("tab.inspector")}</h2>
        <p className="mx-auto mt-2 max-w-60 text-sm text-muted-foreground">
          {selectedId === null ? t("inspector.empty") : t("inspector.dead")}
        </p>
      </section>
    );
  }

  const engine = getEngine();
  const isAlive = (id: number) => engine.getOrganism(id) !== undefined;
  const toEntries = (
    list: { record: LineageEntry["record"]; depth: number }[],
  ): LineageEntry[] =>
    list.map((e) => ({
      ...e,
      alive: e.record.deathCycle === null && isAlive(e.record.id),
    }));
  const ancestors = toEntries(engine.lineage.getAncestors(organism.id, 6));
  const descendants = toEntries(
    engine.lineage.getDescendants(organism.id, 4, 80),
  );
  const speciesStats = latestStats?.[organism.species];
  const speciesAverage =
    speciesStats && speciesStats.count > 0 ? speciesStats.genes : null;

  return (
    <div data-ocid="inspector.panel">
      <header className="flex items-center justify-between gap-2 px-4 py-3">
        <h2 className="section-label">
          {t("tab.inspector")}{" "}
          <span className="readout normal-case text-foreground">
            #{organism.id}
          </span>
        </h2>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 rounded-none px-2 font-mono text-[11px] uppercase tracking-wider"
          onClick={() => select(null)}
          data-ocid="inspector.close_button"
        >
          <X className="size-3.5" aria-hidden />
          {t("inspector.deselect")}
        </Button>
      </header>
      {!live && (
        <output
          className="flex items-center gap-2 border-y border-destructive/40 bg-destructive/10 px-4 py-2 text-xs text-destructive"
          data-ocid="inspector.dead.error_state"
        >
          <Skull className="size-3.5 shrink-0" aria-hidden />
          {t("inspector.dead")}
        </output>
      )}
      <div className="px-4 pb-3">
        <OrganismVitals organism={organism} />
      </div>
      <Section label={t("inspector.genes")}>
        <GeneProfile organism={organism} speciesAverage={speciesAverage} />
      </Section>
      <Section label={t("inspector.neuralNetwork")}>
        <NeuralNetDiagram organism={organism} />
      </Section>
      <section className="space-y-4 border-t border-border px-4 py-3">
        <LineageList
          title={t("inspector.ancestors")}
          entries={ancestors}
          direction="up"
          ocid="ancestors"
          onSelect={select}
        />
        <LineageList
          title={t("inspector.descendants")}
          entries={descendants}
          direction="down"
          ocid="descendants"
          onSelect={select}
        />
      </section>
    </div>
  );
}

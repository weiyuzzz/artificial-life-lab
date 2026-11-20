import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GENE_KEYS, type GeneKey, SPECIES, type StatsSample } from "@/engine";
import { useI18n } from "@/i18n";
import { useMemo, useState } from "react";
import {
  OverlayChart,
  type OverlaySeries,
  SERIES_COLORS,
} from "./OverlayChart";
import {
  type FieldPick,
  PLANT_FIELDS,
  POPULATION_FIELDS,
  geneFields,
  overlay,
} from "./compareData";

const RUNS = [
  { prefix: "a", tag: "A", dashed: false },
  { prefix: "b", tag: "B", dashed: true },
] as const;

export function CompareCharts({
  a,
  b,
}: {
  a: StatsSample[];
  b: StatsSample[];
}) {
  const { t } = useI18n();
  const [gene, setGene] = useState<GeneKey>("speed");

  const geneFieldPick = useMemo(() => geneFields(gene), [gene]);
  const population = useMemo(() => overlay(a, b, POPULATION_FIELDS), [a, b]);
  const plants = useMemo(() => overlay(a, b, PLANT_FIELDS), [a, b]);
  const genes = useMemo(
    () => overlay(a, b, geneFieldPick),
    [a, b, geneFieldPick],
  );

  const speciesSeries = (fields: FieldPick): OverlaySeries[] =>
    RUNS.flatMap((run) =>
      SPECIES.filter((sp) => sp in fields).map((sp) => ({
        dataKey: `${run.prefix}_${sp}`,
        label: `${run.tag} · ${t(`species.${sp}`)}`,
        color: SERIES_COLORS[sp],
        dashed: run.dashed,
      })),
    );

  const plantSeries: OverlaySeries[] = RUNS.map((run) => ({
    dataKey: `${run.prefix}_plants`,
    label: `${run.tag} · ${t("dashboard.plants")}`,
    color: SERIES_COLORS.plants,
    dashed: run.dashed,
  }));

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <OverlayChart
        title={t("dashboard.chart.population")}
        rows={population}
        series={speciesSeries(POPULATION_FIELDS)}
        ocid="compare.population.chart_point"
      />
      <OverlayChart
        title={t("dashboard.plants")}
        rows={plants}
        series={plantSeries}
        ocid="compare.plants.chart_point"
      />
      <div className="lg:col-span-2">
        <OverlayChart
          title={`${t("dashboard.chart.avgGenes")} · ${t(`gene.${gene}`)}`}
          rows={genes}
          series={speciesSeries(geneFieldPick)}
          ocid="compare.genes.chart_point"
          controls={
            <Select value={gene} onValueChange={(v) => setGene(v as GeneKey)}>
              <SelectTrigger
                className="h-8 w-44 text-xs"
                aria-label={t("inspector.genes")}
                data-ocid="compare.gene.select"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GENE_KEYS.map((g) => (
                  <SelectItem key={g} value={g}>
                    {t(`gene.${g}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        />
      </div>
    </div>
  );
}

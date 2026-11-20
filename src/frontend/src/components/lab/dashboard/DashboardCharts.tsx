import { GENE_KEYS, type GeneKey } from "@/engine";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { type SeriesDef, StatsLineChart } from "./StatsLineChart";
import { useChartHistory } from "./useChartHistory";

const POPULATION: SeriesDef[] = [
  {
    key: "herbivore",
    labelKey: "dashboard.herbivores",
    tone: 1,
    value: (s) => s.herbivore.count,
  },
  {
    key: "predator",
    labelKey: "dashboard.predators",
    tone: 2,
    value: (s) => s.predator.count,
  },
  {
    key: "plants",
    labelKey: "dashboard.plants",
    tone: 3,
    value: (s) => s.plants,
  },
];

const BIRTHS_DEATHS: SeriesDef[] = [
  {
    key: "births",
    labelKey: "dashboard.births",
    tone: 3,
    value: (s) => s.births,
  },
  {
    key: "deaths",
    labelKey: "dashboard.deaths",
    tone: 2,
    value: (s) => s.deaths,
  },
];

const LIFESPAN: SeriesDef[] = [
  {
    key: "herbivore",
    labelKey: "species.herbivore",
    tone: 1,
    value: (s) => s.herbivore.avgLifespan,
  },
  {
    key: "predator",
    labelKey: "species.predator",
    tone: 2,
    value: (s) => s.predator.avgLifespan,
  },
];

const ENERGY: SeriesDef[] = [
  {
    key: "energy",
    labelKey: "dashboard.totalEnergy",
    tone: 4,
    value: (s) => s.totalEnergy,
  },
];

function geneSeries(gene: GeneKey): SeriesDef[] {
  return [
    {
      key: "herbivore",
      labelKey: "species.herbivore",
      tone: 1,
      value: (s) =>
        s.herbivore.count > 0 ? s.herbivore.genes[gene] : Number.NaN,
    },
    {
      key: "predator",
      labelKey: "species.predator",
      tone: 2,
      value: (s) =>
        s.predator.count > 0 ? s.predator.genes[gene] : Number.NaN,
    },
  ];
}

/** Sampled time-series charts; data refreshes once per statistics sample. */
export function DashboardCharts() {
  const { t } = useI18n();
  const data = useChartHistory();
  const [gene, setGene] = useState<GeneKey>("speed");

  if (data.length < 2) {
    return (
      <p
        className="border-b border-border px-4 py-6 text-sm text-muted-foreground"
        data-ocid="dashboard.charts.empty_state"
      >
        {t("dashboard.chart.empty")}
      </p>
    );
  }

  const geneControls = (
    <fieldset
      className="mt-2 flex flex-wrap gap-1"
      aria-label={t("dashboard.chart.avgGenes")}
      data-ocid="dashboard.gene.select"
    >
      {GENE_KEYS.map((g) => {
        const active = g === gene;
        return (
          <button
            key={g}
            type="button"
            aria-pressed={active}
            onClick={() => setGene(g)}
            data-ocid={`dashboard.gene.${g}.toggle`}
            className={cn(
              "h-6 rounded-sm border px-2 font-mono text-[10px] uppercase tracking-wider transition-smooth focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
              active
                ? "border-primary/60 bg-primary/10 text-foreground"
                : "border-border text-muted-foreground hover:border-input hover:text-foreground",
            )}
          >
            {t(`gene.${g}` as const)}
          </button>
        );
      })}
    </fieldset>
  );

  return (
    <div data-ocid="dashboard.charts.section">
      <StatsLineChart
        titleKey="dashboard.chart.population"
        data={data}
        series={POPULATION}
        ocid="dashboard.population"
      />
      <StatsLineChart
        titleKey="dashboard.chart.birthsDeaths"
        data={data}
        series={BIRTHS_DEATHS}
        ocid="dashboard.births_deaths"
      />
      <StatsLineChart
        titleKey="dashboard.chart.avgGenes"
        data={data}
        series={geneSeries(gene)}
        ocid="dashboard.genes"
        digits={2}
        controls={geneControls}
      />
      <StatsLineChart
        titleKey="dashboard.chart.avgLifespan"
        data={data}
        series={LIFESPAN}
        ocid="dashboard.lifespan"
      />
      <StatsLineChart
        titleKey="dashboard.chart.energy"
        data={data}
        series={ENERGY}
        ocid="dashboard.energy"
      />
    </div>
  );
}

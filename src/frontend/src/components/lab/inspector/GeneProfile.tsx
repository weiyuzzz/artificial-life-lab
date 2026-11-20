import { type ChartConfig, ChartContainer } from "@/components/ui/chart";
import { GENE_KEYS, type Genes, type OrganismView } from "@/engine";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";
import { PolarAngleAxis, PolarGrid, Radar, RadarChart } from "recharts";
import { fmtGene, normGene } from "./format";

interface GeneProfileProps {
  organism: OrganismView;
  speciesAverage: Genes | null;
}

export function GeneProfile({ organism, speciesAverage }: GeneProfileProps) {
  const { t } = useI18n();
  const predator = organism.species === "predator";
  const config: ChartConfig = {
    organism: {
      label: `#${organism.id}`,
      color: predator
        ? "oklch(var(--species-predator))"
        : "oklch(var(--species-herbivore))",
    },
    average: {
      label: t("dashboard.chart.avgGenes"),
      color: "oklch(var(--muted-foreground))",
    },
  };
  const data = GENE_KEYS.map((key) => ({
    gene: t(`gene.${key}`),
    organism: normGene(key, organism.genes[key]),
    average: speciesAverage ? normGene(key, speciesAverage[key]) : 0,
  }));

  return (
    <div className="space-y-3">
      <ChartContainer
        config={config}
        className="mx-auto aspect-square h-56 w-full max-w-72"
        data-ocid="inspector.genes.chart_point"
      >
        <RadarChart data={data} outerRadius="72%">
          <PolarGrid className="stroke-border" />
          <PolarAngleAxis dataKey="gene" tick={{ fontSize: 9 }} />
          {speciesAverage && (
            <Radar
              dataKey="average"
              stroke="var(--color-average)"
              fill="var(--color-average)"
              fillOpacity={0.08}
              strokeDasharray="3 3"
              isAnimationActive={false}
            />
          )}
          <Radar
            dataKey="organism"
            stroke="var(--color-organism)"
            fill="var(--color-organism)"
            fillOpacity={0.22}
            isAnimationActive={false}
          />
        </RadarChart>
      </ChartContainer>
      <div className="flex items-center justify-center gap-4 font-mono text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span
            aria-hidden
            className={cn(
              "h-0.5 w-4",
              predator ? "bg-predator" : "bg-herbivore",
            )}
          />
          #{organism.id}
        </span>
        {speciesAverage && (
          <span className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="h-0.5 w-4 border-t border-dashed border-muted-foreground"
            />
            {t("dashboard.chart.avgGenes")} · {t(`species.${organism.species}`)}
          </span>
        )}
      </div>
      <ul
        className="divide-y divide-border/70 border-y border-border/70"
        data-ocid="inspector.genes.list"
      >
        {GENE_KEYS.map((key, i) => {
          const value = organism.genes[key];
          const avg = speciesAverage?.[key];
          return (
            <li
              key={key}
              className="py-1.5"
              data-ocid={`inspector.genes.item.${i + 1}`}
            >
              <div className="flex items-baseline justify-between gap-2 text-xs">
                <span className="text-muted-foreground">
                  {t(`gene.${key}`)}
                </span>
                <span className="readout text-foreground">
                  {fmtGene(key, value)}
                  {avg !== undefined && (
                    <span className="ml-2 text-muted-foreground">
                      μ {fmtGene(key, avg)}
                    </span>
                  )}
                </span>
              </div>
              <div className="relative mt-1 h-1 bg-muted">
                <div
                  className={cn(
                    "absolute inset-y-0 left-0 w-full origin-left",
                    predator ? "bg-predator" : "bg-herbivore",
                  )}
                  style={{ transform: `scaleX(${normGene(key, value)})` }}
                />
                {avg !== undefined && (
                  <div
                    aria-hidden
                    className="absolute -inset-y-0.5 w-px bg-foreground"
                    style={{ left: `${normGene(key, avg) * 100}%` }}
                  />
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

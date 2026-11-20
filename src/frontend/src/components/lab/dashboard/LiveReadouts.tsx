import { SPECIES } from "@/engine";
import { useI18n } from "@/i18n";
import type { TranslationKey } from "@/i18n";
import { cn } from "@/lib/utils";
import { useSimStore } from "@/store/useSimStore";
import { formatDecimal, formatInt } from "./format";

const SPECIES_DOT = { herbivore: "bg-herbivore", predator: "bg-predator" };

function Readout({
  labelKey,
  value,
  dotClass,
  ocid,
}: {
  labelKey: TranslationKey;
  value: string;
  dotClass?: string;
  ocid: string;
}) {
  const { t } = useI18n();
  return (
    <div className="min-w-0 px-4 py-3" data-ocid={ocid}>
      <div className="flex items-center gap-1.5">
        {dotClass ? (
          <span className={cn("size-1.5 rounded-full", dotClass)} />
        ) : null}
        <span className="section-label truncate">{t(labelKey)}</span>
      </div>
      <div className="readout mt-1 text-xl text-foreground">{value}</div>
    </div>
  );
}

/** Live numeric readouts from the most recent statistics sample. */
export function LiveReadouts() {
  const { t } = useI18n();
  const s = useSimStore((st) => st.latestStats);
  // Re-read on every UI sync so headline counts match the canvas exactly,
  // even between sampling intervals.
  useSimStore((st) => st.cycle);
  const engine = useSimStore.getState().getEngine();
  let liveHerbivores = 0;
  let livePredators = 0;
  for (const o of engine.organisms) {
    if (!o.alive) continue;
    if (o.species === "herbivore") liveHerbivores++;
    else livePredators++;
  }
  const livePlants = engine.plants.length;

  if (!s) {
    return (
      <p
        className="px-4 py-3 text-sm text-muted-foreground"
        data-ocid="dashboard.readouts.loading_state"
      >
        {t("dashboard.chart.empty")}
      </p>
    );
  }

  return (
    <div data-ocid="dashboard.readouts.section">
      <div className="grid grid-cols-3 divide-x divide-border border-b border-border">
        <Readout
          labelKey="dashboard.herbivores"
          value={formatInt(liveHerbivores)}
          dotClass="bg-herbivore"
          ocid="dashboard.herbivores.item"
        />
        <Readout
          labelKey="dashboard.predators"
          value={formatInt(livePredators)}
          dotClass="bg-predator"
          ocid="dashboard.predators.item"
        />
        <Readout
          labelKey="dashboard.plants"
          value={formatInt(livePlants)}
          dotClass="bg-plant"
          ocid="dashboard.plants.item"
        />
      </div>
      <div className="grid grid-cols-3 divide-x divide-border border-b border-border">
        <Readout
          labelKey="dashboard.births"
          value={formatInt(s.totalBirths)}
          ocid="dashboard.births.item"
        />
        <Readout
          labelKey="dashboard.deaths"
          value={formatInt(s.totalDeaths)}
          ocid="dashboard.deaths.item"
        />
        <Readout
          labelKey="dashboard.maxGeneration"
          value={formatInt(s.maxGeneration)}
          ocid="dashboard.generation.item"
        />
      </div>

      <table
        className="w-full border-b border-border text-xs"
        data-ocid="dashboard.averages.table"
      >
        <thead>
          <tr className="text-left">
            <th className="section-label px-4 py-2 font-medium">
              {t("dashboard.geneSpecies")}
            </th>
            <th className="section-label px-2 py-2 text-right font-medium">
              {t("inspector.age")}
            </th>
            <th className="section-label px-2 py-2 text-right font-medium">
              {t("inspector.energy")}
            </th>
            <th className="section-label px-4 py-2 text-right font-medium">
              {t("gene.reproduction")}
            </th>
          </tr>
        </thead>
        <tbody>
          {SPECIES.map((sp, i) => {
            const ss = s[sp];
            return (
              <tr
                key={sp}
                className="border-t border-border/60"
                data-ocid={`dashboard.averages.row.${i + 1}`}
              >
                <td className="px-4 py-2">
                  <span className="flex items-center gap-1.5 text-foreground">
                    <span
                      className={cn("size-1.5 rounded-full", SPECIES_DOT[sp])}
                    />
                    {t(`species.${sp}` as const)}
                  </span>
                </td>
                <td className="readout px-2 py-2 text-right text-foreground">
                  {formatDecimal(ss.avgAge, 0)}
                </td>
                <td className="readout px-2 py-2 text-right text-foreground">
                  {formatDecimal(ss.avgEnergy, 1)}
                </td>
                <td className="readout px-4 py-2 text-right text-foreground">
                  {formatDecimal(ss.avgReproductionRate, 3)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

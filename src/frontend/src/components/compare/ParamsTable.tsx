import type { Experiment } from "@/backend";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PARAM_META, type ParamKey, type StatsSample } from "@/engine";
import { type TranslationKey, useI18n } from "@/i18n";
import { cn } from "@/lib/utils";
import { last, parseJsonObject, peak } from "./compareData";

type Cell = number | string | null;
interface Row {
  id: string;
  label: string;
  mono?: boolean;
  a: Cell;
  b: Cell;
}

const PARAM_LABELS: Partial<Record<ParamKey, TranslationKey>> = {
  temperature: "env.temperature",
  plantGrowthRate: "env.plantGrowth",
  foodAmount: "env.plantEnergy",
  maxPlants: "env.maxPlants",
  mutationProbability: "env.mutationRate",
};
const SKIPPED: readonly ParamKey[] = [
  "seed",
  "initialHerbivores",
  "initialPredators",
  "initialPlants",
  "worldWidth",
  "worldHeight",
];

function cell(value: unknown): Cell {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value !== "") return value;
  return null;
}

function fmt(value: Cell) {
  if (value === null) return "—";
  if (typeof value === "string") return value;
  return Number.isInteger(value) ? value.toLocaleString() : value.toFixed(3);
}

function diff(a: Cell, b: Cell): { text: string; differs: boolean } {
  if (typeof a === "number" && typeof b === "number") {
    const d = b - a;
    if (Math.abs(d) < 1e-9) return { text: "=", differs: false };
    return { text: `${d > 0 ? "+" : "−"}${fmt(Math.abs(d))}`, differs: true };
  }
  return a === b ? { text: "=", differs: false } : { text: "≠", differs: true };
}

/** Summaries may be plain text or a JSON object; objects render as key: value lines. */
function summaryText(summary: string) {
  const obj = parseJsonObject(summary);
  if (!obj) return summary || "—";
  return Object.entries(obj)
    .filter(([, v]) => typeof v !== "object" || v === null)
    .map(([k, v]) => `${k}: ${String(v)}`)
    .join("\n");
}

function initial(
  pop: Record<string, unknown> | null,
  env: Record<string, unknown> | null,
  short: string,
  key: ParamKey,
) {
  return cell(pop?.[short] ?? pop?.[key] ?? env?.[key]);
}

export function ParamsTable({
  a,
  b,
  statsA,
  statsB,
}: {
  a: Experiment;
  b: Experiment;
  statsA: StatsSample[];
  statsB: StatsSample[];
}) {
  const { t } = useI18n();
  const envA = parseJsonObject(a.envParams);
  const envB = parseJsonObject(b.envParams);
  const popA = parseJsonObject(a.populationConfig);
  const popB = parseJsonObject(b.populationConfig);
  const worldSize = (env: Record<string, unknown> | null) =>
    env && typeof env.worldWidth === "number"
      ? `${env.worldWidth}×${env.worldHeight}`
      : null;

  const rows: Row[] = [
    {
      id: "seed",
      label: t("env.seed"),
      a: a.seed.toString(),
      b: b.seed.toString(),
    },
    ...(
      [
        ["herbivores", "initialHerbivores", "env.initialHerbivores"],
        ["predators", "initialPredators", "env.initialPredators"],
        ["plants", "initialPlants", "env.initialPlants"],
      ] as const
    ).map(([short, key, label]) => ({
      id: key,
      label: t(label),
      a: initial(popA, envA, short, key),
      b: initial(popB, envB, short, key),
    })),
    {
      id: "world",
      label: t("env.worldSize"),
      a: worldSize(envA),
      b: worldSize(envB),
    },
    ...PARAM_META.filter((m) => !SKIPPED.includes(m.key)).map((m) => {
      const labelKey = PARAM_LABELS[m.key];
      return {
        id: m.key,
        label: labelKey ? t(labelKey) : m.key,
        mono: !labelKey,
        a: cell(envA?.[m.key]),
        b: cell(envB?.[m.key]),
      };
    }),
    {
      id: "cycle",
      label: t("exp.cycle"),
      a: Number(a.cycle),
      b: Number(b.cycle),
    },
    {
      id: "finalHerb",
      label: `${t("dashboard.herbivores")} · ${t("compare.final")}`,
      a: last(statsA, (s) => s.herbivore.count),
      b: last(statsB, (s) => s.herbivore.count),
    },
    {
      id: "finalPred",
      label: `${t("dashboard.predators")} · ${t("compare.final")}`,
      a: last(statsA, (s) => s.predator.count),
      b: last(statsB, (s) => s.predator.count),
    },
    {
      id: "peakHerb",
      label: `${t("dashboard.herbivores")} · ${t("compare.peak")}`,
      a: peak(statsA, (s) => s.herbivore.count),
      b: peak(statsB, (s) => s.herbivore.count),
    },
    {
      id: "peakPred",
      label: `${t("dashboard.predators")} · ${t("compare.peak")}`,
      a: peak(statsA, (s) => s.predator.count),
      b: peak(statsB, (s) => s.predator.count),
    },
    {
      id: "maxGen",
      label: t("dashboard.maxGeneration"),
      a: last(statsA, (s) => s.maxGeneration),
      b: last(statsB, (s) => s.maxGeneration),
    },
  ];

  return (
    <section
      className="overflow-hidden rounded-lg border border-border bg-card"
      data-ocid="compare.params.table"
    >
      <Table>
        <TableHeader className="sticky top-0 bg-muted/60">
          <TableRow>
            <TableHead className="section-label">
              {t("compare.metric")}
            </TableHead>
            <TableHead className="text-right">
              <span className="text-foreground">A</span>{" "}
              <span className="font-normal text-muted-foreground">
                {a.name}
              </span>
            </TableHead>
            <TableHead className="text-right">
              <span className="text-foreground">B</span>{" "}
              <span className="font-normal text-muted-foreground">
                {b.name}
              </span>
            </TableHead>
            <TableHead className="text-right">
              {t("compare.difference")}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, i) => {
            const d = diff(row.a, row.b);
            return (
              <TableRow
                key={row.id}
                className={cn(d.differs && "bg-primary/5")}
                data-ocid={`compare.params.row.${i + 1}`}
              >
                <TableCell
                  className={cn(
                    "text-sm",
                    row.mono && "font-mono text-xs text-muted-foreground",
                  )}
                >
                  {d.differs && (
                    <span
                      aria-hidden="true"
                      className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-warning align-middle"
                    />
                  )}
                  {row.label}
                </TableCell>
                <TableCell className="readout text-right">
                  {fmt(row.a)}
                </TableCell>
                <TableCell className="readout text-right">
                  {fmt(row.b)}
                </TableCell>
                <TableCell
                  className={cn(
                    "readout text-right",
                    d.differs
                      ? "font-medium text-warning"
                      : "text-muted-foreground",
                  )}
                >
                  {d.text}
                </TableCell>
              </TableRow>
            );
          })}
          <TableRow data-ocid="compare.params.summary_row">
            <TableCell className="align-top text-sm">
              {t("compare.summary")}
            </TableCell>
            <TableCell className="max-w-xs whitespace-pre-wrap break-words text-right align-top text-xs text-muted-foreground">
              {summaryText(a.summary)}
            </TableCell>
            <TableCell className="max-w-xs whitespace-pre-wrap break-words text-right align-top text-xs text-muted-foreground">
              {summaryText(b.summary)}
            </TableCell>
            <TableCell
              className={cn(
                "readout text-right align-top",
                a.summary !== b.summary
                  ? "text-warning"
                  : "text-muted-foreground",
              )}
            >
              {a.summary !== b.summary ? "≠" : "="}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </section>
  );
}

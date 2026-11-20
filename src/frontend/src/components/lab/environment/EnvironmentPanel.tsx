import { Button } from "@/components/ui/button";
import {
  DEFAULT_PARAMS,
  type EdgeMode,
  type NumericParamKey,
  type ParamKey,
  type SimParams,
  getParamMeta,
} from "@/engine";
import { useI18n } from "@/i18n";
import type { TranslateFn } from "@/i18n";
import { cn } from "@/lib/utils";
import { useSimStore } from "@/store/useSimStore";
import {
  ArrowLeftRight,
  CornerDownLeft,
  RotateCcw,
  Shuffle,
  Undo2,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { EventControls } from "./EventControls";
import { NumberField, ParamControl, ResetBadge } from "./ParamControl";

const label = (t: TranslateFn, key: NumericParamKey): string => {
  switch (key) {
    case "temperature":
      return `${t("env.temperature")} °C`;
    case "plantGrowthRate":
      return t("env.plantGrowth");
    case "foodAmount":
      return t("env.plantEnergy");
    case "resourceRegenRate":
      return `${t("dashboard.totalEnergy")} ↻`;
    case "initialHerbivores":
      return t("env.initialHerbivores");
    case "initialPredators":
      return t("env.initialPredators");
    case "initialPlants":
      return t("env.initialPlants");
    case "mutationProbability":
      return t("env.mutationRate");
    case "reproductionEnergy":
      return `${t("gene.reproduction")} · ${t("inspector.energy")}`;
    case "basalMetabolism":
      return t("gene.metabolism");
    case "worldWidth":
      return `${t("env.worldSize")} · W`;
    case "worldHeight":
      return `${t("env.worldSize")} · H`;
    default:
      return t("env.seed");
  }
};

const GROUPS: readonly (readonly NumericParamKey[])[] = [
  ["temperature", "plantGrowthRate", "foodAmount", "resourceRegenRate"],
  ["mutationProbability", "reproductionEnergy", "basalMetabolism"],
  ["initialHerbivores", "initialPredators", "initialPlants"],
  ["worldWidth", "worldHeight"],
];

const PANEL_KEYS: readonly ParamKey[] = [...GROUPS.flat(), "edgeMode", "seed"];

const EDGE_OPTIONS: { mode: EdgeMode; icon: typeof ArrowLeftRight }[] = [
  { mode: "bounce", icon: CornerDownLeft },
  { mode: "wrap", icon: ArrowLeftRight },
];

export function EnvironmentPanel() {
  const { t } = useI18n();
  const reduce = useReducedMotion();
  const params = useSimStore((s) => s.params);
  const pendingReset = useSimStore((s) => s.pendingReset);
  const setParam = useSimStore((s) => s.setParam);
  const reset = useSimStore((s) => s.reset);
  const getEngine = useSimStore((s) => s.getEngine);
  const applied = getEngine().params;

  const pendingKeys = PANEL_KEYS.filter(
    (k) => getParamMeta(k).requiresReset && params[k] !== applied[k],
  );
  const isPending = (k: ParamKey) => pendingKeys.includes(k);
  const showApply = pendingReset && pendingKeys.length > 0;

  const applyReset = () => {
    const next: Partial<SimParams> = {};
    for (const k of pendingKeys) {
      if (k !== "edgeMode") next[k] = params[k];
    }
    reset({ params: next, seed: params.seed });
  };

  const restoreDefaults = () => {
    for (const k of PANEL_KEYS) {
      if (params[k] !== DEFAULT_PARAMS[k]) setParam(k, DEFAULT_PARAMS[k]);
    }
  };

  const seedMeta = getParamMeta("seed");

  return (
    <div className="pb-6" data-ocid="env.panel">
      <section className="px-4 pt-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="section-label">{t("env.title")}</h2>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={restoreDefaults}
            data-ocid="env.restore_defaults_button"
            className="h-7 gap-1.5 rounded-sm px-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground transition-smooth hover:text-foreground"
          >
            <Undo2 className="h-3 w-3" aria-hidden />
            {t("env.restoreDefaults")}
          </Button>
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground">
          {t("env.resetRequiredHint")}
        </p>
      </section>

      <AnimatePresence initial={false}>
        {showApply && (
          <motion.div
            key="apply"
            initial={reduce ? false : { opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="sticky top-0 z-10 mx-4 mt-3 border border-warning/50 bg-background/95 p-3 backdrop-blur"
            data-ocid="env.pending.panel"
          >
            <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-warning">
              <RotateCcw className="h-3 w-3" aria-hidden />
              {t("env.resetRequired")} ·{" "}
              <span className="readout">{pendingKeys.length}</span>
            </p>
            <ul className="mt-1.5 space-y-0.5 text-xs text-muted-foreground">
              {pendingKeys.map((k) => (
                <li key={k} className="flex justify-between gap-2">
                  <span className="truncate">
                    {k === "edgeMode" ? k : label(t, k)}
                  </span>
                  <span className="readout shrink-0">
                    {String(applied[k])} →{" "}
                    <span className="text-warning">{String(params[k])}</span>
                  </span>
                </li>
              ))}
            </ul>
            <Button
              type="button"
              size="sm"
              onClick={applyReset}
              data-ocid="env.apply_reset_button"
              className="mt-2.5 h-8 w-full gap-1.5 rounded-sm font-mono text-[11px] uppercase tracking-wider transition-smooth active:scale-[0.98]"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden />
              {t("env.applyReset")}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {GROUPS.map((group) => (
        <section
          key={group.join("-")}
          className="mt-3 border-t border-border px-4 pt-1"
        >
          {group.map((k) => (
            <ParamControl
              key={k}
              meta={getParamMeta(k)}
              label={label(t, k)}
              value={params[k]}
              pending={isPending(k)}
              onChange={(v) => setParam(k, v)}
            />
          ))}
        </section>
      ))}

      <section className="border-t border-border px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div
            className="flex rounded-sm border border-input p-0.5"
            data-ocid="env.edge_mode.toggle"
          >
            {EDGE_OPTIONS.map(({ mode, icon: Icon }) => {
              const active = params.edgeMode === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setParam("edgeMode", mode)}
                  data-ocid={`env.edge_mode.${mode}.button`}
                  className={cn(
                    "inline-flex h-7 items-center gap-1.5 rounded-sm px-2.5 font-mono text-[10px] uppercase tracking-wider transition-smooth focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                    active
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="h-3 w-3" aria-hidden />
                  {mode}
                </button>
              );
            })}
          </div>
          <ResetBadge requiresReset={false} pending={false} />
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <label htmlFor="param-seed" className="text-[13px] text-foreground">
            {t("env.seed")}
          </label>
          <div className="flex items-center gap-1.5">
            <NumberField
              id="param-seed"
              value={params.seed}
              min={seedMeta.min}
              max={seedMeta.max}
              step={seedMeta.step}
              ariaLabel={t("env.seed")}
              ocid="env.seed.input"
              onCommit={(v) => setParam("seed", v)}
              className={cn(
                "w-28",
                isPending("seed") && "border-warning/60 text-warning",
              )}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label={t("env.randomSeed")}
              title={t("env.randomSeed")}
              onClick={() =>
                setParam("seed", Math.floor(Math.random() * 4294967296))
              }
              data-ocid="env.random_seed_button"
              className="h-7 w-7 rounded-sm transition-smooth hover:text-primary active:scale-95"
            >
              <Shuffle className="h-3.5 w-3.5" aria-hidden />
            </Button>
            <ResetBadge
              requiresReset={seedMeta.requiresReset}
              pending={isPending("seed")}
            />
          </div>
        </div>
      </section>

      <EventControls />
    </div>
  );
}

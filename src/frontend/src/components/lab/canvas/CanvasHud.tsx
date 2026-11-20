import { BEHAVIOR_KEYS, type BehaviorKey } from "@/engine";
import { useI18n } from "@/i18n";
import type { TranslationKey } from "@/i18n";
import { useSimStore } from "@/store/useSimStore";
import { Maximize2, Minus, Plus } from "lucide-react";

interface CanvasHudProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
}

const COUNTS: {
  key: "herbivore" | "predator" | "plant";
  labelKey: TranslationKey;
  tone: string;
}[] = [
  { key: "plant", labelKey: "dashboard.plants", tone: "text-plant" },
  {
    key: "herbivore",
    labelKey: "dashboard.herbivores",
    tone: "text-herbivore",
  },
  { key: "predator", labelKey: "dashboard.predators", tone: "text-predator" },
];

const SWATCH: Record<BehaviorKey, string> = {
  explore: "bg-muted-foreground",
  searchFood: "bg-plant",
  chase: "bg-predator",
  escape: "bg-warning",
  eat: "bg-success",
  reproduce: "bg-[oklch(var(--chart-5))]",
  rest: "bg-[oklch(var(--chart-4))]",
};

const zoomBtn =
  "flex size-9 items-center justify-center text-muted-foreground transition-smooth hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring";

/** Docked instrument readouts over the canvas: cycle + live counts, zoom controls, behavior legend. */
export function CanvasHud({ onZoomIn, onZoomOut, onFit }: CanvasHudProps) {
  const { t } = useI18n();
  const cycle = useSimStore((s) => s.cycle);
  const running = useSimStore((s) => s.running);
  const showBehavior = useSimStore((s) => s.overlays.behavior);
  const zoom = useSimStore((s) => s.camera.zoom);
  const engine = useSimStore.getState().getEngine();

  const counts = { herbivore: 0, predator: 0, plant: 0 };
  for (const o of engine.organisms) if (o.alive) counts[o.species]++;
  for (const p of engine.plants) if (p.amount > 0.05) counts.plant++;

  return (
    <>
      <div
        className="instrument-glass pointer-events-none absolute left-3 top-3 z-10 rounded-sm px-3 py-2"
        data-ocid="lab.canvas.readout.panel"
      >
        <div className="flex items-center gap-2">
          <span className="section-label">{t("time.cycle")}</span>
          <span
            id="sim-cycle"
            className="readout text-sm text-foreground"
            data-ocid="lab.canvas.cycle"
          >
            {cycle.toLocaleString()}
          </span>
          <span
            className={`ml-1 size-1.5 rounded-full ${running ? "bg-success animate-pulse" : "bg-warning"}`}
            aria-hidden="true"
          />
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            {t(running ? "time.running" : "time.paused")}
          </span>
        </div>
        <dl className="mt-1.5 flex gap-4">
          {COUNTS.map(({ key, labelKey, tone }) => (
            <div key={key} className="min-w-0">
              <dt className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                {t(labelKey)}
              </dt>
              <dd
                className={`readout text-base leading-tight ${tone}`}
                data-ocid={`lab.canvas.count_${key}`}
              >
                {counts[key].toLocaleString()}
              </dd>
            </div>
          ))}
        </dl>
        {showBehavior && (
          <ul
            className="mt-2 hidden flex-wrap gap-x-3 gap-y-1 border-t border-border pt-2 sm:flex sm:max-w-[260px]"
            data-ocid="lab.canvas.behavior_legend"
          >
            {BEHAVIOR_KEYS.map((key) => (
              <li
                key={key}
                className="flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground"
              >
                <span
                  className={`size-2 rounded-[1px] ${SWATCH[key]}`}
                  aria-hidden="true"
                />
                {t(`behavior.${key}`)}
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="pointer-events-none absolute left-1/2 top-3 z-10 hidden -translate-x-1/2 whitespace-nowrap font-mono text-[11px] text-muted-foreground xl:block">
        {t("canvas.hint")}
      </p>

      <div className="instrument-glass absolute right-3 top-3 z-10 flex flex-col divide-y divide-border rounded-sm">
        <button
          type="button"
          id="canvas-zoom-in"
          className={zoomBtn}
          aria-label={t("canvas.zoomIn")}
          title={t("canvas.zoomIn")}
          onClick={onZoomIn}
          data-ocid="lab.canvas.zoom_in_button"
        >
          <Plus className="size-4" />
        </button>
        <button
          type="button"
          id="canvas-zoom-out"
          className={zoomBtn}
          aria-label={t("canvas.zoomOut")}
          title={t("canvas.zoomOut")}
          onClick={onZoomOut}
          data-ocid="lab.canvas.zoom_out_button"
        >
          <Minus className="size-4" />
        </button>
        <button
          type="button"
          id="canvas-fit"
          className={zoomBtn}
          aria-label={t("canvas.fit")}
          title={t("canvas.fit")}
          onClick={onFit}
          data-ocid="lab.canvas.fit_button"
        >
          <Maximize2 className="size-3.5" />
        </button>
        <span className="readout py-1 text-center text-[10px] text-muted-foreground">
          {zoom.toFixed(1)}×
        </span>
      </div>
    </>
  );
}

import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  type ActiveEvent,
  EVENT_DEFINITIONS,
  EVENT_KEYS,
  type EventKey,
} from "@/engine";
import { useI18n } from "@/i18n";
import type { TranslationKey } from "@/i18n";
import { cn } from "@/lib/utils";
import { useSimStore } from "@/store/useSimStore";
import {
  Bug,
  CloudSun,
  Dna,
  Gauge,
  type LucideIcon,
  Sprout,
  SunDim,
  Timer,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { formatValue } from "./ParamControl";

interface EventUi {
  icon: LucideIcon;
  labelKey: TranslationKey;
  descKey: TranslationKey;
  step: number;
  format: (m: number) => string;
  tone: string;
}

const EVENT_UI: Record<EventKey, EventUi> = {
  drought: {
    icon: SunDim,
    labelKey: "event.drought",
    descKey: "event.drought.desc",
    step: 0.05,
    format: (m) => `×${formatValue(m, 0.05)}`,
    tone: "text-warning",
  },
  foodAbundance: {
    icon: Sprout,
    labelKey: "event.foodAbundance",
    descKey: "event.foodAbundance.desc",
    step: 0.1,
    format: (m) => `×${formatValue(m, 0.1)}`,
    tone: "text-plant",
  },
  predatorIntroduction: {
    icon: Bug,
    labelKey: "event.predatorIntroduction",
    descKey: "event.predatorIntroduction.desc",
    step: 1,
    format: (m) => `+${Math.round(m)}`,
    tone: "text-predator",
  },
  temperatureChange: {
    icon: CloudSun,
    labelKey: "event.temperatureChange",
    descKey: "event.temperatureChange.desc",
    step: 0.5,
    format: (m) => `${m > 0 ? "+" : ""}${formatValue(m, 0.5)}°C`,
    tone: "text-accent",
  },
  mutationBoost: {
    icon: Dna,
    labelKey: "event.mutationBoost",
    descKey: "event.mutationBoost.desc",
    step: 0.5,
    format: (m) => `×${formatValue(m, 0.5)}`,
    tone: "text-primary",
  },
};

const DURATION_MIN = 50;
const DURATION_MAX = 3000;
const DURATION_STEP = 50;

function EventRow({ eventKey, index }: { eventKey: EventKey; index: number }) {
  const { t } = useI18n();
  const triggerEvent = useSimStore((s) => s.triggerEvent);
  const def = EVENT_DEFINITIONS[eventKey];
  const ui = EVENT_UI[eventKey];
  const Icon = ui.icon;
  const [magnitude, setMagnitude] = useState(def.defaultMagnitude);
  const [duration, setDuration] = useState(def.defaultDuration);
  const label = t(ui.labelKey);

  const fire = () => {
    triggerEvent(eventKey, { magnitude, duration });
    toast(t("timeline.event", { event: label }), {
      description: `${ui.format(magnitude)} · ${t("inspector.cycles", { value: duration })}`,
      duration: 4000,
    });
  };

  return (
    <li
      className="border-t border-border py-3 first:border-t-0"
      data-ocid={`env.event.item.${index + 1}`}
    >
      <div className="flex items-start gap-3">
        <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", ui.tone)} aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium text-foreground">{label}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t(ui.descKey)}
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={fire}
          data-ocid={`env.event.trigger_button.${index + 1}`}
          className="h-7 shrink-0 rounded-sm px-2.5 font-mono text-[10px] uppercase tracking-wider transition-smooth hover:border-primary hover:text-primary active:scale-95"
        >
          {t("env.trigger")}
        </Button>
      </div>
      <div className="mt-3 grid grid-cols-[16px_1fr_64px] items-center gap-x-2 gap-y-2.5 pl-7">
        <Gauge className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
        <Slider
          value={[magnitude]}
          min={def.minMagnitude}
          max={def.maxMagnitude}
          step={ui.step}
          aria-label={`${label} ${ui.format(magnitude)}`}
          data-ocid={`env.event.magnitude.${index + 1}`}
          onValueChange={(v) => setMagnitude(v[0] ?? def.defaultMagnitude)}
        />
        <span className={cn("readout text-right text-xs", ui.tone)}>
          {ui.format(magnitude)}
        </span>
        <Timer className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
        <Slider
          value={[duration]}
          min={DURATION_MIN}
          max={DURATION_MAX}
          step={DURATION_STEP}
          aria-label={`${label} ${t("inspector.cycles", { value: duration })}`}
          data-ocid={`env.event.duration.${index + 1}`}
          onValueChange={(v) => setDuration(v[0] ?? def.defaultDuration)}
        />
        <span className="readout text-right text-xs text-muted-foreground">
          {duration}c
        </span>
      </div>
    </li>
  );
}

function ActiveEventItem({
  event,
  index,
}: { event: ActiveEvent; index: number }) {
  const { t } = useI18n();
  const ui = EVENT_UI[event.key];
  const Icon = ui.icon;
  const ratio = event.duration > 0 ? event.remaining / event.duration : 0;
  return (
    <div className="py-2" data-ocid={`env.active_event.item.${index + 1}`}>
      <div className="flex items-center gap-2 text-xs">
        <Icon className={cn("h-3.5 w-3.5 shrink-0", ui.tone)} aria-hidden />
        <span className="min-w-0 flex-1 truncate text-foreground">
          {t(ui.labelKey)}
          <span className={cn("readout ml-2", ui.tone)}>
            {ui.format(event.magnitude)}
          </span>
        </span>
        <span className="readout shrink-0 text-muted-foreground">
          {t("env.remaining", { cycles: event.remaining })}
        </span>
      </div>
      <div className="mt-1.5 h-0.5 overflow-hidden bg-border">
        <div
          className="h-full origin-left bg-primary transition-transform duration-300 ease-out"
          style={{ transform: `scaleX(${ratio})` }}
        />
      </div>
    </div>
  );
}

export function EventControls() {
  const { t } = useI18n();
  const activeEvents = useSimStore((s) => s.activeEvents);
  const reduce = useReducedMotion();

  return (
    <section
      className="border-t border-border px-4 py-4"
      data-ocid="env.events.section"
    >
      <h3 className="section-label">{t("env.events")}</h3>
      <p className="mt-1.5 text-xs text-muted-foreground">
        {t("env.eventsHint")}
      </p>

      <div className="mt-3" data-ocid="env.active_events.list">
        <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              activeEvents.length > 0
                ? "animate-pulse bg-warning"
                : "bg-border",
            )}
            aria-hidden
          />
          {t("env.active")} ·{" "}
          <span className="readout">{activeEvents.length}</span>
        </p>
        <AnimatePresence initial={false}>
          {activeEvents.map((e, i) => (
            <motion.div
              key={e.id}
              initial={reduce ? false : { opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }}
              transition={{ duration: 0.25 }}
            >
              <ActiveEventItem event={e} index={i} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <ul className="mt-3 border-t border-border">
        {EVENT_KEYS.map((key, i) => (
          <EventRow key={key} eventKey={key} index={i} />
        ))}
      </ul>
    </section>
  );
}

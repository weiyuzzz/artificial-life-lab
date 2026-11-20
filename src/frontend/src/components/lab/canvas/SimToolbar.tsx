import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { SPEED_OPTIONS } from "@/engine";
import { useI18n } from "@/i18n";
import type { TranslationKey } from "@/i18n";
import { cn } from "@/lib/utils";
import { type OverlayKey, useSimStore } from "@/store/useSimStore";
import {
  FastForward,
  Layers,
  Pause,
  Play,
  RotateCcw,
  SkipForward,
  X,
} from "lucide-react";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";

const OVERLAYS: { key: OverlayKey; labelKey: TranslationKey }[] = [
  { key: "trails", labelKey: "overlay.trails" },
  { key: "vision", labelKey: "overlay.vision" },
  { key: "behavior", labelKey: "inspector.behavior" },
];

const tool =
  "flex h-9 items-center gap-1.5 rounded-sm px-2.5 font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground transition-smooth hover:bg-accent hover:text-foreground active:scale-[0.97] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40";
const divider = "mx-1 h-5 w-px shrink-0 bg-border";

/** Floating time-control console docked at the bottom of the canvas. */
export function SimToolbar() {
  const { t } = useI18n();
  const running = useSimStore((s) => s.running);
  const speed = useSimStore((s) => s.speed);
  const overlays = useSimStore((s) => s.overlays);
  const ff = useSimStore((s) => s.fastForward);
  const { toggleRunning, step, setSpeed, reset, toggleOverlay } =
    useSimStore.getState();
  const [cycles, setCycles] = useState("1000");
  const [ffOpen, setFfOpen] = useState(false);
  const busy = ff !== null;
  const n = Math.floor(Number(cycles));
  const validCycles = Number.isFinite(n) && n >= 1 && n <= 100000;

  const runFastForward = async (e: FormEvent) => {
    e.preventDefault();
    if (!validCycles) return;
    setFfOpen(false);
    const done = await useSimStore.getState().fastForwardBy(n);
    if (done) toast.success(t("time.fastForwardDone", { total: n }));
  };

  return (
    <div className="pointer-events-none absolute inset-x-2 bottom-2 z-20 flex flex-col items-center gap-2 sm:bottom-4">
      {ff && (
        <div
          className="instrument-glass pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-sm px-3 py-2 animate-fade-in"
          data-ocid="lab.toolbar.fast_forward.loading_state"
        >
          <div className="min-w-0 flex-1">
            <p className="readout truncate text-[11px] text-foreground">
              {t("time.fastForwardProgress", {
                done: ff.done.toLocaleString(),
                total: ff.total.toLocaleString(),
              })}
            </p>
            <Progress
              value={ff.total > 0 ? (ff.done / ff.total) * 100 : 0}
              className="mt-1.5 h-1"
              id="sim-ff-progress"
            />
          </div>
          <button
            type="button"
            id="sim-ff-cancel"
            className={cn(tool, "text-destructive hover:text-destructive")}
            onClick={() => useSimStore.getState().cancelFastForward()}
            data-ocid="lab.toolbar.fast_forward.cancel_button"
          >
            <X className="size-3.5" />
            {t("time.fastForwardCancel")}
          </button>
        </div>
      )}

      <div
        role="toolbar"
        aria-label={t("time.speed")}
        className="instrument-glass pointer-events-auto flex max-w-full flex-wrap items-center justify-center gap-0.5 rounded-sm p-1 shadow-lg"
        data-ocid="lab.toolbar.panel"
      >
        <button
          type="button"
          id="sim-toggle-run"
          className={cn(tool, "text-foreground")}
          onClick={toggleRunning}
          disabled={busy}
          data-ocid={
            running ? "lab.toolbar.pause_button" : "lab.toolbar.resume_button"
          }
        >
          {running ? (
            <Pause className="size-3.5" />
          ) : (
            <Play className="size-3.5" />
          )}
          {t(running ? "time.pause" : "time.resume")}
        </button>
        <button
          type="button"
          id="sim-step"
          className={tool}
          onClick={step}
          disabled={busy}
          data-ocid="lab.toolbar.step_button"
        >
          <SkipForward className="size-3.5" />
          {t("time.step")}
        </button>
        <span className={divider} />
        <fieldset
          className="flex items-center gap-0.5"
          aria-label={t("time.speed")}
          data-ocid="lab.toolbar.speed.tab"
        >
          {SPEED_OPTIONS.map((opt) => {
            const active = speed === opt;
            return (
              <button
                key={opt}
                type="button"
                id={`sim-speed-${opt}`}
                aria-pressed={active}
                className={cn(
                  tool,
                  "px-2",
                  active &&
                    "bg-primary/10 text-primary ring-1 ring-inset ring-primary/60 hover:bg-primary/15 hover:text-primary",
                )}
                onClick={() => setSpeed(opt)}
                disabled={busy}
                data-ocid={`lab.toolbar.speed_${opt}.toggle`}
              >
                {t("time.speedValue", { speed: opt })}
              </button>
            );
          })}
        </fieldset>
        <span className={divider} />

        <Popover open={ffOpen} onOpenChange={setFfOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              id="sim-ff-open"
              className={tool}
              disabled={busy}
              data-ocid="lab.toolbar.fast_forward.open_modal_button"
            >
              <FastForward className="size-3.5" />
              {t("time.fastForward")}
            </button>
          </PopoverTrigger>
          <PopoverContent
            side="top"
            className="instrument-glass w-64 rounded-sm p-3"
            data-ocid="lab.toolbar.fast_forward.popover"
          >
            <form onSubmit={runFastForward} className="space-y-2">
              <Label htmlFor="sim-ff-cycles" className="section-label">
                {t("time.fastForwardCycles")}
              </Label>
              <div className="flex gap-2">
                <Input
                  id="sim-ff-cycles"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={100000}
                  step={100}
                  value={cycles}
                  onChange={(e) => setCycles(e.target.value)}
                  className="readout h-9 rounded-sm"
                  data-ocid="lab.toolbar.fast_forward.input"
                />
                <button
                  type="submit"
                  id="sim-ff-run"
                  disabled={!validCycles}
                  className="h-9 shrink-0 rounded-sm bg-primary px-3 font-mono text-[11px] uppercase tracking-[0.1em] text-primary-foreground transition-smooth hover:bg-primary/90 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-40"
                  data-ocid="lab.toolbar.fast_forward.submit_button"
                >
                  {t("time.fastForwardStart")}
                </button>
              </div>
            </form>
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              id="sim-overlays-open"
              className={tool}
              data-ocid="lab.toolbar.overlays.open_modal_button"
            >
              <Layers className="size-3.5" />
              {t("canvas.overlays")}
            </button>
          </PopoverTrigger>
          <PopoverContent
            side="top"
            className="instrument-glass w-56 rounded-sm p-3"
            data-ocid="lab.toolbar.overlays.popover"
          >
            <p className="section-label mb-2">{t("canvas.overlays")}</p>
            <div className="space-y-2.5">
              {OVERLAYS.map(({ key, labelKey }) => (
                <div
                  key={key}
                  className="flex items-center justify-between gap-3"
                >
                  <Label
                    htmlFor={`overlay-${key}`}
                    className="font-mono text-xs text-foreground"
                  >
                    {t(labelKey)}
                  </Label>
                  <Switch
                    id={`overlay-${key}`}
                    checked={overlays[key]}
                    onCheckedChange={() => toggleOverlay(key)}
                    data-ocid={`lab.toolbar.overlay_${key}.switch`}
                  />
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              type="button"
              id="sim-reset"
              className={tool}
              disabled={busy}
              data-ocid="lab.toolbar.reset.open_modal_button"
            >
              <RotateCcw className="size-3.5" />
              {t("time.reset")}
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent
            className="rounded-sm"
            data-ocid="lab.toolbar.reset.dialog"
          >
            <AlertDialogHeader>
              <AlertDialogTitle className="font-display">
                {t("time.reset")}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {t("time.resetConfirm")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                className="rounded-sm"
                data-ocid="lab.toolbar.reset.cancel_button"
              >
                {t("exp.cancel")}
              </AlertDialogCancel>
              <AlertDialogAction
                id="sim-reset-confirm"
                className="rounded-sm"
                onClick={() => reset()}
                data-ocid="lab.toolbar.reset.confirm_button"
              >
                {t("exp.confirm")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

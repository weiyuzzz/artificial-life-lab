import { useI18n } from "@/i18n";
import { useSimStore } from "@/store/useSimStore";

interface HoverTooltipProps {
  x: number;
  y: number;
  width: number;
}

/** Cursor-anchored readout for the hovered organism; refreshes with each UI sync. */
export function HoverTooltip({ x, y, width }: HoverTooltipProps) {
  const { t } = useI18n();
  const hoveredId = useSimStore((s) => s.hoveredId);
  useSimStore((s) => s.cycle);
  const org =
    hoveredId === null
      ? null
      : useSimStore.getState().getEngine().getOrganism(hoveredId);
  if (!org?.alive) return null;

  const flip = x > width - 200;
  const rows: [string, string][] = [
    [t("inspector.id"), `#${org.id}`],
    [
      t("inspector.energy"),
      `${Math.round(org.energy)} / ${Math.round(org.maxEnergy)}`,
    ],
    [t("inspector.behavior"), t(`behavior.${org.behavior}`)],
  ];

  return (
    <div
      className="instrument-glass pointer-events-none absolute z-20 min-w-[168px] rounded-sm px-3 py-2 shadow-lg animate-fade-in"
      style={{
        left: flip ? x - 14 : x + 14,
        top: y + 14,
        transform: flip ? "translateX(-100%)" : undefined,
      }}
      data-ocid="lab.canvas.tooltip"
    >
      <p
        className={`font-mono text-[11px] uppercase tracking-[0.12em] ${
          org.species === "predator" ? "text-predator" : "text-herbivore"
        }`}
      >
        {t(`species.${org.species}`)}
      </p>
      <dl className="mt-1.5 space-y-0.5">
        {rows.map(([label, value]) => (
          <div
            key={label}
            className="flex items-baseline justify-between gap-4"
          >
            <dt className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              {label}
            </dt>
            <dd className="readout text-xs text-foreground">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

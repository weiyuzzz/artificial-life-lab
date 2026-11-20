import type { LineageRecord } from "@/engine";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";
import { Skull } from "lucide-react";

export interface LineageEntry {
  record: LineageRecord;
  depth: number;
  alive: boolean;
}

interface LineageListProps {
  title: string;
  entries: LineageEntry[];
  direction: "up" | "down";
  ocid: string;
  onSelect: (id: number) => void;
}

export function LineageList({
  title,
  entries,
  direction,
  ocid,
  onSelect,
}: LineageListProps) {
  const { t } = useI18n();
  return (
    <div data-ocid={`inspector.${ocid}.list`}>
      <div className="flex items-baseline justify-between">
        <h4 className="section-label">{title}</h4>
        <span className="readout text-[10px] text-muted-foreground">
          {entries.length}
        </span>
      </div>
      {entries.length === 0 ? (
        <p
          className="mt-1.5 text-xs text-muted-foreground"
          data-ocid={`inspector.${ocid}.empty_state`}
        >
          {t("inspector.none")}
        </p>
      ) : (
        <ul className="mt-1.5 max-h-44 divide-y divide-border/60 overflow-y-auto border-y border-border/60">
          {entries.map(({ record, depth, alive }, i) => {
            const content = (
              <>
                <span className="readout w-7 shrink-0 text-muted-foreground">
                  {direction === "up" ? "−" : "+"}
                  {depth}
                </span>
                <span
                  aria-hidden
                  className={cn(
                    "size-1.5 shrink-0 rounded-full",
                    record.species === "predator"
                      ? "bg-predator"
                      : "bg-herbivore",
                    !alive && "opacity-40",
                  )}
                />
                <span
                  className={cn(
                    "readout min-w-0 flex-1 truncate",
                    !alive && "line-through",
                  )}
                >
                  #{record.id}
                  <span className="ml-1.5 text-muted-foreground">
                    {t(`species.${record.species}`)}
                  </span>
                </span>
                <span className="readout text-muted-foreground">
                  G{record.generation}
                </span>
                {!alive && (
                  <Skull
                    aria-label={t("inspector.dead")}
                    className="size-3 text-muted-foreground"
                  />
                )}
              </>
            );
            return (
              <li key={record.id} data-ocid={`inspector.${ocid}.item.${i + 1}`}>
                {alive ? (
                  <button
                    type="button"
                    onClick={() => onSelect(record.id)}
                    className="flex min-h-7 w-full items-center gap-2 px-1 text-left text-xs text-foreground transition-smooth hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    {content}
                  </button>
                ) : (
                  <div
                    className="flex min-h-7 items-center gap-2 px-1 text-xs text-muted-foreground"
                    title={t("inspector.dead")}
                  >
                    {content}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

import { SimToolbar } from "@/components/lab/canvas/SimToolbar";
import { SimulationCanvas } from "@/components/lab/canvas/SimulationCanvas";
import { DashboardPanel } from "@/components/lab/dashboard/DashboardPanel";
import { EnvironmentPanel } from "@/components/lab/environment/EnvironmentPanel";
import { ExperimentPanel } from "@/components/lab/experiment/ExperimentPanel";
import { InspectorPanel } from "@/components/lab/inspector/InspectorPanel";
import { useI18n } from "@/i18n";
import type { TranslationKey } from "@/i18n";
import type { LabTab } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  Activity,
  FlaskConical,
  Microscope,
  SlidersHorizontal,
} from "lucide-react";
import { type ComponentType, useState } from "react";

const TABS: {
  id: LabTab;
  labelKey: TranslationKey;
  shortKey: TranslationKey;
  icon: ComponentType<{ className?: string }>;
  Panel: ComponentType;
}[] = [
  {
    id: "inspector",
    labelKey: "tab.inspector",
    shortKey: "tab.inspector",
    icon: Microscope,
    Panel: InspectorPanel,
  },
  {
    id: "dashboard",
    labelKey: "tab.dashboard",
    shortKey: "tab.dashboardShort",
    icon: Activity,
    Panel: DashboardPanel,
  },
  {
    id: "environment",
    labelKey: "tab.environment",
    shortKey: "tab.environment",
    icon: SlidersHorizontal,
    Panel: EnvironmentPanel,
  },
  {
    id: "experiment",
    labelKey: "tab.experiment",
    shortKey: "tab.experiment",
    icon: FlaskConical,
    Panel: ExperimentPanel,
  },
];

/** Lab route: canvas dominates; hairline-sectioned tabbed sidebar on the right (stacked below on mobile). */
export function LabPage() {
  const { t } = useI18n();
  const [tab, setTab] = useState<LabTab>("inspector");

  return (
    <div
      className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden"
      data-ocid="lab.page"
    >
      <section
        aria-label={t("canvas.label")}
        className="relative h-[58vh] shrink-0 lg:h-auto lg:min-w-0 lg:flex-1"
      >
        <SimulationCanvas />
        <SimToolbar />
      </section>

      <aside
        aria-label={t("sidebar.label")}
        className="flex shrink-0 flex-col border-t border-sidebar-border bg-sidebar lg:w-[380px] lg:border-l lg:border-t-0 xl:w-[400px]"
        data-ocid="lab.sidebar.panel"
      >
        <div
          role="tablist"
          aria-label={t("sidebar.label")}
          className="sticky top-0 z-10 grid shrink-0 grid-cols-4 border-b border-sidebar-border bg-sidebar"
        >
          {TABS.map(({ id, labelKey, shortKey, icon: Icon }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                id={`lab-tab-${id}`}
                aria-selected={active}
                aria-controls={`lab-tabpanel-${id}`}
                title={t(labelKey)}
                onClick={() => setTab(id)}
                data-ocid={`lab.${id}.tab`}
                className={cn(
                  "relative flex h-11 min-w-0 items-center justify-center gap-1.5 px-1 font-mono text-[10px] uppercase tracking-[0.1em] transition-smooth focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring",
                  active
                    ? "text-foreground after:absolute after:inset-x-2 after:bottom-0 after:h-px after:bg-primary"
                    : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
                )}
              >
                <Icon
                  className={cn("size-3.5 shrink-0", active && "text-primary")}
                />
                <span className="truncate">{t(shortKey)}</span>
              </button>
            );
          })}
        </div>

        {TABS.map(({ id, Panel }) =>
          tab === id ? (
            <div
              key={id}
              role="tabpanel"
              id={`lab-tabpanel-${id}`}
              aria-labelledby={`lab-tab-${id}`}
              className="animate-fade-in lg:min-h-0 lg:flex-1 lg:overflow-y-auto scrollbar-thin"
              data-ocid={`lab.${id}.panel`}
            >
              <Panel />
            </div>
          ) : null,
        )}
      </aside>
    </div>
  );
}

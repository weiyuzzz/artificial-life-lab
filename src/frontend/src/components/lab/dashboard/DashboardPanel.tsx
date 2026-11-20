import { useI18n } from "@/i18n";
import { DashboardCharts } from "./DashboardCharts";
import { LiveReadouts } from "./LiveReadouts";
import { TimelineList } from "./TimelineList";

/** Dashboard & timeline tab: live readouts, sampled charts, evolution log. */
export function DashboardPanel() {
  const { t } = useI18n();
  return (
    <div className="flex flex-col" data-ocid="dashboard.panel">
      <section aria-label={t("dashboard.population")}>
        <h2 className="section-label border-b border-border px-4 py-2.5">
          {t("dashboard.population")}
        </h2>
        <LiveReadouts />
      </section>
      <DashboardCharts />
      <TimelineList />
    </div>
  );
}

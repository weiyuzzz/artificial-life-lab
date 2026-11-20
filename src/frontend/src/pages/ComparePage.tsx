import { CompareCharts } from "@/components/compare/CompareCharts";
import {
  ApprovalNotice,
  CompareNotice,
  NeedTwoNotice,
  SignInNotice,
} from "@/components/compare/CompareNotices";
import { ExperimentPicker } from "@/components/compare/ExperimentPicker";
import { ParamsTable } from "@/components/compare/ParamsTable";
import { parseStatChunks } from "@/components/compare/compareData";
import { PageFrame } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useApprovalStatus } from "@/hooks/useApproval";
import { useAuth } from "@/hooks/useAuth";
import { useAllStatChunks, useMyExperiments } from "@/hooks/useExperiments";
import { useI18n } from "@/i18n";
import { AlertTriangle } from "lucide-react";
import { useMemo, useState } from "react";

const SKELETONS = ["sk-1", "sk-2", "sk-3"];

function LoadingBlock() {
  return (
    <div className="space-y-4" data-ocid="compare.loading_state">
      <div className="flex gap-4">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 flex-1" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {SKELETONS.map((id) => (
          <Skeleton key={id} className="h-72 last:lg:col-span-2" />
        ))}
      </div>
    </div>
  );
}

export function ComparePage() {
  const { t } = useI18n();
  return (
    <PageFrame
      title={t("compare.title")}
      subtitle={t("compare.subtitle")}
      ocid="compare.page"
    >
      <CompareGate />
    </PageFrame>
  );
}

function CompareGate() {
  const { isAuthenticated, isInitializing } = useAuth();
  const status = useApprovalStatus();
  if (isInitializing) return <LoadingBlock />;
  if (!isAuthenticated) return <SignInNotice />;
  if (status === "loading") return <LoadingBlock />;
  if (status === "notApproved" || status === "requested")
    return <ApprovalNotice />;
  return <CompareWorkspace />;
}

function CompareWorkspace() {
  const { t } = useI18n();
  const experiments = useMyExperiments();
  const list = experiments.data ?? [];
  const [pickA, setPickA] = useState<string>();
  const [pickB, setPickB] = useState<string>();

  const idA = pickA ?? list[0]?.id.toString();
  const idB = pickB ?? list.find((e) => e.id.toString() !== idA)?.id.toString();
  const expA = list.find((e) => e.id.toString() === idA);
  const expB = list.find((e) => e.id.toString() === idB);

  const chunksA = useAllStatChunks(expA?.id);
  const chunksB = useAllStatChunks(expB?.id);
  const statsA = useMemo(
    () => parseStatChunks(chunksA.data ?? []),
    [chunksA.data],
  );
  const statsB = useMemo(
    () => parseStatChunks(chunksB.data ?? []),
    [chunksB.data],
  );

  if (experiments.isLoading) return <LoadingBlock />;
  if (experiments.isError)
    return (
      <CompareNotice
        icon={AlertTriangle}
        title={t("state.error")}
        body={experiments.error.message}
        ocid="compare.error_state"
      >
        <Button
          type="button"
          variant="outline"
          onClick={() => void experiments.refetch()}
          data-ocid="compare.retry_button"
        >
          {t("state.retry")}
        </Button>
      </CompareNotice>
    );
  if (list.length < 2) return <NeedTwoNotice />;

  const statsLoading = chunksA.isLoading || chunksB.isLoading;
  const statsError = chunksA.isError || chunksB.isError;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row">
        <ExperimentPicker
          tag="a"
          label={t("compare.experimentA")}
          experiments={list}
          value={idA}
          otherValue={idB}
          onChange={setPickA}
          dashed={false}
        />
        <ExperimentPicker
          tag="b"
          label={t("compare.experimentB")}
          experiments={list}
          value={idB}
          otherValue={idA}
          onChange={setPickB}
          dashed
        />
      </div>

      {statsLoading ? (
        <LoadingBlock />
      ) : statsError ? (
        <CompareNotice
          icon={AlertTriangle}
          title={t("state.error")}
          body={(chunksA.error ?? chunksB.error)?.message ?? ""}
          ocid="compare.stats.error_state"
        >
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              void chunksA.refetch();
              void chunksB.refetch();
            }}
            data-ocid="compare.stats.retry_button"
          >
            {t("state.retry")}
          </Button>
        </CompareNotice>
      ) : (
        <>
          {[
            { tag: "A", exp: expA, stats: statsA },
            { tag: "B", exp: expB, stats: statsB },
          ]
            .filter((side) => side.exp && side.stats.length === 0)
            .map((side) => (
              <p
                key={side.tag}
                className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground"
                data-ocid={`compare.no_stats_${side.tag.toLowerCase()}.empty_state`}
              >
                <span className="readout mr-2 text-foreground">
                  {side.tag} · {side.exp?.name}
                </span>
                {t("compare.noStats")}
              </p>
            ))}
          {(statsA.length > 0 || statsB.length > 0) && (
            <CompareCharts a={statsA} b={statsB} />
          )}
        </>
      )}

      {expA && expB && (
        <ParamsTable a={expA} b={expB} statsA={statsA} statsB={statsB} />
      )}
    </div>
  );
}

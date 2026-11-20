import { ExperimentList } from "@/components/experiments/ExperimentList";
import { SaveGate } from "@/components/experiments/SaveGate";
import { ctlButton } from "@/components/experiments/styles";
import { PageFrame } from "@/components/layout/Layout";
import { useCanSave } from "@/hooks/useApproval";
import { useI18n } from "@/i18n";
import { Link } from "@tanstack/react-router";
import { FlaskConical, GitCompareArrows } from "lucide-react";

export function ExperimentsPage() {
  const { t } = useI18n();
  const canSave = useCanSave();

  return (
    <PageFrame
      title={t("exp.list")}
      ocid="experiments.page"
      actions={
        <>
          <Link
            to="/compare"
            className={ctlButton}
            data-ocid="experiments.compare.link"
          >
            <GitCompareArrows className="h-3.5 w-3.5" aria-hidden />
            {t("nav.compare")}
          </Link>
          <Link
            to="/"
            className={ctlButton}
            data-ocid="experiments.go_to_lab.link"
          >
            <FlaskConical className="h-3.5 w-3.5" aria-hidden />
            {t("exp.goToLab")}
          </Link>
        </>
      }
    >
      {canSave ? (
        <ExperimentList />
      ) : (
        <SaveGate
          scope="experiments"
          signedOutTitle="auth.requiredTitle"
          signedOutBody="auth.requiredBody"
          className="max-w-lg"
        />
      )}
    </PageFrame>
  );
}

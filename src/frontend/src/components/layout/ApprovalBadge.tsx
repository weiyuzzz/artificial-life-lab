import { useI18n } from "@/i18n";
import type { ApprovalDisplayStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Mono status badge for the caller's saving access. Renders nothing while signed out or loading. */
export function ApprovalBadge({
  status,
  className,
}: { status: ApprovalDisplayStatus; className?: string }) {
  const { t } = useI18n();
  if (status === "signedOut" || status === "loading") return null;
  const config = {
    admin: {
      label: t("approval.adminBadge"),
      tone: "bg-primary/15 text-primary",
    },
    approved: {
      label: t("approval.status.approved"),
      tone: "bg-success/15 text-success",
    },
    requested: {
      label: t("approval.status.pending"),
      tone: "bg-warning/15 text-warning",
    },
    notApproved: {
      label: t("approval.status.unknown"),
      tone: "bg-muted text-muted-foreground",
    },
  }[status];
  return (
    <span
      data-ocid="auth.approval_status"
      className={cn(
        "inline-flex items-center rounded-sm px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider",
        config.tone,
        className,
      )}
    >
      {config.label}
    </span>
  );
}

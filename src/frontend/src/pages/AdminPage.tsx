import { ApprovalStatus, type UserApprovalInfo } from "@/backend";
import { shortPrincipal } from "@/components/layout/AuthControl";
import { PageFrame } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { errorMessage } from "@/hooks/apiErrors";
import {
  useIsAdmin,
  useListApprovals,
  useSetApproval,
} from "@/hooks/useApproval";
import { useAuth } from "@/hooks/useAuth";
import { type TranslationKey, useI18n } from "@/i18n";
import { cn } from "@/lib/utils";
import {
  Check,
  Copy,
  Loader2,
  LogIn,
  RotateCcw,
  ShieldAlert,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const FILTERS: { status: ApprovalStatus; labelKey: TranslationKey }[] = [
  { status: ApprovalStatus.pending, labelKey: "approval.status.pending" },
  { status: ApprovalStatus.approved, labelKey: "approval.status.approved" },
  { status: ApprovalStatus.rejected, labelKey: "approval.status.rejected" },
];

const STATUS_STYLE: Record<ApprovalStatus, string> = {
  [ApprovalStatus.pending]: "border-accent/50 bg-accent/10 text-accent",
  [ApprovalStatus.approved]: "border-primary/50 bg-primary/10 text-primary",
  [ApprovalStatus.rejected]:
    "border-destructive/50 bg-destructive/10 text-destructive",
};

const SKELETON_IDS = Array.from({ length: 4 }, (_, i) => `admin-skel-${i}`);

function Notice({
  ocid,
  title,
  body,
  action,
}: {
  ocid: string;
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div
      className="flex flex-col items-start gap-3 rounded-md border border-border bg-card p-6"
      data-ocid={ocid}
    >
      <ShieldAlert className="h-6 w-6 text-muted-foreground" aria-hidden />
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      <p className="max-w-prose text-sm text-muted-foreground">{body}</p>
      {action}
    </div>
  );
}

function ApprovalPanel() {
  const { t } = useI18n();
  const approvals = useListApprovals();
  const setApproval = useSetApproval();
  const [filter, setFilter] = useState<ApprovalStatus>(ApprovalStatus.pending);
  const [busy, setBusy] = useState<string | null>(null);

  const rows = approvals.data ?? [];
  const visible = rows.filter((r) => r.status === filter);

  const update = (info: UserApprovalInfo, status: ApprovalStatus) => {
    const id = info.principal.toText();
    setBusy(id);
    setApproval.mutate(
      { user: info.principal, status },
      {
        onSuccess: () => toast.success(t("admin.updated")),
        onError: (e) => toast.error(errorMessage(e, t)),
        onSettled: () => setBusy(null),
      },
    );
  };

  const copy = (text: string) => {
    void navigator.clipboard
      .writeText(text)
      .then(() => toast.success(t("admin.copied")));
  };

  return (
    <section className="flex flex-col gap-4" data-ocid="admin.section">
      <div
        className="inline-flex w-fit gap-1 rounded-md border border-border bg-card p-1"
        role="tablist"
        aria-label={t("admin.status")}
      >
        {FILTERS.map((f) => {
          const count = rows.filter((r) => r.status === f.status).length;
          const active = filter === f.status;
          return (
            <button
              key={f.status}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setFilter(f.status)}
              data-ocid={`admin.filter.${f.status}.tab`}
              className={cn(
                "flex min-h-9 items-center gap-2 rounded px-3 font-mono text-xs uppercase tracking-wider transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {t(f.labelKey)}
              <span className="tabular-nums opacity-70">{count}</span>
            </button>
          );
        })}
      </div>

      {approvals.isLoading ? (
        <div className="flex flex-col gap-2" data-ocid="admin.loading_state">
          {SKELETON_IDS.map((id) => (
            <Skeleton key={id} className="h-12 w-full" />
          ))}
        </div>
      ) : approvals.isError ? (
        <Notice
          ocid="admin.error_state"
          title={t("state.error")}
          body={errorMessage(approvals.error, t)}
          action={
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void approvals.refetch()}
              data-ocid="admin.retry_button"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              {t("state.retry")}
            </Button>
          }
        />
      ) : visible.length === 0 ? (
        <p
          className="rounded-md border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground"
          data-ocid="admin.empty_state"
        >
          {t(
            filter === ApprovalStatus.approved
              ? "admin.membersEmpty"
              : "admin.requestsEmpty",
          )}
        </p>
      ) : (
        <div className="overflow-hidden rounded-md border border-border bg-card">
          <table className="w-full text-sm" data-ocid="admin.table">
            <thead className="sticky top-0 bg-muted/60 font-mono text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium">
                  {t("admin.principal")}
                </th>
                <th className="px-4 py-2.5 text-left font-medium">
                  {t("admin.status")}
                </th>
                <th className="px-4 py-2.5 text-right font-medium">
                  {t("admin.actions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((info, i) => {
                const id = info.principal.toText();
                const pending = busy === id && setApproval.isPending;
                const n = i + 1;
                return (
                  <tr
                    key={id}
                    className="border-t border-border transition-colors hover:bg-muted/30"
                    data-ocid={`admin.row.${n}`}
                  >
                    <td className="max-w-0 px-4 py-2.5">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="truncate font-mono" title={id}>
                          <span className="md:hidden">
                            {shortPrincipal(id)}
                          </span>
                          <span className="hidden md:inline">{id}</span>
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0"
                          aria-label={t("admin.copy")}
                          onClick={() => copy(id)}
                          data-ocid={`admin.copy_button.${n}`}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={cn(
                          "inline-flex rounded border px-2 py-0.5 font-mono text-[11px] uppercase tracking-wider",
                          STATUS_STYLE[info.status],
                        )}
                      >
                        {t(`approval.status.${info.status}` as TranslationKey)}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex justify-end gap-2">
                        {pending && (
                          <Loader2 className="h-4 w-4 animate-spin self-center text-muted-foreground" />
                        )}
                        {info.status !== ApprovalStatus.approved && (
                          <Button
                            type="button"
                            size="sm"
                            disabled={pending}
                            onClick={() =>
                              update(info, ApprovalStatus.approved)
                            }
                            data-ocid={`admin.approve_button.${n}`}
                          >
                            <Check className="mr-1.5 h-4 w-4" />
                            {t(
                              info.status === ApprovalStatus.rejected
                                ? "admin.allowAgain"
                                : "admin.approve",
                            )}
                          </Button>
                        )}
                        {info.status !== ApprovalStatus.rejected && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={pending}
                            onClick={() =>
                              update(info, ApprovalStatus.rejected)
                            }
                            data-ocid={`admin.reject_button.${n}`}
                          >
                            <X className="mr-1.5 h-4 w-4" />
                            {t("admin.reject")}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export function AdminPage() {
  const { t } = useI18n();
  const { isAuthenticated, isInitializing, isLoggingIn, signIn } = useAuth();
  const isAdmin = useIsAdmin();

  let body: React.ReactNode;
  if (isInitializing || (isAuthenticated && isAdmin.isLoading)) {
    body = (
      <div className="flex flex-col gap-2" data-ocid="admin.loading_state">
        {SKELETON_IDS.map((id) => (
          <Skeleton key={id} className="h-12 w-full" />
        ))}
      </div>
    );
  } else if (!isAuthenticated) {
    body = (
      <Notice
        ocid="admin.sign_in.panel"
        title={t("auth.requiredTitle")}
        body={t("admin.denied")}
        action={
          <Button
            type="button"
            onClick={signIn}
            disabled={isLoggingIn}
            data-ocid="admin.sign_in.button"
          >
            <LogIn className="mr-2 h-4 w-4" />
            {isLoggingIn ? t("auth.signingIn") : t("auth.signIn")}
          </Button>
        }
      />
    );
  } else if (isAdmin.data !== true) {
    body = (
      <Notice
        ocid="admin.denied.error_state"
        title={t("error.notAuthorized")}
        body={t("admin.denied")}
      />
    );
  } else {
    body = <ApprovalPanel />;
  }

  return (
    <PageFrame
      title={t("admin.title")}
      subtitle={t("admin.subtitle")}
      ocid="admin.page"
    >
      {body}
    </PageFrame>
  );
}

import { Button } from "@/components/ui/button";
import { useApprovalStatus, useRequestApproval } from "@/hooks/useApproval";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/i18n";
import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import { FlaskConical, Hourglass, LogIn } from "lucide-react";

export function CompareNotice({
  icon: Icon,
  title,
  body,
  ocid,
  children,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  ocid: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className="lab-grid flex flex-col items-center rounded-lg border border-border px-6 py-14 text-center"
      data-ocid={ocid}
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-border bg-card text-primary">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">{body}</p>
      {children && <div className="mt-6">{children}</div>}
    </div>
  );
}

export function SignInNotice() {
  const { t } = useI18n();
  const { signIn, isLoggingIn, isLoginError } = useAuth();
  return (
    <CompareNotice
      icon={LogIn}
      title={t("auth.requiredTitle")}
      body={isLoginError ? t("auth.error") : t("auth.requiredBody")}
      ocid="compare.signin.panel"
    >
      <Button
        type="button"
        onClick={signIn}
        disabled={isLoggingIn}
        data-ocid="compare.signin.primary_button"
      >
        {isLoggingIn ? t("auth.signingIn") : t("auth.signIn")}
      </Button>
    </CompareNotice>
  );
}

export function ApprovalNotice() {
  const { t } = useI18n();
  const status = useApprovalStatus();
  const request = useRequestApproval();
  const requested = status === "requested";
  return (
    <CompareNotice
      icon={Hourglass}
      title={
        requested ? t("approval.pendingTitle") : t("approval.requestTitle")
      }
      body={requested ? t("approval.pendingBody") : t("approval.requestBody")}
      ocid="compare.approval.panel"
    >
      <Button
        type="button"
        variant="outline"
        onClick={() => request.mutate()}
        disabled={requested || request.isPending}
        data-ocid="compare.approval.primary_button"
      >
        {requested
          ? t("approval.requested")
          : request.isPending
            ? t("approval.requesting")
            : t("approval.request")}
      </Button>
      {request.isError && (
        <p
          className="mt-3 text-xs text-destructive"
          data-ocid="compare.approval.error_state"
        >
          {t("state.error")}
        </p>
      )}
    </CompareNotice>
  );
}

export function NeedTwoNotice() {
  const { t } = useI18n();
  return (
    <CompareNotice
      icon={FlaskConical}
      title={t("state.empty")}
      body={t("compare.needTwo")}
      ocid="compare.empty_state"
    >
      <Button asChild data-ocid="compare.go_lab.link">
        <Link to="/">{t("exp.goToLab")}</Link>
      </Button>
    </CompareNotice>
  );
}

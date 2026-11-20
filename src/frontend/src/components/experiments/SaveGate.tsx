import { errorMessage } from "@/hooks/apiErrors";
import { useApprovalStatus, useRequestApproval } from "@/hooks/useApproval";
import { useAuth } from "@/hooks/useAuth";
import { type TranslationKey, useI18n } from "@/i18n";
import { cn } from "@/lib/utils";
import { Clock, Fingerprint, Loader2, LockKeyhole, Send } from "lucide-react";
import { toast } from "sonner";
import { ctlButton, primaryButton } from "./styles";

/**
 * Sign-in prompt for signed-out users, approval request / pending notice for
 * unapproved users. Renders nothing for approved users or admins.
 */
export function SaveGate({
  scope,
  signedOutTitle = "auth.promptTitle",
  signedOutBody = "auth.promptBody",
  className,
}: {
  scope: string;
  signedOutTitle?: TranslationKey;
  signedOutBody?: TranslationKey;
  className?: string;
}) {
  const { t } = useI18n();
  const status = useApprovalStatus();
  const { signIn, isLoggingIn, isLoginError } = useAuth();
  const request = useRequestApproval();

  if (status === "admin" || status === "approved") return null;

  const frame = (
    tone: string,
    icon: React.ReactNode,
    title: string,
    body: string,
    action?: React.ReactNode,
    ocid = "panel",
  ) => (
    <div
      className={cn("border-l-2 bg-muted/30 px-3 py-3", tone, className)}
      data-ocid={`${scope}.gate.${ocid}`}
    >
      <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-foreground">
        {icon}
        {title}
      </p>
      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
        {body}
      </p>
      {action && <div className="mt-2.5">{action}</div>}
    </div>
  );

  if (status === "loading")
    return frame(
      "border-border",
      <Loader2 className="h-3 w-3 animate-spin" aria-hidden />,
      t("auth.loading"),
      t("approval.saveLocked"),
      undefined,
      "loading_state",
    );

  if (status === "signedOut")
    return frame(
      "border-primary",
      <LockKeyhole className="h-3 w-3 text-primary" aria-hidden />,
      t(signedOutTitle),
      t(signedOutBody),
      <div className="flex flex-col gap-1.5">
        <button
          type="button"
          onClick={signIn}
          disabled={isLoggingIn}
          data-ocid={`${scope}.gate.sign_in_button`}
          className={primaryButton}
        >
          <Fingerprint className="h-3.5 w-3.5" aria-hidden />
          {isLoggingIn ? t("auth.signingIn") : t("auth.signIn")}
        </button>
        {isLoginError && (
          <p
            role="alert"
            className="text-[11px] text-destructive"
            data-ocid={`${scope}.gate.error_state`}
          >
            {t("auth.error")}
          </p>
        )}
      </div>,
    );

  if (status === "requested")
    return frame(
      "border-warning",
      <Clock className="h-3 w-3 text-warning" aria-hidden />,
      t("approval.pendingTitle"),
      t("approval.pendingBody"),
      <button
        type="button"
        disabled
        className={ctlButton}
        data-ocid={`${scope}.gate.request_button`}
      >
        <Send className="h-3.5 w-3.5" aria-hidden />
        {t("approval.requested")}
      </button>,
      "pending_state",
    );

  return frame(
    "border-warning",
    <Clock className="h-3 w-3 text-warning" aria-hidden />,
    t("approval.requestTitle"),
    t("approval.requestBody"),
    <button
      type="button"
      disabled={request.isPending}
      onClick={() =>
        request.mutate(undefined, {
          onError: (error) => toast.error(errorMessage(error, t)),
        })
      }
      className={primaryButton}
      data-ocid={`${scope}.gate.request_button`}
    >
      {request.isPending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
      ) : (
        <Send className="h-3.5 w-3.5" aria-hidden />
      )}
      {request.isPending ? t("approval.requesting") : t("approval.request")}
    </button>,
    "pending_state",
  );
}

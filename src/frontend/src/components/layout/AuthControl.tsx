import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useApprovalStatus } from "@/hooks/useApproval";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";
import { ChevronDown, Fingerprint, Loader2, LogOut } from "lucide-react";
import { ApprovalBadge } from "./ApprovalBadge";

export function shortPrincipal(principal: string): string {
  return principal.length > 14
    ? `${principal.slice(0, 5)}…${principal.slice(-5)}`
    : principal;
}

const controlClass =
  "inline-flex h-8 items-center gap-2 rounded-sm px-3 text-xs font-medium transition-smooth focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60";

/** Header sign-in control: sign-in button when signed out, identity menu when signed in. */
export function AuthControl() {
  const { t } = useI18n();
  const {
    principal,
    isInitializing,
    isLoggingIn,
    isLoginError,
    signIn,
    signOut,
  } = useAuth();
  const status = useApprovalStatus();

  if (!principal) {
    const busy = isInitializing || isLoggingIn;
    return (
      <div className="flex items-center gap-2">
        {isLoginError && (
          <span
            role="alert"
            className="hidden text-[11px] text-destructive lg:inline"
            data-ocid="auth.error_state"
          >
            {t("auth.error")}
          </span>
        )}
        <button
          type="button"
          onClick={signIn}
          disabled={busy}
          data-ocid="auth.sign_in.button"
          className={cn(
            controlClass,
            "bg-primary text-primary-foreground hover:bg-primary/85",
          )}
        >
          {busy ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Fingerprint className="size-3.5" />
          )}
          {isInitializing
            ? t("auth.loading")
            : isLoggingIn
              ? t("auth.signingIn")
              : t("auth.signIn")}
        </button>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          data-ocid="auth.menu.dropdown_menu"
          className={cn(
            controlClass,
            "border border-border bg-background/60 font-mono text-foreground hover:border-primary/60",
          )}
        >
          <span
            className="size-1.5 rounded-full bg-primary animate-pulse-dot"
            aria-hidden
          />
          <span className="hidden sm:inline">{shortPrincipal(principal)}</span>
          <ChevronDown className="size-3 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-64 rounded-sm border-border bg-popover"
      >
        <DropdownMenuLabel className="space-y-2 font-normal">
          <span className="section-label block">
            {t("auth.signedInAs", { principal: "" }).trim()}
          </span>
          <span className="block break-all font-mono text-[11px] text-foreground">
            {principal}
          </span>
          <ApprovalBadge status={status} />
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={signOut}
          data-ocid="auth.sign_out.button"
          className="cursor-pointer gap-2 text-xs"
        >
          <LogOut className="size-3.5" />
          {t("auth.signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

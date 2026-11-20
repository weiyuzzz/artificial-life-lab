import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";
import { dangerButton, ghostButton, primaryButton } from "./styles";

/** Confirmation dialog for destructive or state-replacing actions. */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  destructive,
  onConfirm,
  scope,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  scope: string;
}) {
  const { t } = useI18n();
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        className="rounded-sm border-border bg-popover sm:max-w-md"
        data-ocid={`${scope}.dialog`}
      >
        <AlertDialogHeader>
          <AlertDialogTitle className="font-display text-lg">
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-xs leading-relaxed">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel
            className={cn(ghostButton, "mt-0 border-0")}
            data-ocid={`${scope}.cancel_button`}
          >
            {t("exp.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={cn(
              destructive
                ? cn(
                    dangerButton,
                    "bg-destructive/90 px-3 text-destructive-foreground hover:bg-destructive hover:text-destructive-foreground",
                  )
                : primaryButton,
            )}
            data-ocid={`${scope}.confirm_button`}
          >
            {confirmLabel ?? t("exp.confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

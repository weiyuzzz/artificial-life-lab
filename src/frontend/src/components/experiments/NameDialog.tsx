import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/i18n";
import { Dices, Loader2 } from "lucide-react";
import { useState } from "react";
import { ctlButton, fieldInput, ghostButton, primaryButton } from "./styles";

export interface NameDialogValue {
  name: string;
  seed: number;
}

/** Name (and optionally seed) form used for creating and renaming experiments. */
export function NameDialog({
  open,
  onOpenChange,
  title,
  description,
  submitLabel,
  initialName,
  initialSeed,
  pending,
  error,
  onSubmit,
  scope,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  submitLabel: string;
  initialName: string;
  /** When set, a seed field is shown. */
  initialSeed?: number;
  pending: boolean;
  error?: string | null;
  onSubmit: (value: NameDialogValue) => void;
  scope: string;
}) {
  const { t } = useI18n();
  const [name, setName] = useState(initialName);
  const [seed, setSeed] = useState(String(initialSeed ?? 0));
  const seedNum = Number(seed);
  const seedValid =
    initialSeed === undefined ||
    (seed.trim() !== "" &&
      Number.isInteger(seedNum) &&
      seedNum >= 0 &&
      seedNum <= 4294967295);
  const valid =
    name.trim().length > 0 && name.trim().length <= 200 && seedValid;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="rounded-sm border-border bg-popover sm:max-w-md"
        data-ocid={`${scope}.dialog`}
      >
        <DialogHeader>
          <DialogTitle className="font-display text-lg">{title}</DialogTitle>
          {description && (
            <DialogDescription className="text-xs">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (valid && !pending)
              onSubmit({ name: name.trim(), seed: seedNum });
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor={`${scope}-name`} className="section-label">
              {t("exp.name")}
            </Label>
            <Input
              id={`${scope}-name`}
              value={name}
              maxLength={200}
              autoFocus
              placeholder={t("exp.namePlaceholder")}
              onChange={(e) => setName(e.target.value)}
              className={fieldInput}
              data-ocid={`${scope}.name.input`}
            />
          </div>
          {initialSeed !== undefined && (
            <div className="space-y-1.5">
              <Label htmlFor={`${scope}-seed`} className="section-label">
                {t("exp.seed")}
              </Label>
              <div className="flex gap-2">
                <Input
                  id={`${scope}-seed`}
                  inputMode="numeric"
                  value={seed}
                  onChange={(e) => setSeed(e.target.value.replace(/\D/g, ""))}
                  className={`${fieldInput} readout`}
                  aria-invalid={!seedValid}
                  data-ocid={`${scope}.seed.input`}
                />
                <button
                  type="button"
                  aria-label={t("env.randomSeed")}
                  onClick={() =>
                    setSeed(String(Math.floor(Math.random() * 4294967295)))
                  }
                  className={ctlButton}
                  data-ocid={`${scope}.seed.random_button`}
                >
                  <Dices className="h-3.5 w-3.5" aria-hidden />
                </button>
              </div>
            </div>
          )}
          {error && (
            <p
              role="alert"
              className="text-xs text-destructive"
              data-ocid={`${scope}.error_state`}
            >
              {error}
            </p>
          )}
          <DialogFooter className="gap-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className={ghostButton}
              data-ocid={`${scope}.cancel_button`}
            >
              {t("exp.cancel")}
            </button>
            <button
              type="submit"
              disabled={!valid || pending}
              className={primaryButton}
              data-ocid={`${scope}.submit_button`}
            >
              {pending && (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              )}
              {submitLabel}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

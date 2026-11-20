import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";

/** Segmented 中文 / EN switch; the choice persists across reloads. */
export function LanguageToggle({ className }: { className?: string }) {
  const { language, setLanguage, t } = useI18n();
  const options = [
    { value: "zh", label: t("lang.zh") },
    { value: "en", label: t("lang.en") },
  ] as const;
  return (
    <fieldset
      aria-label={t("lang.toggle")}
      className={cn(
        "flex h-7 items-center rounded-sm border border-border bg-background/60 p-0.5 font-mono text-[11px]",
        className,
      )}
      data-ocid="header.language.toggle"
    >
      {options.map((option, index) => {
        const active = language === option.value;
        return (
          <span key={option.value} className="flex items-center">
            {index > 0 && (
              <span aria-hidden className="px-0.5 text-muted-foreground/50">
                /
              </span>
            )}
            <button
              type="button"
              aria-pressed={active}
              onClick={() => setLanguage(option.value)}
              data-ocid={`header.language.${option.value}.button`}
              className={cn(
                "h-6 min-w-8 rounded-[2px] px-2 tracking-wider transition-smooth focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
            >
              {option.label}
            </button>
          </span>
        );
      })}
    </fieldset>
  );
}

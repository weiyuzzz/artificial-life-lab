import { useI18n } from "@/i18n";

/** 32px status line footer with attribution. */
export function Footer() {
  const { t } = useI18n();
  const year = new Date().getFullYear();
  const href = `https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`;
  return (
    <footer className="flex h-8 shrink-0 items-center justify-between gap-4 border-t border-border bg-background px-3 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground md:px-4">
      <span className="truncate">{t("app.tagline")}</span>
      <span className="shrink-0 normal-case tracking-normal">
        © {year}.{" "}
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          data-ocid="footer.caffeine.link"
          className="transition-smooth hover:text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          {t("footer.builtWith")}
        </a>
      </span>
    </footer>
  );
}

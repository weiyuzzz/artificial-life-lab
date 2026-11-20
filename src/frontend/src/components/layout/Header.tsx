import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useIsAdmin } from "@/hooks/useApproval";
import { useI18n } from "@/i18n";
import type { NavItem } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import { Menu } from "lucide-react";
import { useState } from "react";
import { AuthControl } from "./AuthControl";
import { LanguageToggle } from "./LanguageToggle";

const NAV_ITEMS: NavItem[] = [
  { to: "/", labelKey: "nav.lab", ocid: "nav.lab.link" },
  {
    to: "/experiments",
    labelKey: "nav.experiments",
    ocid: "nav.experiments.link",
  },
  { to: "/compare", labelKey: "nav.compare", ocid: "nav.compare.link" },
  {
    to: "/admin",
    labelKey: "nav.admin",
    ocid: "nav.admin.link",
    adminOnly: true,
  },
];

function NavLinks({
  vertical,
  onNavigate,
}: { vertical?: boolean; onNavigate?: () => void }) {
  const { t } = useI18n();
  const { data: isAdmin } = useIsAdmin();
  const items = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin === true);
  return (
    <>
      {items.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          onClick={onNavigate}
          data-ocid={item.ocid}
          activeOptions={{ exact: item.to === "/" }}
          className={cn(
            "relative inline-flex items-center font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground transition-smooth hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            vertical ? "h-11 border-b border-border px-1" : "h-12 px-3",
          )}
          activeProps={{
            className: cn(
              "!text-foreground",
              !vertical &&
                "after:absolute after:inset-x-3 after:bottom-0 after:h-px after:bg-primary",
              vertical && "!text-primary",
            ),
          }}
        >
          {t(item.labelKey)}
        </Link>
      ))}
    </>
  );
}

/** Compact 48px instrument header: wordmark, nav, language toggle, sign-in. */
export function Header() {
  const { t, language } = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <header className="relative z-30 flex h-12 shrink-0 items-center gap-3 border-b border-border bg-card px-3 shadow-subtle md:px-4">
      <Link
        to="/"
        data-ocid="header.home.link"
        className="flex min-w-0 items-center gap-2.5 rounded-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        <span
          aria-hidden
          className="relative grid size-6 shrink-0 place-items-center rounded-sm border border-primary/50"
        >
          <span className="size-1.5 rounded-full bg-primary" />
          <span className="absolute inset-1 rounded-full border border-primary/30" />
        </span>
        <span className="truncate font-display text-[13px] font-semibold uppercase tracking-[0.12em] text-foreground">
          {language === "zh" ? t("app.name") : "Artificial Life Lab"}
          <span className="ml-2 hidden font-normal text-muted-foreground xl:inline">
            — {language === "zh" ? "Artificial Life Lab" : "人工生命进化实验室"}
          </span>
        </span>
      </Link>

      <nav
        aria-label={t("nav.main")}
        className="ml-4 hidden items-center md:flex"
      >
        <NavLinks />
      </nav>

      <div className="ml-auto flex items-center gap-2">
        <LanguageToggle />
        <span aria-hidden className="hidden h-5 w-px bg-border sm:block" />
        <AuthControl />
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              aria-label={t("nav.menu")}
              data-ocid="nav.menu.open_modal_button"
              className="grid size-9 place-items-center rounded-sm text-muted-foreground transition-smooth hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:hidden"
            >
              <Menu className="size-4" />
            </button>
          </SheetTrigger>
          <SheetContent
            side="right"
            className="w-64 border-border bg-sidebar p-5"
            data-ocid="nav.menu.sheet"
          >
            <SheetTitle className="section-label mb-3">
              {t("nav.main")}
            </SheetTitle>
            <nav aria-label={t("nav.main")} className="flex flex-col">
              <NavLinks vertical onNavigate={() => setMenuOpen(false)} />
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}

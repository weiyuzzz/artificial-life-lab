import { Outlet } from "@tanstack/react-router";
import { Footer } from "./Footer";
import { Header } from "./Header";

/** Full-viewport shell: fixed header, flexible main area (pages own scrolling), status footer. */
export function Layout() {
  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-background text-foreground">
      <Header />
      <main
        className="relative flex min-h-0 flex-1 flex-col overflow-hidden"
        data-ocid="layout.main.section"
      >
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

/** Scrollable page frame for non-lab routes (library, compare, admin). */
export function PageFrame({
  title,
  subtitle,
  actions,
  children,
  ocid,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  ocid: string;
}) {
  return (
    <div
      className="min-h-0 flex-1 overflow-y-auto scrollbar-thin"
      data-ocid={ocid}
    >
      <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-8">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
        <div className="animate-fade-in pt-6">{children}</div>
      </div>
    </div>
  );
}

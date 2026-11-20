import { Layout } from "@/components/layout/Layout";
import { Toaster } from "@/components/ui/sonner";
import { I18nProvider, useI18n } from "@/i18n";
import { AdminPage } from "@/pages/AdminPage";
import { ComparePage } from "@/pages/ComparePage";
import { ExperimentsPage } from "@/pages/ExperimentsPage";
import { LabPage } from "@/pages/LabPage";
import {
  Link,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";

function NotFound() {
  const { t } = useI18n();
  return (
    <div
      className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center"
      data-ocid="notfound.page"
    >
      <p className="section-label">404</p>
      <h1 className="font-display text-2xl font-semibold">
        {t("state.notFound")}
      </h1>
      <p className="text-sm text-muted-foreground">{t("state.notFoundBody")}</p>
      <Link
        to="/"
        data-ocid="notfound.back.link"
        className="mt-2 rounded-sm bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition-smooth hover:bg-primary/85"
      >
        {t("state.backToLab")}
      </Link>
    </div>
  );
}

const rootRoute = createRootRoute({
  component: Layout,
  notFoundComponent: NotFound,
});

const routeTree = rootRoute.addChildren([
  createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
    component: LabPage,
  }),
  createRoute({
    getParentRoute: () => rootRoute,
    path: "/experiments",
    component: ExperimentsPage,
  }),
  createRoute({
    getParentRoute: () => rootRoute,
    path: "/compare",
    component: ComparePage,
  }),
  createRoute({
    getParentRoute: () => rootRoute,
    path: "/admin",
    component: AdminPage,
  }),
]);

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export default function App() {
  return (
    <I18nProvider>
      <RouterProvider router={router} />
      <Toaster
        theme="dark"
        position="bottom-right"
        duration={5000}
        closeButton
        toastOptions={{
          classNames: {
            toast:
              "!rounded-sm !border-border !bg-popover !text-popover-foreground !font-body",
            description: "!text-muted-foreground",
          },
        }}
      />
    </I18nProvider>
  );
}

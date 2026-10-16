import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";

import { OfflineState } from "@/components/states";
import type { NavGroup } from "@/lib/backoffice/access";
import { DASHBOARD, DETAIL, REPORT } from "@/test/impact-fixtures";

// Garde-fou monochrome au rendu (SPEC-TECHNIQUE §2.4) : monochrome.test.ts lit les sources du back-office, ce test
// vérifie le HTML réellement produit, composants du design system compris (Button, Modal, Breadcrumb, Loader, états
// WX). Aucune classe ni variable de la famille primaire ne doit en sortir.
vi.mock("next/navigation", () => ({
  usePathname: () => "/backoffice",
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), back: vi.fn() }),
}));
vi.mock("@/lib/auth/logout", () => ({ logout: vi.fn() }));
vi.mock("@/components/backoffice/BackofficeGate", () => ({ BackofficeGate: () => null }));

const { AdminShell } = await import("./AdminShell");
const { AdminContent, AdminHeader } = await import("./AdminHeader");
const { Overview } = await import("./Overview");
const { ImpactDashboard } = await import("./ImpactDashboard");
const { KpiDetail } = await import("./KpiDetail");
const { ImpactReport } = await import("./ImpactReport");
const { ManualEntryForm } = await import("./ManualEntryForm");
const { SubmitReport } = await import("./SubmitReport");
const { PeriodSwitch } = await import("./PeriodSwitch");
const { Button } = await import("@/components/ds/Button");
const { default: Layout } = await import("@/app/(backoffice)/layout");
const { default: Loading } = await import("@/app/(backoffice)/backoffice/loading");
const { default: BackofficeError } = await import("@/app/(backoffice)/backoffice/error");
const { default: NotFound } = await import("@/app/(backoffice)/backoffice/not-found");

const PRIMARY = /primary/;

const NAV: NavGroup[] = [
  { label: "Pilotage", items: [{ id: "overview", label: "Vue d'ensemble", icon: "home", href: "/backoffice" }] },
];

const OVERVIEW = {
  period: { key: "2026-10", label: "Octobre 2026", start: "2026-10-01", end: "2026-10-31" },
  highlight: { code: "na", label: "Nouveaux apprenants", value: 3, target: 200, status: DETAIL.status },
  stats: { users: 4, activeLearners: 1, salesMonth: null, completionRate: null },
  report: { period: "2026-t4", label: "T4 2026", dueDate: "2027-01-15", status: "draft" as const, entered: 1, total: 4 },
  todo: [{ kind: "consents_pending", label: "Consentements en attente", count: 2, adminPath: "/admin/x/" }],
};

const SCREENS: Array<[string, () => ReactElement]> = [
  [
    "le shell, l'en-tête et ses actions",
    () => (
      <AdminShell user={{ name: "Awa Sossou", groups: "Finance" }} nav={NAV} loginUrl="http://api.test/admin/login/">
        <AdminHeader
          title="Impact Tracker"
          actions={
            <>
              <Button href="/backoffice/impact/rapports" variant="ink" size="sm">
                Rapport trimestriel
              </Button>
              <PeriodSwitch value="mois" />
            </>
          }
        />
        <AdminContent>Contenu</AdminContent>
      </AdminShell>
    ),
  ],
  ["WAD01", () => <Overview overview={OVERVIEW} apiUrl="http://api.test" canOpenImpact />],
  ["WAD02", () => <ImpactDashboard dashboard={DASHBOARD} period="mois" />],
  ["WAD03", () => <KpiDetail kpi={DETAIL} period="mois" />],
  ["WAD04", () => <ImpactReport report={REPORT} apiUrl="http://api.test" />],
  [
    "WAD05",
    () => <ManualEntryForm period="2026-t4" label="T4 2026" locked={false} rows={REPORT.rows.filter((r) => r.source === "manual")} />,
  ],
  ["le chargement du layout", () => <>{(Layout({ children: null } as never) as ReactElement<{ fallback: ReactElement }>).props.fallback}</>],
  ["le chargement d'une page", () => <Loading />],
  ["l'erreur (WX02)", () => <BackofficeError error={new Error("x")} retry={() => {}} />],
  ["la page introuvable", () => <NotFound />],
  ["le hors-ligne (WX01) en encre", () => <OfflineState register="vous" tone="ink" onRetry={() => {}} />],
];

describe("garde-fou monochrome au rendu du back-office", () => {
  it.each(SCREENS)("%s n'affiche aucune couleur primaire", (_, screenOf) => {
    render(screenOf());
    expect(document.body.innerHTML).not.toMatch(PRIMARY);
  });

  it("la modale de soumission non plus, une fois ouverte", async () => {
    render(<SubmitReport period="2026-t4" label="T4 2026" entered={1} total={4} />);
    await userEvent.click(screen.getByRole("button", { name: "Soumettre" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(document.body.innerHTML).not.toMatch(PRIMARY);
  });

  it("détecte bien une couleur primaire rendue", () => {
    render(<OfflineState register="vous" onRetry={() => {}} />);
    expect(document.body.innerHTML).toMatch(PRIMARY);
  });
});

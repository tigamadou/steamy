import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { axe } from "@/test/axe";
import { DASHBOARD, kpi, PERIOD, STATUS } from "@/test/impact-fixtures";

import { ImpactDashboard, KpiList, targetText } from "./ImpactDashboard";

const text = (value: string | null | undefined) => value?.replace(/\s/g, " ");

describe("WAD02 · Impact Tracker", () => {
  it("affiche la légende, les KPI principaux et les groupes du serveur", async () => {
    const { container } = render(<ImpactDashboard dashboard={DASHBOARD} period="trimestre" />);
    const legend = screen.getByRole("list", { name: "Sources des indicateurs" });
    expect(within(legend).getAllByRole("listitem")).toHaveLength(3);
    expect(text(screen.getByText(/^Période :/).textContent)).toBe("Période : Octobre 2026 (1 oct. 2026 → 31 oct. 2026)");

    // KPI principaux : ventes, apprenants, NPS (les nouveaux utilisateurs absents de la réponse sont omis)
    const sales = screen.getByRole("region", { name: "Ventes réalisées" });
    expect(text(within(sales).getByText(/^44.000 FCFA$/).textContent)).toBe("44 000 FCFA");
    expect(text(within(sales).getByText(/^cible/).textContent)).toBe("cible 50 000 FCFAEn dessous");
    expect(within(sales).getByRole("img", { name: /Tendance · Ventes réalisées/ })).toBeInTheDocument();
    const nps = screen.getByRole("region", { name: "Recommandation (NPS)" });
    expect(within(nps).getByText("—")).toBeInTheDocument();
    expect(within(nps).queryByRole("img")).not.toBeInTheDocument();
    expect(text(within(nps).getByText(/^cible/).textContent)).toBe("cible 8 / 10En attente");

    // Groupe ordinaire : lignes liées au détail, en gardant la période
    const salesGroup = screen.getByRole("region", { name: "Ventes & finance" });
    expect(within(salesGroup).getByRole("link", { name: "Financement hors programme ?" })).toHaveAttribute(
      "href",
      "/backoffice/impact/indicateurs/fin_hors?periode=trimestre",
    );
    expect(within(salesGroup).getByText("Oui")).toBeInTheDocument();

    // Inclusion : part de chaque sous-indicateur dans sa base, « — » si la valeur manque
    const inclusion = screen.getByRole("region", { name: "Inclusion · Apprenants (NA)" });
    expect(within(inclusion).getByText("Base : nouveaux apprenants (220) · Octobre 2026")).toBeInTheDocument();
    expect(within(inclusion).getByRole("img", { name: "Femmes parmi nouveaux apprenants : 30 %" })).toBeInTheDocument();
    expect(within(inclusion).getByRole("link", { name: "Situation de handicap" })).toBeInTheDocument();
    expect(within(inclusion).getByRole("link", { name: "Connectés ≥ 1 fois" })).toBeInTheDocument();
    expect(within(inclusion).getByRole("link", { name: "Nouveaux apprenants" })).toHaveAttribute(
      "href",
      "/backoffice/impact/indicateurs/na?periode=trimestre",
    );

    expect(within(screen.getByRole("region", { name: "Emploi" })).getByText("Aucun indicateur.")).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("sans KPI principal ni base connue, n'affiche ni cartes ni base", () => {
    render(
      <ImpactDashboard
        period="mois"
        dashboard={{
          period: PERIOD,
          groups: [
            {
              code: "users",
              label: "Utilisateurs (NU)",
              kpis: [
                kpi({ code: "nu_f", label: "Femmes", baseCode: "nu", value: 3 }),
                kpi({ code: "nu_35", label: "≤ 35 ans", baseCode: "nu_35_base", value: 3 }),
              ],
            },
          ],
        }}
      />,
    );
    expect(screen.queryByRole("region", { name: "Ventes réalisées" })).not.toBeInTheDocument();
    const inclusion = screen.getByRole("region", { name: "Inclusion · Utilisateurs (NU)" });
    expect(within(inclusion).queryByText(/^Base/)).not.toBeInTheDocument();
    expect(within(inclusion).queryByRole("img")).not.toBeInTheDocument();
    expect(within(inclusion).getByRole("link", { name: "Femmes" })).toHaveAttribute("href", "/backoffice/impact/indicateurs/nu_f");
  });

  it("affiche chaque indicateur de base de la carte d'inclusion", () => {
    render(
      <ImpactDashboard
        period="mois"
        dashboard={{
          period: PERIOD,
          groups: [
            {
              code: "users",
              label: "Utilisateurs (NU)",
              kpis: [
                kpi({ code: "nu", label: "Nouveaux utilisateurs", value: 6 }),
                kpi({ code: "nu_alt", label: "Comptes validés", value: 4 }),
                kpi({ code: "nu_f", label: "Femmes", baseCode: "nu", value: 3 }),
                kpi({ code: "nu_v", label: "Validées", baseCode: "nu_alt", value: 2 }),
              ],
            },
          ],
        }}
      />,
    );
    expect(
      screen.getByText("Base : nouveaux utilisateurs (6), comptes validés (4) · Octobre 2026"),
    ).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Validées parmi comptes validés : 50 %" })).toBeInTheDocument();
  });

  it("ne dessine pas de part sur une base nulle", () => {
    render(
      <ImpactDashboard
        period="mois"
        dashboard={{
          period: PERIOD,
          groups: [
            {
              code: "users",
              label: "Utilisateurs (NU)",
              kpis: [kpi({ code: "nu", label: "Nouveaux utilisateurs", value: 0 }), kpi({ code: "nu_f", label: "Femmes", baseCode: "nu", value: 0 })],
            },
          ],
        }}
      />,
    );
    expect(screen.getByText("Base : nouveaux utilisateurs (0) · Octobre 2026")).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: /Femmes parmi/ })).not.toBeInTheDocument();
  });
});

describe("statuts des KPI (D73), affichés tels que le serveur les renvoie", () => {
  it.each(Object.values(STATUS))("rend le statut « $label »", (status) => {
    render(<KpiList period="mois" kpis={[kpi({ code: "k", label: "Indicateur", value: 1, status })]} />);
    expect(screen.getByText(status.label)).toBeInTheDocument();
  });

  it("résume la cible, rien sans cible", () => {
    expect(targetText({ target: null, unit: "text" })).toBeNull();
    expect(text(targetText({ target: 50000, unit: "fcfa" }))).toBe("cible 50 000 FCFA");
  });

  it("n'affiche pas de tendance sur un seul point", () => {
    render(
      <KpiList
        period="mois"
        kpis={[kpi({ code: "k", label: "Indicateur", value: 4, series: [{ period: "2026-10", label: "Oct", value: 4 }] })]}
      />,
    );
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});

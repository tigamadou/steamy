import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { axe } from "@/test/axe";
import { DETAIL, STATUS } from "@/test/impact-fixtures";

import { KpiDetail } from "./KpiDetail";

const text = (value: string | null | undefined) => value?.replace(/\s/g, " ");

describe("WAD03 · Détail d'un indicateur", () => {
  it("affiche statut, valeur, cible, histogramme, historique, composition et définition", async () => {
    const { container } = render(<KpiDetail kpi={DETAIL} period="annee" />);
    const crumbs = screen.getByRole("navigation", { name: "Fil d'Ariane" });
    expect(within(crumbs).getByRole("link", { name: "Impact Tracker" })).toHaveAttribute(
      "href",
      "/backoffice/impact?periode=annee",
    );

    const main = screen.getByRole("region", { name: "Nouveaux apprenants" });
    expect(within(main).getByText("Atteinte")).toBeInTheDocument();
    expect(within(main).getByText("220", { selector: "p" })).toBeInTheDocument();
    expect(within(main).getByText("Cible 200 · atteinte à 110 %")).toBeInTheDocument();
    expect(text(within(main).getByText(/^Octobre 2026 ·/).textContent)).toBe("Octobre 2026 · 1 oct. 2026 → 31 oct. 2026");
    // Périodes sans valeur omises de l'histogramme
    expect(within(main).getByRole("img", { name: "Nouveaux apprenants par période, 2 valeurs" })).toBeInTheDocument();
    expect(within(main).getByText("recalculé chaque nuit depuis la plateforme")).toBeInTheDocument();

    const history = screen.getByRole("table", { name: "Historique de l'indicateur Nouveaux apprenants" });
    const rows = within(history).getAllByRole("row");
    expect(rows).toHaveLength(3);
    expect(within(rows[1]).getByText("1 oct. 2026")).toBeInTheDocument();
    expect(within(rows[2]).getByText("—")).toBeInTheDocument();
    expect(within(rows[2]).getByText("En attente")).toBeInTheDocument();

    const composition = screen.getByRole("region", { name: "Composition (Octobre 2026)" });
    expect(within(composition).getByRole("img", { name: "Femmes parmi nouveaux apprenants : 30 %" })).toBeInTheDocument();
    expect(within(composition).getByText("Situation de handicap")).toBeInTheDocument();

    const definition = screen.getByRole("region", { name: "Définition" });
    expect(within(definition).getByText("Nombre d'apprenants inscrits dans la période")).toBeInTheDocument();
    expect(within(definition).getByText("Mensuelle")).toBeInTheDocument();
    expect(within(definition).getByText("120")).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("sans cible, sans composition ni référence, et avec une valeur nulle", () => {
    render(
      <KpiDetail
        period="mois"
        kpi={{
          ...DETAIL,
          label: "Produit lancé",
          unit: "text",
          source: "manual",
          value: "Robot solaire",
          target: null,
          attainment: null,
          baseline: null,
          periodicity: "quarter",
          status: STATUS.filled,
          series: [],
          history: [],
          composition: [],
        }}
      />,
    );
    expect(screen.getByText("Robot solaire")).toBeInTheDocument();
    expect(screen.getByText("Sans cible")).toBeInTheDocument();
    expect(screen.getByText("Aucune donnée")).toBeInTheDocument();
    expect(screen.getByText("Aucune période.")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: /Composition/ })).not.toBeInTheDocument();
    expect(screen.queryByText("Référence")).not.toBeInTheDocument();
    expect(screen.getByText("Trimestrielle")).toBeInTheDocument();
    expect(screen.getByText("saisi par le personnel avant la soumission du rapport")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Impact Tracker" })).toHaveAttribute("href", "/backoffice/impact");
  });

  it("formate le taux d'atteinte", () => {
    render(<KpiDetail period="mois" kpi={{ ...DETAIL, attainment: 1250 }} />);
    expect(screen.getByText(/atteinte à 1.250 %/)).toBeInTheDocument();
  });

  it("ne dessine pas la composition d'une valeur nulle", () => {
    render(<KpiDetail period="mois" kpi={{ ...DETAIL, value: 0, source: "unavailable", status: STATUS.unavailable }} />);
    expect(screen.queryByRole("img", { name: /parmi/ })).not.toBeInTheDocument();
    expect(screen.getByText("donnée non collectée")).toBeInTheDocument();
  });
});

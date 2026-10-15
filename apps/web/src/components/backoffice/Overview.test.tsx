import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { axe } from "@/test/axe";

import { Overview, reportSteps, type OverviewData } from "./Overview";

const API = "http://api.steamy.test:8000";

const overview = (over: Partial<OverviewData> = {}): OverviewData => ({
  period: { key: "2026-10", label: "Octobre 2026", start: "2026-10-01", end: "2026-10-31" },
  highlight: {
    code: "na",
    label: "Nouveaux apprenants",
    value: 220,
    target: 200,
    status: { status: "achieved", tone: "success", label: "Atteinte" },
  },
  stats: { users: 1332, activeLearners: 460, salesMonth: 44000, completionRate: 38.5 },
  report: { period: "2026-t4", label: "T4 2026", dueDate: "2027-01-15", status: "draft", entered: 3, total: 12 },
  todo: [
    {
      kind: "consents_pending",
      label: "Consentements en attente",
      count: 3,
      adminPath: "/admin/accounts/consentrequest/?status__exact=pending",
    },
  ],
  ...over,
});

const text = (node: HTMLElement) => node.textContent?.replace(/\s/g, " ");

describe("WAD01 · Vue d'ensemble", () => {
  it("affiche le chiffre clé, l'échéance et les chiffres du serveur", async () => {
    const { container } = render(<Overview overview={overview()} apiUrl={API} canOpenImpact />);
    expect(screen.getByText("Administration · Octobre 2026")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Nouveaux apprenants ce mois : 220" })).toBeInTheDocument();
    expect(screen.getByText("Atteinte")).toBeInTheDocument();
    expect(screen.getByText("Cible 200.")).toBeInTheDocument();
    expect(screen.getByText("Prochaine échéance : rapport T4 2026 à soumettre le 15 janv. 2027.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voir l'Impact Tracker" })).toHaveAttribute("href", "/backoffice/impact");

    expect(text(within(screen.getByRole("region", { name: "Utilisateurs" })).getByText(/1.332/))).toBe("1 332");
    expect(within(screen.getByRole("region", { name: "Apprenants actifs" })).getByText("460")).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "Ventes du mois" })).getByText("FCFA")).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "Taux de complétion" })).getByText("38,5 %")).toBeInTheDocument();

    const report = screen.getByRole("region", { name: "Rapport d'impact · prochaine échéance" });
    expect(within(report).getByText("Brouillon")).toBeInTheDocument();
    expect(within(report).getByText("Trimestre T4 2026 · 3/12 indicateurs manuels renseignés")).toBeInTheDocument();
    expect(within(report).getByRole("progressbar", { name: "Complétude du rapport" })).toHaveAttribute(
      "aria-valuenow",
      "25",
    );

    const todo = screen.getByRole("region", { name: "À traiter" });
    expect(within(todo).getByRole("link", { name: /Consentements en attente/ })).toHaveAttribute(
      "href",
      `${API}/admin/accounts/consentrequest/?status__exact=pending`,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it("n'invente aucune valeur absente et sans lien vers l'Impact Tracker hors Finance", () => {
    render(
      <Overview
        overview={overview({
          highlight: {
            code: "na",
            label: "Nouveaux apprenants",
            value: null,
            target: null,
            status: { status: "pending", tone: "amber", label: "En attente" },
          },
          stats: { users: 0, activeLearners: 0, salesMonth: null, completionRate: null },
          report: { period: "2026-t4", label: "T4 2026", dueDate: "2027-01-15", status: "draft", entered: 0, total: 0 },
          todo: [],
        })}
        apiUrl={API}
        canOpenImpact={false}
      />,
    );
    expect(screen.getByRole("heading", { level: 2, name: "Nouveaux apprenants ce mois : calcul en attente" })).toBeInTheDocument();
    expect(screen.queryByText(/^Cible/)).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Voir l'Impact Tracker" })).not.toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "Ventes du mois" })).getByText("—")).toBeInTheDocument();
    expect(screen.getByText("calcul en attente")).toBeInTheDocument();
    expect(screen.getByText("pas encore mesuré")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
    expect(screen.getByText("Rien à traiter pour vos groupes.")).toBeInTheDocument();
  });

  it("annonce un rapport soumis et affiche un type « À traiter » inconnu par son libellé", () => {
    render(
      <Overview
        overview={overview({
          report: { period: "2026-t3", label: "T3 2026", dueDate: "2026-10-15", status: "submitted", entered: 12, total: 12 },
          todo: [{ kind: "payments_failed", label: "Paiements échoués", count: 2, adminPath: "admin/payments/" }],
        })}
        apiUrl={API}
        canOpenImpact
      />,
    );
    expect(screen.getByText("Rapport T3 2026 soumis.")).toBeInTheDocument();
    expect(screen.getByText("Soumis")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Paiements échoués/ })).toHaveAttribute("href", `${API}/admin/payments/`);
  });
});

describe("étapes du rapport", () => {
  const report = { period: "2026-t4", label: "T4 2026", dueDate: "2027-01-15", entered: 3, total: 12 } as const;

  it("met la saisie en cours tant qu'elle est incomplète", () => {
    expect(reportSteps({ ...report, status: "draft" }).map((step) => step.state)).toEqual(["current", "todo"]);
    expect(reportSteps({ ...report, status: "draft" })[0].date).toBe("3/12 renseignés");
  });

  it("passe à la soumission une fois la saisie complète, puis termine", () => {
    expect(reportSteps({ ...report, entered: 12, status: "draft" }).map((step) => step.state)).toEqual([
      "done",
      "current",
    ]);
    expect(reportSteps({ ...report, status: "submitted" }).map((step) => step.state)).toEqual(["done", "done"]);
  });
});

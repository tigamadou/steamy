import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";
import { REPORT } from "@/test/impact-fixtures";

import { ImpactReport } from "./ImpactReport";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const text = (value: string | null | undefined) => value?.replace(/\s/g, " ");

describe("WAD04 · Rapport trimestriel", () => {
  it("affiche l'en-tête, la complétude, les échéances et les lignes du serveur", async () => {
    const { container } = render(<ImpactReport report={REPORT} apiUrl="http://api.test" />);
    expect(screen.getByRole("link", { name: "Impact Tracker" })).toHaveAttribute("href", "/backoffice/impact");
    expect(screen.getByRole("heading", { level: 2, name: "T4 2026" })).toBeInTheDocument();
    expect(screen.getByText("Brouillon")).toBeInTheDocument();
    expect(screen.getByText("Du 1 oct. 2026 au 31 déc. 2026")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "2 / 4 indicateurs manuels renseignés" })).toHaveAttribute(
      "aria-valuenow",
      "50",
    );
    expect(screen.getByRole("list", { name: "Échéances du rapport T4 2026" })).toBeInTheDocument();
    expect(screen.getByText(/5 indicateurs · format Impact Tracker/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Exporter CSV" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Exporter PDF" })).toBeInTheDocument();

    const table = screen.getByRole("table", { name: "Indicateurs du rapport T4 2026" });
    const rows = within(table).getAllByRole("row");
    expect(rows).toHaveLength(6);
    expect(within(rows[1]).getByText("1 déc. 2026")).toBeInTheDocument();
    expect(text(within(rows[1]).getByText(/FCFA/).textContent)).toBe("44 000 FCFA");
    expect(within(rows[3]).getByText("Non")).toBeInTheDocument();
    expect(within(rows[4]).getByText("Non renseignée")).toBeInTheDocument();
    expect(within(rows[4]).getByText("En attente")).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("indique la soumission, avec ou sans auteur", () => {
    const { rerender } = render(
      <ImpactReport report={{ ...REPORT, status: "submitted", submittedAt: "2027-01-10T09:00:00Z", submittedBy: "Rachidi Bello" }} apiUrl="http://api.test" />,
    );
    expect(screen.getByText("Soumis")).toBeInTheDocument();
    expect(screen.getByText(/soumis le 10 janvier 2027 par Rachidi Bello/)).toBeInTheDocument();
    rerender(<ImpactReport report={{ ...REPORT, status: "submitted", submittedAt: "2027-01-10T09:00:00Z", submittedBy: null, rows: [] }} apiUrl="http://api.test" />);
    expect(screen.getByText(/soumis le 10 janvier 2027$/)).toBeInTheDocument();
    expect(screen.getByText("Aucun indicateur.")).toBeInTheDocument();
  });
});

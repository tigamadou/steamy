import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { axe } from "@/test/axe";

import { FAILED_ROW, PAYMENT_ROW } from "./fixtures";
import { PaymentsTable } from "./PaymentsTable";

describe("PaymentsTable", () => {
  it("liste les colonnes de l'ADR § 9 avec légende, numéro masqué et lien vers le détail", async () => {
    const { container } = render(<PaymentsTable rows={[PAYMENT_ROW, FAILED_ROW]} />);
    const table = screen.getByRole("table", { name: "Paiements Mobile Money" });
    for (const label of [
      "Date",
      "Commande",
      "Référence marchande",
      "Identifiant FedaPay",
      "Payeur",
      "Bénéficiaire",
      "Type",
      "Pays · réseau",
      "Numéro",
      "Montant",
      "Statut",
      "Statut FedaPay",
      "Motif d'échec",
    ]) {
      expect(within(table).getByRole("columnheader", { name: label })).toBeInTheDocument();
    }
    const [, success, failed] = within(table).getAllByRole("row");
    const cells = (row: HTMLElement) => within(row).getAllByRole("cell").map((cell) => cell.textContent?.replace(/\s/g, " "));
    expect(cells(success)).toEqual([
      "3 nov. 2026, 10:15",
      "CMD-7001 : voir le paiement STY-7001-1",
      "STY-7001-1",
      "4810001",
      "Marie Adjovi",
      "Léa Adjovi",
      "Kit",
      "BJ · mtn",
      "01 ** ** ** 01",
      "44 000 FCFA",
      "Réussi",
      "approved",
      "—",
    ]);
    expect(within(success).getByRole("link")).toHaveAttribute("href", "/backoffice/paiements/1");
    expect(cells(failed)).toEqual([
      "4 nov. 2026, 08:30",
      "CMD-7002 : voir le paiement STY-7002-2",
      "STY-7002-2",
      "—",
      "Koffi Mensah",
      "—",
      "Parcours",
      "BJ · moov",
      "01 ** ** ** 02",
      "15 000 FCFA",
      "Échoué",
      "—",
      "Paiement refuséSolde insuffisant",
    ]);
    expect(await axe(container)).toHaveNoViolations();
  });

  it("n'affiche aucun numéro complet", () => {
    render(<PaymentsTable rows={[PAYMENT_ROW, FAILED_ROW]} />);
    expect(document.body.textContent).not.toMatch(/(\d ?){9,}/);
  });

  it("affiche l'état vide", () => {
    render(<PaymentsTable rows={[]} />);
    expect(screen.getByText("Aucun paiement ne correspond à ces filtres.")).toBeInTheDocument();
  });

  it("affiche tel quel un type inconnu", () => {
    render(<PaymentsTable rows={[{ ...PAYMENT_ROW, kind: "abonnement" }]} />);
    expect(screen.getByText("abonnement")).toBeInTheDocument();
  });
});

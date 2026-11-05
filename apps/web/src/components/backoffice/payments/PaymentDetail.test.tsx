import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

import { paymentDetail, REFUND_SUMMARY_DONE, REFUND_SUMMARY_PENDING } from "./fixtures";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/lib/api-browser", () => ({ getBrowserApi: async () => ({ POST: vi.fn() }) }));

const { PaymentDetail } = await import("./PaymentDetail");

const norm = (text: string | null) => text?.replace(/\s/g, " ");
const card = (name: string) => screen.getByRole("region", { name });
const facts = (name: string) => Object.fromEntries(within(card(name)).getAllByRole("term").map((term) => [term.textContent, norm(term.nextElementSibling?.textContent ?? "")]));

describe("PaymentDetail", () => {
  beforeEach(() => vi.clearAllMocks());

  it("présente le paiement réussi : cartes, fil d'Ariane, actions de remboursement", async () => {
    const { container } = render(<PaymentDetail payment={paymentDetail()} />);
    expect(screen.getByRole("link", { name: "Paiements" })).toHaveAttribute("href", "/backoffice/paiements");
    expect(screen.getByText("CMD-7001", { selector: '[aria-current="page"]' })).toBeInTheDocument();
    expect(facts("Paiement")).toEqual({
      Montant: "44 000 FCFA",
      "Frais FedaPay": "440 FCFA",
      "Statut FedaPay": "approved",
      "Dernière vérification": "3 nov. 2026, 10:16",
      "Confirmé le": "3 nov. 2026, 10:16",
      "Motif d'échec": "—",
      "Référence marchande": "STY-7001-1",
      "Identifiant FedaPay": "4810001",
      "Pays · réseau": "BJ · mtn",
      Numéro: "01 ** ** ** 01",
      "Reste remboursable": "34 000 FCFA",
    });
    expect(within(card("Paiement")).getByText("Réussi")).toBeInTheDocument();
    expect(facts("Commande")).toEqual({
      Référence: "CMD-7001",
      Type: "Kit",
      Statut: "Payée",
      Total: "44 000 FCFA",
      Payeur: "Marie Adjovi",
      Bénéficiaire: "Léa Adjovi",
    });
    expect(screen.queryByRole("button", { name: "Revérifier chez FedaPay" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Demander un remboursement" })).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("présente un paiement échoué : motif, revérification, pas de remboursement", () => {
    render(
      <PaymentDetail
        payment={paymentDetail({
          status: "failed",
          providerStatus: "",
          failureCode: "DECLINED",
          failureReason: "Solde insuffisant",
          providerFees: null,
          checkedAt: null,
          confirmedAt: null,
          providerTransactionId: null,
          refundable: 0,
          refunds: [],
          order: { ...paymentDetail().order, status: "pending", beneficiary: null },
        })}
      />,
    );
    const paiement = facts("Paiement");
    expect(paiement["Motif d'échec"]).toBe("Paiement refuséSolde insuffisant");
    expect(paiement["Frais FedaPay"]).toBe("—");
    expect(paiement["Statut FedaPay"]).toBe("—");
    expect(paiement["Dernière vérification"]).toBe("Jamais");
    expect(paiement["Identifiant FedaPay"]).toBe("—");
    expect(facts("Commande").Bénéficiaire).toBe("—");
    expect(screen.getByRole("button", { name: "Revérifier chez FedaPay" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Demander un remboursement" })).not.toBeInTheDocument();
  });

  it("affiche un motif d'échec sans code", () => {
    render(<PaymentDetail payment={paymentDetail({ status: "failed", failureCode: "", failureReason: "Refus de l'opérateur" })} />);
    expect(facts("Paiement")["Motif d'échec"]).toContain("Refus de l'opérateur");
  });

  it("liste tentatives, remboursements et journal", () => {
    render(
      <PaymentDetail
        payment={paymentDetail({
          attempts: [
            { id: 9, createdAt: "2026-11-02T08:00:00Z", merchantReference: "STY-7001-0", providerTransactionId: null, status: "failed", providerStatus: "expired", failureCode: "EXPIRED", amount: 44000 },
          ],
          refunds: [REFUND_SUMMARY_PENDING, REFUND_SUMMARY_DONE, { ...REFUND_SUMMARY_DONE, id: 3, processedBy: null, processedAt: null }],
        })}
      />,
    );
    const attempts = screen.getByRole("table", { name: "Autres tentatives" });
    expect(within(attempts).getByRole("link", { name: "STY-7001-0" })).toHaveAttribute("href", "/backoffice/paiements/9");
    expect(within(attempts).getByText("Paiement expiré")).toBeInTheDocument();
    const refunds = within(screen.getByRole("table", { name: "Remboursements du paiement" })).getAllByRole("row");
    const cells = (row: HTMLElement) => within(row).getAllByRole("cell").map((cell) => norm(cell.textContent));
    expect(cells(refunds[1])).toEqual(["4 nov. 2026, 09:00", "10 000 FCFA", "Kit reçu défectueux", "À traiter", "—", "—"]);
    expect(cells(refunds[2])).toEqual(["4 nov. 2026, 09:00", "5 000 FCFA", "Doublon", "Fait", "FDP-REM-0042", "Fatou Kouassi, le 5 nov. 2026, 14:32"]);
    expect(cells(refunds[3])[5]).toBe("—");
    const journal = within(screen.getByRole("table", { name: "Journal du paiement" })).getAllByRole("row");
    expect(cells(journal[1])).toEqual(["3 nov. 2026, 10:16", "Paiement confirmé", "—"]);
    expect(cells(journal[2])).toEqual(["4 nov. 2026, 09:00", "Remboursement demandé", "Fatou Kouassi"]);
  });

  it("affiche les états vides des sections", () => {
    render(<PaymentDetail payment={paymentDetail({ refunds: [], auditLog: [], attempts: [] })} />);
    expect(screen.getByText("Aucune autre tentative.")).toBeInTheDocument();
    expect(screen.getByText("Aucun remboursement.")).toBeInTheDocument();
    expect(screen.getByText("Aucune entrée dans le journal.")).toBeInTheDocument();
  });

  it("n'affiche aucun numéro complet", () => {
    render(<PaymentDetail payment={paymentDetail()} />);
    expect(document.body.textContent).not.toMatch(/(\d ?){9,}/);
  });
});

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

import { backofficeRefund } from "./fixtures";

const refresh = vi.fn();
const post = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("@/lib/api-browser", () => ({ getBrowserApi: async () => ({ POST: post }) }));

const { RefundsTable, RefundTabs } = await import("./RefundsTable");

const norm = (text: string | null) => text?.replace(/\s/g, " ");
const DONE = backofficeRefund({
  id: 2,
  processed: true,
  processedAt: "2026-11-05T13:32:00Z",
  reference: "FDP-REM-0042",
  amount: 5000,
  paymentId: 4,
  orderReference: "CMD-7004",
});
Object.assign(DONE, { processedBy: "Fatou Kouassi" });

describe("RefundTabs", () => {
  it("marque l'onglet courant et lie chaque onglet à son adresse", async () => {
    const { container } = render(<RefundTabs tab="traites" />);
    expect(screen.getByRole("link", { name: "Traités" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Traités" })).toHaveAttribute("href", "/backoffice/remboursements?onglet=traites");
    expect(screen.getByRole("link", { name: "À traiter" })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("link", { name: "À traiter" })).toHaveAttribute("href", "/backoffice/remboursements");
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe("RefundsTable", () => {
  beforeEach(() => {
    refresh.mockReset();
    post.mockReset();
  });

  it("à traiter : colonnes, lien vers le paiement et action sur chaque ligne", async () => {
    const { container } = render(<RefundsTable tab="a-traiter" rows={[backofficeRefund()]} />);
    const table = screen.getByRole("table", { name: "Remboursements à traiter" });
    expect(within(table).getAllByRole("columnheader").map((header) => header.textContent)).toEqual([
      "Demandé le",
      "Commande",
      "Montant",
      "Motif",
      "Payeur",
      "Action",
    ]);
    const row = within(table).getAllByRole("row")[1];
    expect(within(row).getAllByRole("cell").slice(0, 5).map((cell) => norm(cell.textContent))).toEqual([
      "4 nov. 2026, 09:00",
      "CMD-7001",
      "10 000 FCFA",
      "Kit reçu défectueux",
      "Marie Adjovi",
    ]);
    expect(within(row).getByRole("link", { name: "CMD-7001" })).toHaveAttribute("href", "/backoffice/paiements/1");
    expect(within(row).getByRole("button", { name: /Marquer comme remboursé/ })).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("traités : référence, auteur et date, sans action", () => {
    render(<RefundsTable tab="traites" rows={[DONE, { ...DONE, id: 3, reference: "", processedAt: null }]} />);
    const table = screen.getByRole("table", { name: "Remboursements traités" });
    expect(within(table).getAllByRole("columnheader").map((header) => header.textContent)).toEqual([
      "Demandé le",
      "Commande",
      "Montant",
      "Motif",
      "Payeur",
      "Référence",
      "Traité par",
      "Traité le",
    ]);
    const [, done, partial] = within(table).getAllByRole("row");
    expect(within(done).getAllByRole("cell").slice(5).map((cell) => norm(cell.textContent))).toEqual([
      "FDP-REM-0042",
      "Fatou Kouassi",
      "5 nov. 2026, 14:32",
    ]);
    expect(within(partial).getAllByRole("cell").slice(5).map((cell) => cell.textContent)).toEqual(["—", "Fatou Kouassi", "—"]);
    expect(screen.queryByRole("button", { name: /Marquer comme remboursé/ })).not.toBeInTheDocument();
  });

  it.each([
    ["a-traiter", "Aucun remboursement à traiter."],
    ["traites", "Aucun remboursement traité."],
  ] as const)("état vide de l'onglet %s", (tab, text) => {
    render(<RefundsTable tab={tab} rows={[]} />);
    expect(screen.getByText(text)).toBeInTheDocument();
  });

  it("annonce le résultat hors de la ligne, qui disparaît ensuite de la liste", async () => {
    post.mockResolvedValue({ data: {}, response: new Response(null, { status: 200 }) });
    const { rerender } = render(<RefundsTable tab="a-traiter" rows={[backofficeRefund()]} />);
    await userEvent.click(screen.getByRole("button", { name: /Marquer comme remboursé/ }));
    await userEvent.type(screen.getByLabelText(/Référence du remboursement/), "FDP-1");
    await userEvent.click(screen.getByRole("button", { name: "Confirmer" }));
    rerender(<RefundsTable tab="a-traiter" rows={[]} />);
    expect(screen.getByRole("status")).toHaveTextContent("Remboursement de la commande CMD-7001 marqué comme fait.");
    expect(screen.getByText("Aucun remboursement à traiter.")).toBeInTheDocument();
  });

  it("annonce un remboursement déjà fait en alerte", async () => {
    post.mockResolvedValue({ error: { code: "VALIDATION_ERROR", message: "" }, response: new Response(null, { status: 409 }) });
    render(<RefundsTable tab="a-traiter" rows={[backofficeRefund()]} />);
    await userEvent.click(screen.getByRole("button", { name: /Marquer comme remboursé/ }));
    await userEvent.type(screen.getByLabelText(/Référence du remboursement/), "FDP-1");
    await userEvent.click(screen.getByRole("button", { name: "Confirmer" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Ce remboursement est déjà marqué comme remboursé.");
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });
});

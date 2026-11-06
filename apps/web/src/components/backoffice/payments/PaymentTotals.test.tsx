import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { axe } from "@/test/axe";

import { TOTALS } from "./fixtures";
import { PaymentTotals } from "./PaymentTotals";

const norm = (text: string | null) => text?.replace(/\s/g, " ");

describe("PaymentTotals", () => {
  it("affiche les quatre totaux de l'API, sans rien calculer", async () => {
    const { container } = render(<PaymentTotals totals={TOTALS} />);
    expect(norm(within(screen.getByRole("region", { name: "Volume encaissé" })).getByText(/FCFA/).textContent)).toBe("74 000 FCFA");
    expect(within(screen.getByRole("region", { name: "Paiements" })).getByText("5")).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "Réussis / échoués" })).getByText("2 / 2")).toBeInTheDocument();
    expect(norm(within(screen.getByRole("region", { name: "Taux d'échec" })).getByText(/%/).textContent)).toBe("50 %");
    expect(await axe(container)).toHaveNoViolations();
  });

  it("affiche « — » quand le taux d'échec est absent, jamais 0", () => {
    render(<PaymentTotals totals={{ volume: 0, count: 0, succeeded: 0, failed: 0, failureRate: null }} />);
    const card = screen.getByRole("region", { name: "Taux d'échec" });
    expect(within(card).getByText("—")).toBeInTheDocument();
    expect(within(card).getByText("aucun paiement réglé")).toBeInTheDocument();
  });
});

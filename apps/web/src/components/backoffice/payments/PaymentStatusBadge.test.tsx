import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PaymentStatusBadge } from "./PaymentStatusBadge";

describe("PaymentStatusBadge", () => {
  it.each([
    ["initiated", "Initié"],
    ["pending", "En attente"],
    ["succeeded", "Réussi"],
    ["failed", "Échoué"],
  ])("%s → %s", (status, label) => {
    render(<PaymentStatusBadge status={status} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it("affiche tel quel un statut inconnu", () => {
    render(<PaymentStatusBadge status="reversed" />);
    expect(screen.getByText("reversed")).toBeInTheDocument();
  });
});

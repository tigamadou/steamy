import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { axe } from "@/test/axe";

import { WKKitCard, type KitCardData } from "./WKKitCard";

const KIT: KitCardData = {
  name: "Steamy Bot v1",
  description: "Châssis, moteurs et capteurs pour ton premier robot.",
  difficulty: "Débutant",
  priceLabel: "35 000 F CFA",
  availability: "in_stock",
  color: "var(--cat-robotique)",
  emoji: "🤖",
};

describe("WKKitCard (vitrine)", () => {
  it("affiche le prix et la disponibilité, sans lien ni bouton", () => {
    render(<WKKitCard kit={KIT} />);
    expect(screen.getByRole("heading", { level: 3, name: "Steamy Bot v1" })).toBeInTheDocument();
    expect(screen.getByText("35 000 F CFA")).toBeInTheDocument();
    expect(screen.getByText("Disponible")).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it.each([
    ["low_stock", "Stock limité"],
    ["out_of_stock", "Épuisé"],
  ] as const)("signale la disponibilité %s", (availability, label) => {
    render(<WKKitCard kit={{ ...KIT, availability }} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it("ne présente aucune violation d'accessibilité", async () => {
    const { container } = render(<WKKitCard kit={KIT} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});

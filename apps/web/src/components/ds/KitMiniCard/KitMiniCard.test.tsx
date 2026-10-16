import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { axe } from "@/test/axe";

import { KitMiniCard } from "./KitMiniCard";

describe("KitMiniCard", () => {
  it("nom, prix de la boutique et disponibilité, sans lien sans cible", () => {
    render(<KitMiniCard name="Steamy Bot v1" priceLabel="35 000 F CFA" available />);
    expect(screen.getByText("Steamy Bot v1")).toBeInTheDocument();
    expect(screen.getByText("35 000 F CFA · En stock")).toBeInTheDocument();
    expect(screen.getByText("📦")).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("rupture et lien vers la fiche du kit", async () => {
    const { container } = render(
      <KitMiniCard name="Kit solaire" priceLabel="19 000 F CFA" available={false} emoji="🔆" href="/boutique/solaire" />,
    );
    expect(screen.getByText("19 000 F CFA · En rupture de stock")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voir le kit Kit solaire" })).toHaveAttribute("href", "/boutique/solaire");
    expect(await axe(container)).toHaveNoViolations();
  });
});

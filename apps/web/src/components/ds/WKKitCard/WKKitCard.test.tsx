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

describe("WKKitCard", () => {
  it("vitrine : prix et disponibilité, sans lien ni bouton", () => {
    render(<WKKitCard kit={KIT} />);
    expect(screen.getByRole("heading", { level: 3, name: "Steamy Bot v1" })).toBeInTheDocument();
    expect(screen.getByText("35 000 F CFA")).toBeInTheDocument();
    expect(screen.getByText("Disponible")).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("boutique : nom en lien vers la fiche, action au-dessus du lien, visuel atténué si épuisé", () => {
    const { container } = render(
      <WKKitCard
        kit={{ ...KIT, availability: "out_of_stock" }}
        href="/boutique/steamy-bot-v1"
        action={<button type="button">Ajouter</button>}
      />,
    );
    expect(screen.getByRole("link", { name: "Steamy Bot v1" })).toHaveAttribute("href", "/boutique/steamy-bot-v1");
    expect(screen.getByRole("button", { name: "Ajouter" }).parentElement).toHaveClass("z-10");
    expect(screen.getByText("Épuisé")).toBeInTheDocument();
    expect(container.querySelector("article > div")).toHaveClass("opacity-60");
  });

  it.each([
    ["low_stock", "Stock limité"],
    ["out_of_stock", "Épuisé"],
  ] as const)("signale la disponibilité %s", (availability, label) => {
    render(<WKKitCard kit={{ ...KIT, availability }} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it("prend la couleur robotique par défaut", () => {
    const { container } = render(<WKKitCard kit={{ ...KIT, color: undefined, emoji: undefined, description: undefined }} />);
    const media = container.querySelector<HTMLElement>("article > div");
    expect(media?.style.getPropertyValue("--card-color")).toBe("var(--cat-robotique)");
  });

  it("ne présente aucune violation d'accessibilité", async () => {
    const { container } = render(
      <WKKitCard kit={KIT} href="/boutique/steamy-bot-v1" action={<button type="button">Ajouter</button>} />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});

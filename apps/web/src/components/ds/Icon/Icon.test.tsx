import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { axe } from "@/test/axe";

import { ICON_NAMES, Icon } from "./Icon";

describe("Icon", () => {
  it("est décorative par défaut", () => {
    const { container } = render(<Icon name="home" />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("porte un libellé quand elle est seule", () => {
    render(<Icon name="search" title="Rechercher" />);
    expect(screen.getByRole("img", { name: "Rechercher" })).toBeInTheDocument();
  });

  it("dessine chaque icône du jeu à la taille demandée", () => {
    for (const name of ICON_NAMES) {
      const { container, unmount } = render(<Icon name={name} size={18} />);
      const svg = container.querySelector("svg");
      expect(svg).toHaveAttribute("width", "18");
      expect(svg?.childElementCount).toBeGreaterThan(0);
      unmount();
    }
  });

  it("ne présente aucune violation d'accessibilité", async () => {
    const { container } = render(
      <p>
        <Icon name="star" /> Favori <Icon name="x" title="Fermer" />
      </p>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});

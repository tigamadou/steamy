import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { QuickActionTile } from "./QuickActionTile";

describe("QuickActionTile", () => {
  it("est un lien portant son titre et son compteur", () => {
    render(<QuickActionTile icon="heart" title="Mes souhaits" count="3 parcours" href="/apprenant/souhaits" tone="amber" />);
    const link = screen.getByRole("link", { name: /Mes souhaits.*3 parcours/ });
    expect(link).toHaveAttribute("href", "/apprenant/souhaits");
  });

  it("se passe de compteur", () => {
    render(<QuickActionTile icon="compass" title="Catalogue" href="/apprenant/catalogue" />);
    expect(screen.getByRole("link", { name: "Catalogue" })).toBeInTheDocument();
  });
});

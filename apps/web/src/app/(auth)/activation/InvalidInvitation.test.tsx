import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { axe } from "@/test/axe";

import { InvalidInvitation } from "./InvalidInvitation";
import ActivationWithoutToken, { metadata } from "./page";

describe("InvalidInvitation", () => {
  it("annonce un lien expiré et propose le contact WL24 et la connexion", async () => {
    const { container } = render(<InvalidInvitation />);
    expect(screen.getByRole("heading", { name: "Lien expiré ou déjà utilisé" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Contacter l'équipe Steamy" })).toHaveAttribute(
      "href",
      "/aide?sujet=question#contact",
    );
    expect(screen.getByRole("link", { name: "Se connecter" })).toHaveAttribute("href", "/connexion");
    expect(await axe(container)).toHaveNoViolations();
  });

  it("est affiché sur /activation sans jeton", () => {
    expect(metadata.title).toBe("Activation du compte");
    render(<ActivationWithoutToken />);
    expect(screen.getByRole("heading", { name: "Lien expiré ou déjà utilisé" })).toBeInTheDocument();
  });
});

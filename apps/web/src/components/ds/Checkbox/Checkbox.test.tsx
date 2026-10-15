import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { axe } from "@/test/axe";

import { Checkbox } from "./Checkbox";

describe("Checkbox", () => {
  it("n'est pas cochée par défaut et se coche au clavier", async () => {
    const user = userEvent.setup();
    render(<Checkbox label="J'accepte les conditions d'utilisation" />);
    const checkbox = screen.getByRole("checkbox", { name: "J'accepte les conditions d'utilisation" });
    expect(checkbox).not.toBeChecked();
    await user.tab();
    expect(checkbox).toHaveFocus();
    await user.keyboard(" ");
    expect(checkbox).toBeChecked();
  });

  it("se coche au clic sur le libellé", async () => {
    const user = userEvent.setup();
    render(<Checkbox label="Recevoir la newsletter" />);
    await user.click(screen.getByText("Recevoir la newsletter"));
    expect(screen.getByRole("checkbox")).toBeChecked();
  });

  it("affiche son erreur", () => {
    render(<Checkbox label="J'accepte" error="Tu dois accepter pour continuer" />);
    const checkbox = screen.getByRole("checkbox", { name: "J'accepte" });
    expect(checkbox).toHaveAttribute("aria-invalid", "true");
    expect(checkbox).toHaveAccessibleDescription("Tu dois accepter pour continuer");
  });

  it("ne présente aucune violation d'accessibilité", async () => {
    const { container } = render(
      <div>
        <Checkbox label="Option" />
        <Checkbox label="Obligatoire" error="Requis" />
      </div>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});

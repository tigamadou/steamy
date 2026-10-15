import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

import { Field } from "../Field";
import { PasswordInput } from "./PasswordInput";

describe("PasswordInput", () => {
  it("masque la saisie et transmet les attributs natifs", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<PasswordInput aria-label="Mot de passe" name="password" autoComplete="current-password" onChange={onChange} />);
    const input = screen.getByLabelText("Mot de passe");
    expect(input).toHaveAttribute("type", "password");
    expect(input).toHaveAttribute("name", "password");
    expect(input).toHaveAttribute("autocomplete", "current-password");
    await user.type(input, "abc");
    expect(input).toHaveValue("abc");
    expect(onChange).toHaveBeenCalledTimes(3);
  });

  it("affiche puis masque le mot de passe", async () => {
    const user = userEvent.setup();
    render(<PasswordInput aria-label="Mot de passe" autoComplete="new-password" />);
    const input = screen.getByLabelText("Mot de passe");
    const toggle = screen.getByRole("button", { name: "Afficher le mot de passe" });
    expect(toggle).toHaveAttribute("type", "button");
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    await user.click(toggle);
    expect(input).toHaveAttribute("type", "text");
    const hide = screen.getByRole("button", { name: "Masquer le mot de passe" });
    expect(hide).toHaveAttribute("aria-pressed", "true");
    await user.click(hide);
    expect(input).toHaveAttribute("type", "password");
  });

  it("se lie au Field (libellé, erreur, obligatoire)", () => {
    render(
      <Field label="Mot de passe" error="Mot de passe incorrect" required>
        <PasswordInput autoComplete="current-password" />
      </Field>,
    );
    const input = screen.getByLabelText(/Mot de passe/, { selector: "input" });
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toBeRequired();
    expect(input).toHaveAccessibleDescription("Mot de passe incorrect");
  });

  it("se marque invalide et désactivé hors Field", () => {
    render(<PasswordInput aria-label="Code" autoComplete="new-password" invalid disabled />);
    expect(screen.getByLabelText("Code")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Code")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Afficher le mot de passe" })).toBeDisabled();
  });

  it("ne présente aucune violation d'accessibilité", async () => {
    const { container } = render(
      <Field label="Mot de passe">
        <PasswordInput autoComplete="new-password" />
      </Field>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});

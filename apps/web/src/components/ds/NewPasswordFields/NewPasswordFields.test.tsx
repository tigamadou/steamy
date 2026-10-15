import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

import { NewPasswordFields } from "./NewPasswordFields";

const password = () => screen.getByLabelText(/^Mot de passe/, { selector: "input" });
const confirmation = () => screen.getByLabelText(/^Confirme ton mot de passe/, { selector: "input" });

describe("NewPasswordFields", () => {
  it("rend deux champs new-password nommés, liés aux règles", () => {
    render(<NewPasswordFields />);
    expect(password()).toHaveAttribute("name", "password");
    expect(password()).toHaveAttribute("autocomplete", "new-password");
    expect(password()).toBeRequired();
    expect(confirmation()).toHaveAttribute("name", "passwordConfirm");
    expect(confirmation()).toHaveAttribute("autocomplete", "new-password");
    expect(password()).toHaveAccessibleDescription(/Au moins 8 caractères/);
  });

  it("émet la validité au fil de la saisie", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<NewPasswordFields onChange={onChange} />);
    await user.type(password(), "motdepasse1");
    expect(onChange).toHaveBeenLastCalledWith({ password: "motdepasse1", confirm: "", valid: false });
    expect(screen.getAllByRole("listitem")[1]).toHaveTextContent("(respectée)");
    await user.type(confirmation(), "motdepasse1");
    expect(onChange).toHaveBeenLastCalledWith({ password: "motdepasse1", confirm: "motdepasse1", valid: true });
  });

  it("signale la non-concordance seulement quand la confirmation est saisie", async () => {
    const user = userEvent.setup();
    render(<NewPasswordFields />);
    await user.type(password(), "motdepasse1");
    expect(screen.queryByText("Les mots de passe ne correspondent pas")).not.toBeInTheDocument();
    await user.type(confirmation(), "motdepasse2");
    expect(confirmation()).toHaveAccessibleDescription("Les mots de passe ne correspondent pas");
    expect(confirmation()).toHaveAttribute("aria-invalid", "true");
  });

  it("signale règles et non-concordance à la soumission", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<NewPasswordFields />);
    await user.type(password(), "abc");
    rerender(<NewPasswordFields showErrors />);
    expect(password()).toHaveAttribute("aria-invalid", "true");
    expect(screen.getAllByRole("listitem")[0]).toHaveClass("text-error-600");
    expect(screen.getByText("Les mots de passe ne correspondent pas")).toBeInTheDocument();
  });

  it("affiche l'erreur serveur sur le premier champ, au vouvoiement", () => {
    render(
      <NewPasswordFields
        label="Mot de passe"
        confirmLabel="Confirmez votre mot de passe"
        name="pw"
        confirmName="pw2"
        error="Ce mot de passe est trop faible."
        disabled
      />,
    );
    expect(password()).toHaveAttribute("aria-invalid", "true");
    expect(password()).toHaveAccessibleDescription(/Ce mot de passe est trop faible\./);
    expect(password()).toBeDisabled();
    expect(screen.getByLabelText(/^Confirmez votre mot de passe/, { selector: "input" })).toHaveAttribute("name", "pw2");
    expect(screen.getAllByRole("listitem")[0]).toHaveClass("text-error-600");
  });

  it("ne présente aucune violation d'accessibilité", async () => {
    const { container } = render(<NewPasswordFields showErrors error="Trop faible" />);
    expect(await axe(container)).toHaveNoViolations();
  });
});

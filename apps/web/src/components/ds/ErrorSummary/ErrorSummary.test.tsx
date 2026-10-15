import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { axe } from "@/test/axe";

import { ErrorSummary } from "./ErrorSummary";

const ERRORS = [
  { field: "telephone", message: "Le numéro est invalide." },
  { message: "Le service est momentanément indisponible." },
];

describe("ErrorSummary", () => {
  it("ne rend rien sans erreur", () => {
    const { container } = render(<ErrorSummary errors={[]} focusKey={1} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("annonce le récapitulatif titré, avec le titre par défaut", () => {
    render(<ErrorSummary errors={ERRORS} />);
    const box = screen.getByRole("alert", { name: "Corrige les erreurs suivantes :" });
    expect(box).toHaveAttribute("tabindex", "-1");
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByText("Le service est momentanément indisponible.").tagName).toBe("LI");
  });

  it("accepte un titre au vouvoiement", () => {
    render(<ErrorSummary title="Corrigez les erreurs suivantes :" errors={ERRORS} className="mb-4" />);
    const box = screen.getByRole("alert", { name: "Corrigez les erreurs suivantes :" });
    expect(box).toHaveClass("mb-4");
  });

  it("met le focus sur le champ au clic sur son lien", async () => {
    const user = userEvent.setup();
    render(
      <>
        <ErrorSummary errors={ERRORS} />
        <input id="telephone" aria-label="Téléphone" />
      </>,
    );
    const link = screen.getByRole("link", { name: "Le numéro est invalide." });
    expect(link).toHaveAttribute("href", "#telephone");
    await user.click(link);
    expect(screen.getByLabelText("Téléphone")).toHaveFocus();
  });

  it("laisse le lien natif agir si le champ est introuvable", async () => {
    const user = userEvent.setup();
    render(<ErrorSummary errors={[{ field: "absent", message: "Champ absent." }]} />);
    const link = screen.getByRole("link", { name: "Champ absent." });
    await user.click(link);
    expect(link).toBeInTheDocument();
  });

  it("ne prend pas le focus sans focusKey", () => {
    render(<ErrorSummary errors={ERRORS} />);
    expect(screen.getByRole("alert")).not.toHaveFocus();
  });

  it("prend le focus quand focusKey change et qu'il y a des erreurs", () => {
    const { rerender } = render(
      <>
        <ErrorSummary errors={ERRORS} focusKey={1} />
        <button type="button">Envoyer</button>
      </>,
    );
    expect(screen.getByRole("alert")).toHaveFocus();
    screen.getByRole("button").focus();
    rerender(
      <>
        <ErrorSummary errors={ERRORS} focusKey={1} />
        <button type="button">Envoyer</button>
      </>,
    );
    expect(screen.getByRole("button")).toHaveFocus();
    rerender(
      <>
        <ErrorSummary errors={ERRORS} focusKey={2} />
        <button type="button">Envoyer</button>
      </>,
    );
    expect(screen.getByRole("alert")).toHaveFocus();
  });

  it("ne présente aucune violation d'accessibilité", async () => {
    const { container } = render(
      <>
        <ErrorSummary errors={ERRORS} />
        <input id="telephone" aria-label="Téléphone" />
      </>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});

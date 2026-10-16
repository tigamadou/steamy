import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

import { Button, type ButtonVariant } from "./Button";

const VARIANTS: ButtonVariant[] = [
  "primary",
  "secondary",
  "amber",
  "outline",
  "outline-inverse",
  "ghost",
  "danger",
  "ink",
  "ink-outline",
];

describe("Button", () => {
  it("est un bouton de type button par défaut", () => {
    render(<Button>Continuer</Button>);
    expect(screen.getByRole("button", { name: "Continuer" })).toHaveAttribute("type", "button");
  });

  it.each(VARIANTS)("rend la variante %s", (variant) => {
    render(<Button variant={variant}>Action</Button>);
    expect(screen.getByRole("button", { name: "Action" })).toBeInTheDocument();
  });

  it("se déclenche au clavier (Entrée et Espace)", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Valider</Button>);
    await user.tab();
    expect(screen.getByRole("button", { name: "Valider" })).toHaveFocus();
    await user.keyboard("{Enter}");
    await user.keyboard(" ");
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it("désactive et annonce l'envoi en cours avec loading", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Envoyer
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Envoyer" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    await user.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("garde un focus en encre sur les variantes monochromes du back-office", () => {
    render(
      <>
        <Button variant="ink">Soumettre</Button>
        <Button variant="ink-outline">Annuler</Button>
        <Button>Continuer</Button>
      </>,
    );
    expect(screen.getByRole("button", { name: "Soumettre" }).className).toMatch(/outline-ink-900/);
    expect(screen.getByRole("button", { name: "Annuler" }).className).not.toMatch(/primary/);
    expect(screen.getByRole("button", { name: "Continuer" }).className).toMatch(/outline-primary-500/);
  });

  it("se rend en lien avec href", () => {
    render(
      <Button href="/inscription" variant="outline-inverse" icon="user" iconRight="arrow-right">
        Créer un compte
      </Button>,
    );
    const link = screen.getByRole("link", { name: "Créer un compte" });
    expect(link).toHaveAttribute("href", "/inscription");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("affiche ses icônes de manière décorative", () => {
    const { container } = render(
      <Button icon="cart" block size="lg">
        Ajouter
      </Button>,
    );
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByRole("button")).toHaveClass("w-full");
  });

  it("peut être désactivé", () => {
    render(<Button disabled>Indisponible</Button>);
    const button = screen.getByRole("button", { name: "Indisponible" });
    expect(button).toBeDisabled();
    expect(button).not.toHaveAttribute("aria-busy");
  });

  it("ne présente aucune violation d'accessibilité", async () => {
    const { container } = render(
      <div>
        {VARIANTS.map((variant) => (
          <Button key={variant} variant={variant}>
            {variant}
          </Button>
        ))}
        <Button loading>Envoi</Button>
        <Button href="/parcours">Voir les parcours</Button>
      </div>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});

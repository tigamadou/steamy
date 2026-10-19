import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

import { DropdownMenu, type DropdownItem } from "./DropdownMenu";

const ITEMS: DropdownItem[] = [
  { id: "toutes", label: "Toutes", href: "/c" },
  { id: "debutant", label: "Débutant", href: "/c?difficulte=debutant", selected: true },
  { id: "avance", label: "Avancé", href: "/c?difficulte=avance" },
];

function setup(items = ITEMS) {
  const user = userEvent.setup();
  render(
    <div>
      <DropdownMenu label="Difficulté" items={items} />
      <button type="button">Ailleurs</button>
    </div>,
  );
  const button = screen.getByRole("button", { name: /Difficulté/ });
  return { user, button };
}

describe("DropdownMenu", () => {
  it("annonce le réglage et sa valeur, fermé par défaut", () => {
    const { button } = setup();
    expect(button).toHaveTextContent("Difficulté ·Débutant");
    expect(button).toHaveAttribute("aria-haspopup", "menu");
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("s'ouvre sur l'option choisie, options-liens cochées (WC02b)", async () => {
    const { user, button } = setup();
    await user.click(button);
    expect(button).toHaveAttribute("aria-expanded", "true");
    const menu = screen.getByRole("menu", { name: "Difficulté" });
    expect(button).toHaveAttribute("aria-controls", menu.id);
    const selected = screen.getByRole("menuitemradio", { name: "Débutant" });
    expect(selected).toHaveFocus();
    expect(selected).toHaveAttribute("aria-checked", "true");
    expect(selected).toHaveAttribute("href", "/c?difficulte=debutant");
    expect(screen.getByRole("menuitemradio", { name: "Avancé" })).toHaveAttribute("aria-checked", "false");
  });

  it("se parcourt aux flèches, Début et Fin, en boucle", async () => {
    const { user, button } = setup();
    await user.click(button);
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("menuitemradio", { name: "Avancé" })).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("menuitemradio", { name: "Toutes" })).toHaveFocus();
    await user.keyboard("{ArrowUp}");
    expect(screen.getByRole("menuitemradio", { name: "Avancé" })).toHaveFocus();
    await user.keyboard("{Home}");
    expect(screen.getByRole("menuitemradio", { name: "Toutes" })).toHaveFocus();
    await user.keyboard("{ArrowUp}");
    expect(screen.getByRole("menuitemradio", { name: "Avancé" })).toHaveFocus();
    await user.keyboard("{End}");
    expect(screen.getByRole("menuitemradio", { name: "Avancé" })).toHaveFocus();
    // Une autre touche ne fait rien
    await user.keyboard("a");
    expect(screen.getByRole("menu")).toBeInTheDocument();
  });

  it("Échap ferme et rend le focus au bouton ; Tab ferme", async () => {
    const { user, button } = setup();
    await user.click(button);
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(button).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("menu")).toBeInTheDocument();
    await user.tab();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    button.focus();
    await user.keyboard("{ArrowUp}");
    expect(screen.getByRole("menu")).toBeInTheDocument();
    // Une autre touche sur le bouton ne l'ouvre ni ne le ferme
    fireEvent.keyDown(button, { key: "x" });
    expect(screen.getByRole("menu")).toBeInTheDocument();
  });

  it("se ferme au choix d'une option, au clic extérieur, et à un second clic", async () => {
    const { user, button } = setup();
    await user.click(button);
    fireEvent.click(screen.getByRole("menuitemradio", { name: "Avancé" }));
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    await user.click(button);
    await user.click(screen.getByRole("menu"));
    expect(screen.getByRole("menu")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Ailleurs" }));
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    await user.click(button);
    await user.click(button);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("Espace choisit l'option ; le focus revient au bouton", async () => {
    const { user, button } = setup();
    await user.click(button);
    const option = screen.getByRole("menuitemradio", { name: "Débutant" });
    const clicked = vi.fn((event: MouseEvent) => event.preventDefault());
    option.addEventListener("click", clicked);
    await user.keyboard(" ");
    expect(clicked).toHaveBeenCalledOnce();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(button).toHaveFocus();
  });

  it("sans option choisie, affiche et focalise la première", async () => {
    const { user, button } = setup(ITEMS.map((item) => ({ ...item, selected: false })));
    expect(button).toHaveTextContent("Toutes");
    await user.click(button);
    expect(screen.getByRole("menuitemradio", { name: "Toutes" })).toHaveFocus();
  });

  it("variante sans bordure alignée à droite, sans violation d'accessibilité ouverte", async () => {
    const user = userEvent.setup();
    const { container } = render(<DropdownMenu label="Trier par" items={ITEMS} variant="plain" align="end" />);
    await user.click(screen.getByRole("button"));
    expect(screen.getByRole("menu")).toHaveClass("right-0");
    expect(await axe(container)).toHaveNoViolations();
  });
});

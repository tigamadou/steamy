import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { axe } from "@/test/axe";

vi.mock("next/navigation", () => ({ usePathname: () => "/boutique" }));

const { CurrentPublicNav, PublicNav } = await import("./PublicNav");

const mainNav = () => within(screen.getByRole("navigation", { name: "Navigation principale" }));

describe("PublicNav", () => {
  it("affiche les entrées v1 seulement (aucun onglet reporté)", () => {
    render(<PublicNav pathname="/" />);
    expect(
      mainNav()
        .getAllByRole("link")
        .map((l) => l.textContent),
    ).toEqual(["Accueil", "Parcours", "Boutique", "Écoles", "À propos"]);
    expect(mainNav().getByRole("button", { name: "Ressources" })).toBeInTheDocument();
    expect(screen.queryByText(/Défis|Ateliers|Communauté|Tutoriels/)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Steamy, accueil" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Se connecter" })).toHaveAttribute("href", "/connexion");
    expect(screen.getByRole("link", { name: "Créer un compte" })).toHaveAttribute("href", "/inscription");
  });

  it("surligne l'onglet de la rubrique courante", () => {
    render(<PublicNav pathname="/parcours/robotique" />);
    const courses = mainNav().getByRole("link", { name: "Parcours" });
    expect(courses).toHaveAttribute("aria-current", "true");
    expect(courses).toHaveClass("text-primary-600");
    expect(mainNav().getByRole("link", { name: "Accueil" })).not.toHaveAttribute("aria-current");
  });

  it("active « Ressources » sur le blog, les événements et les guides", () => {
    render(<PublicNav pathname="/evenements/atelier" />);
    expect(mainNav().getByRole("button", { name: "Ressources" })).toHaveClass("text-primary-600");
  });

  it("n'active aucun onglet sans chemin (prérendu d'une route dynamique)", () => {
    render(<PublicNav pathname={null} />);
    expect(
      mainNav()
        .getAllByRole("link")
        .filter((l) => l.hasAttribute("aria-current")),
    ).toEqual([]);
  });

  it("lit le chemin courant dans l'URL", () => {
    render(<CurrentPublicNav />);
    expect(mainNav().getByRole("link", { name: "Boutique" })).toHaveAttribute("aria-current", "page");
    expect(mainNav().getByRole("link", { name: "À propos" })).not.toHaveAttribute("aria-current");
  });

  it("ne présente aucune violation d'accessibilité", async () => {
    const { container } = render(<PublicNav pathname="/a-propos" />);
    expect(mainNav().getByRole("link", { name: "À propos" })).toHaveAttribute("aria-current", "page");
    expect(await axe(container)).toHaveNoViolations();
  });
});

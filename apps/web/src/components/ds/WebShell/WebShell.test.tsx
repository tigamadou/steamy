import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { axe } from "@/test/axe";

import { AuthLayout, WebShell } from "./WebShell";

describe("WebShell", () => {
  it("rend le titre en h1, le kicker, le sous-titre, le contenu et les actions", () => {
    render(
      <WebShell
        kicker="Inscription · étape 1/4"
        title="Crée ton compte"
        sub="On a juste besoin de quelques infos."
        cta={<button type="button">Continuer</button>}
        brand={<p>Bienvenue !</p>}
      >
        <p>Champs</p>
      </WebShell>,
    );
    expect(screen.getByRole("heading", { level: 1, name: "Crée ton compte" })).toBeInTheDocument();
    expect(screen.getByText("Inscription · étape 1/4")).toBeInTheDocument();
    expect(screen.getByText("On a juste besoin de quelques infos.")).toBeInTheDocument();
    expect(screen.getByText("Champs")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continuer" })).toBeInTheDocument();
    expect(screen.getByText("Bienvenue !")).toBeInTheDocument();
  });

  it("place le contenu dans le landmark main#contenu et le logo dans le bandeau", () => {
    render(<WebShell title="Connexion" />);
    expect(screen.getByRole("main")).toHaveAttribute("id", "contenu");
    const home = screen.getByRole("link", { name: "Steamy, accueil" });
    expect(home).toHaveAttribute("href", "/");
    expect(screen.getByRole("banner")).toContainElement(home);
    expect(screen.getByText(/La plateforme robotique & STEM/)).toBeInTheDocument();
  });

  it("n'affiche ni barre de progression, ni kicker, ni sous-titre, ni slots s'ils sont absents", () => {
    const { container } = render(<WebShell title="Connexion" />);
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(container.querySelectorAll("main p")).toHaveLength(1); // seule l'aide
    const column = screen.getByRole("heading", { level: 1 }).parentElement!.parentElement!;
    expect(column.children).toHaveLength(1);
    expect(container.querySelector("header .flex-1")).toBeNull();
  });

  it("affiche la progression quand step et total sont fournis", () => {
    render(<WebShell title="Profil" step={2} total={4} progressLabel="Profil 2/4" />);
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", "2");
    expect(bar).toHaveAttribute("aria-valuetext", "Profil 2/4");
  });

  it("ignore step sans total", () => {
    render(<WebShell title="Profil" step={2} />);
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  it("pointe « Nous contacter » vers l'aide, surchargeable", () => {
    const { rerender } = render(<WebShell title="Connexion" />);
    expect(screen.getByRole("link", { name: "Nous contacter" })).toHaveAttribute(
      "href",
      "/aide?sujet=question#contact",
    );
    rerender(<WebShell title="Connexion" helpHref="/aide" />);
    expect(screen.getByRole("link", { name: "Nous contacter" })).toHaveAttribute("href", "/aide");
  });

  it("applique le dégradé à partir des noms de jetons", () => {
    const { rerender } = render(<WebShell title="Parent" />);
    expect(screen.getByRole("banner").style.backgroundImage).toContain("var(--primary-500)");
    rerender(<WebShell title="Parent" accent="cat-ia" accent2="primary-700" />);
    expect(screen.getByRole("banner").style.backgroundImage).toContain("var(--cat-ia)");
  });

  it("garde le décor hors de l'arbre d'accessibilité", () => {
    render(<WebShell title="Connexion" />);
    expect(screen.getByRole("banner").querySelector("[aria-hidden]")).not.toBeNull();
  });

  it("expose l'alias AuthLayout", () => {
    expect(AuthLayout).toBe(WebShell);
  });

  it("ne présente aucune violation d'accessibilité", async () => {
    const { container } = render(
      <WebShell kicker="Étape" title="Titre" sub="Sous-titre" step={1} total={4} cta={<a href="/x">Lien</a>}>
        <p>Contenu</p>
      </WebShell>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});

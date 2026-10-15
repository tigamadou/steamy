import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { axe } from "@/test/axe";

import { Celebration } from "./Celebration";

describe("Celebration", () => {
  it("rend le titre en h1, le texte et les actions dans main#contenu", () => {
    render(
      <Celebration title="Mot de passe modifié !" actions={<a href="/connexion">Se connecter</a>}>
        Vous pouvez maintenant vous connecter.
      </Celebration>,
    );
    expect(screen.getByRole("main")).toHaveAttribute("id", "contenu");
    expect(screen.getByRole("heading", { level: 1, name: "Mot de passe modifié !" })).toBeInTheDocument();
    expect(screen.getByText("Vous pouvez maintenant vous connecter.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Se connecter" })).toHaveAttribute("href", "/connexion");
  });

  it("affiche la mascotte qui applaudit par défaut", () => {
    const { container } = render(<Celebration title="Super, c'est validé !" />);
    expect(container.querySelector('svg[data-pose="cheer"]')).not.toBeNull();
  });

  it("remplace la mascotte par le contenu fourni", () => {
    const { container } = render(<Celebration title="Bienvenue, Léa !" mascot={<span data-testid="avatar" />} />);
    expect(screen.getByTestId("avatar")).toBeInTheDocument();
    expect(container.querySelector("svg[data-pose]")).toBeNull();
  });

  it("garde les confettis décoratifs et animés seulement si le mouvement est accepté", () => {
    render(<Celebration title="Bravo" />);
    const confettis = screen.getByTestId("confettis");
    expect(confettis).toHaveAttribute("aria-hidden", "true");
    expect(confettis.children).toHaveLength(6);
    for (const piece of confettis.children) {
      const animated = [...piece.classList].filter((c) => c.includes("transition") || c.includes("starting:"));
      expect(animated.length).toBeGreaterThan(0);
      expect(animated.every((c) => c.startsWith("motion-safe:"))).toBe(true);
    }
  });

  it("omet le texte et les actions absents", () => {
    render(<Celebration title="Bravo" />);
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading.parentElement!.children).toHaveLength(1);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("se rend en div sans id quand la page a déjà son main", () => {
    const { container } = render(<Celebration as="div" title="Bravo" className="extra" />);
    expect(screen.queryByRole("main")).not.toBeInTheDocument();
    expect(container.firstElementChild).not.toHaveAttribute("id");
    expect(container.firstElementChild).toHaveClass("extra");
  });

  it("ne présente aucune violation d'accessibilité", async () => {
    const { container } = render(
      <Celebration title="Bravo" actions={<a href="/suite">Continuer</a>}>
        <p>Texte</p>
      </Celebration>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
